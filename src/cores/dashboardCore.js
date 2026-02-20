import verifyAuth from '../auth/verifyAuth.js';
import { create_job_card, create_order_row, create_product_row } from "../renders/dashboard.js";
import { uploadImage, generateSignedUrl } from "../utils/connectImage.js";
import { dataBaseRequest } from '../utils/connectDataBase.js';

export default async function dashboardCore(request, env) {
    // 1. 🛡️ Validação de Autenticação
    const auth = await verifyAuth(request, env);
    if (!auth.ok) {
        return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const method = request.method;
    const basePath = "/api/private/dashboard";
    const subPath = url.pathname.replace(basePath, "");

    // --- ROTAS DE ORDERS (PEDIDOS) ---

    // POST: Criar Ordem e Jobs simultaneamente
    if (subPath.startsWith("/orders/create") && method === "POST") {
        try {
            const formData = await request.formData();
            const body = JSON.parse(formData.get('payload'));

            // 1. Criar a Ordem Principal
            const orderData = await dataBaseRequest("dashboard_orders", "POST", {
                client_uid: body.client_uid,
                client_name: body.client_name,
                client_address: body.client_address,
                client_phone: body.client_phone,
                order_origin: body.order_origin || '',
                order_status: body.order_status || 0,
                order_priority: body.order_priority || 1,
                order_delivery_date: body.order_delivery_date || null, // Cuidado com o typo 'orrder' no seu banco
            }, env);

            if (orderData instanceof Response) return orderData;
            const order = orderData[0];

            // 2. Processar os Jobs
            const jobsToInsert = [];

            if (body.jobs && body.jobs.length > 0) {
                let i = 0;
                for (const job of body.jobs) {
                    // Tenta pegar o arquivo do FormData usando o índice
                    const file = formData.get(`file_job_${i}`);
                    let finalImageUrl = null;

                    if (file && file.size > 0) {
                        // Chama sua função pronta!
                        finalImageUrl = await uploadImage(file, "sale", env);
                    }

                    jobsToInsert.push({
                        order_uid: order.uid,
                        order_num: order.id_num,
                        product_uid: job.product_uid,
                        product_title: job.product_title,
                        product_color: job.product_color,
                        job_text_title: job.text_title,
                        job_text_font: job.text_font,
                        job_image_name: job.figure_name || null,
                        job_image_url: job.figure_url || null,
                        job_image_url_reference: finalImageUrl, // URL do R2
                        job_observ: job.observation || null,
                        job_status: 0
                    });
                    i++;
                }

                // Inserção em lote no banco
                const insertedJobs = await dataBaseRequest("dashboard_jobs", "POST", jobsToInsert, env);

                if (insertedJobs instanceof Response) {
                    // Rollback básico se os jobs falharem
                    await dataBaseRequest(`dashboard_orders?uid=eq.${order.uid}`, "DELETE", null, env);
                    return insertedJobs;
                }

                // Atualizar a Ordem com os UIDs dos Jobs criados
                const jobUids = insertedJobs.map(j => j.uid);
                await dataBaseRequest(`dashboard_orders?uid=eq.${order.uid}`, "PATCH", {
                    order_list_jobs: jobUids
                }, env);
            }

            return new Response(JSON.stringify({ success: true, order_id: order.id_num }), { status: 201 });

        } catch (error) {
            console.error("Erro na criação:", error.message);
            return new Response(JSON.stringify({ error: "Erro interno ao processar pedido" }), { status: 500 });
        }
    }

    // PATCH: Atualizar informações do Cliente/Endereço
    if (subPath.startsWith("/orders/update-info") && method === "PATCH") {
        try {
            const { uid, ...updateData } = await request.json();
            if (!uid) throw new Error("UID é obrigatório");

            const result = await dataBaseRequest(`dashboard_orders?uid=eq.${uid}`, "PATCH", {
                ...updateData,
                order_date_last_modified: new Date().toISOString()
            }, env);

            return result instanceof Response ? result : new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Cancelar Order (Status 99)
    if (subPath.startsWith("/orders/cancel") && method === "PATCH") {
        try {
            const { order_uid } = await request.json();

            const updateResult = await dataBaseRequest(`dashboard_orders?uid=eq.${order_uid}`, "PATCH", {
                order_status: 99
            }, env);

            return updateResult instanceof Response ? updateResult : new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar Orders por intervalo de data
    if (subPath.startsWith("/orders/search") && method === "GET") {
        try {
            const startDate = url.searchParams.get("start");
            const endDate = url.searchParams.get("end");

            if (!startDate || !endDate) return new Response(JSON.stringify({ error: "Datas obrigatórias" }), { status: 400 });

            const endpoint = `dashboard_orders?order_created_at=gte.${startDate}T00:00:00&order_created_at=lte.${endDate}T23:59:59&order=order_created_at.desc`;
            const orders = await dataBaseRequest(endpoint, "GET", null, env);
            if (orders instanceof Response) return orders;

            const htmlRows = orders.map(order => {
                const jobsCount = Array.isArray(order.order_list_jobs) ? order.order_list_jobs.length : 0;
                const summary = jobsCount > 0 ? `${jobsCount} itens` : "Sem itens";
                return create_order_row(order, summary);
            });

            return new Response(JSON.stringify(htmlRows), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
    // --- ROTAS DE JOBS (TRABALHOS) ---

    // GET: Buscar Jobs para o Dashboard (Renderiza Cards)
    if (subPath.startsWith("/jobs/search") && method === "GET") {
        const dateFilter = url.searchParams.get("date");
        try {
            // Chamada ao utilitário
            const jobsFromDb = await dataBaseRequest(`dashboard_jobs?job_start_date=eq.${dateFilter}&select=*`, "GET", null, env);

            // Se o utilitário retornou a Response de erro, repassamos ela
            if (jobsFromDb instanceof Response) return jobsFromDb;

            const htmlCardsArray = jobsFromDb.map(row => {
                return create_job_card(
                    { order_uid: row.order_uid, order_id: row.order_num, priority: row.job_status },
                    {
                        uid: row.uid,
                        job_id: row.uid.split('-')[0],
                        product_title: row.product_title,
                        product_color: row.product_color,
                        text: row.job_text_title,
                        font: row.job_text_font,
                        url_ref: row.job_image_url_reference,
                        name_image: row.job_image_name,
                        json_image: row.job_image_json,
                        observ: row.job_observ
                    }
                );
            });

            return new Response(JSON.stringify(htmlCardsArray), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Jobs Search Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: "Erro ao carregar lista de trabalhos" }), { status: 500 });
        }
    }

    // PATCH: Atualizar um Job individualmente (Fonte, Título, Observação, etc.)
    if (subPath.startsWith("/jobs/update-detail") && method === "PATCH") {
        try {
            const body = await request.json();
            const { uid, ...updateFields } = body;

            if (!uid) throw new Error("UID do job é obrigatório.");

            const result = await dataBaseRequest(`dashboard_jobs?uid=eq.${uid}`, "PATCH", updateFields, env);

            // Se falhou no banco, o utilitário já cuidou da resposta 500
            if (result instanceof Response) return result;

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            console.error(`[Jobs Update Detail Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: "Erro ao atualizar detalhes do trabalho" }), { status: 500 });
        }
    }

    // PATCH: Alterar Status do Job (Iniciar/Finalizar)
    if (subPath.startsWith("/jobs/status") && method === "PATCH") {
        try {
            const body = await request.json(); // Espera { uid: "...", status: 1 }

            if (!body.uid) throw new Error("UID é obrigatório.");

            const result = await dataBaseRequest(`dashboard_jobs?uid=eq.${body.uid}`, "PATCH", {
                job_status: body.status
            }, env);

            if (result instanceof Response) return result;

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            console.error(`[Jobs Status Update Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: "Erro ao alterar status do trabalho" }), { status: 500 });
        }
    }

    // --- ROTAS DE PRODUCTS (PRODUTOS) ---

    // POST: Criar Produto
    if (subPath.startsWith("/products/create") && method === "POST") {
        let imageSalePath = null;
        let imageCreatorPath = null;

        try {
            const formData = await request.formData();
            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const status = stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0);

            // Upload de Imagens
            imageSalePath = await uploadImage(formData.get('image_sale'), "sale", env);
            imageCreatorPath = await uploadImage(formData.get('image_creator'), "creator", env);

            if (!imageSalePath || !imageCreatorPath) throw new Error("Erro ao processar imagens.");

            const productData = await dataBaseRequest("dashboard_products", "POST", {
                product_title: formData.get('name'),
                product_type: formData.get('type'),
                product_color: formData.get('color'),
                product_desc: formData.get('description'),
                product_stock_now: stockNow,
                product_stock_min: stockMin,
                product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                product_image_sale: imageSalePath,
                product_image_creator: imageCreatorPath,
                product_status: status
            }, env);

            if (productData instanceof Response) throw new Error("Erro ao salvar no banco");

            return new Response(JSON.stringify({ success: true, data: productData[0] }), { status: 201 });

        } catch (error) {
            const cleanup = async () => {
                if (imageSalePath) await env.sale.delete(imageSalePath).catch(() => { });
                if (imageCreatorPath) await env.creator.delete(imageCreatorPath).catch(() => { });
            };
            if (ctx?.waitUntil) ctx.waitUntil(cleanup()); else cleanup();
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Produto
    if (subPath.startsWith("/products/update") && method === "PATCH") {
        let newImageSale, newImageCreator, oldImageSale, oldImageCreator;

        try {
            const formData = await request.formData();
            const productId = formData.get('id');
            if (!productId) throw new Error("ID do produto é obrigatório.");

            const current = await dataBaseRequest(`dashboard_products?id=eq.${productId}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Produto não encontrado.");

            oldImageSale = current[0].product_image_sale;
            oldImageCreator = current[0].product_image_creator;

            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const status = stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0);

            newImageSale = await uploadImage(formData.get('image_sale'), "sale", env);
            newImageCreator = await uploadImage(formData.get('image_creator'), "creator", env);

            const updateResult = await dataBaseRequest(`dashboard_products?id=eq.${productId}`, "PATCH", {
                product_title: formData.get('name'),
                product_type: formData.get('type'),
                product_color: formData.get('color'),
                product_desc: formData.get('description'),
                product_stock_now: stockNow,
                product_stock_min: stockMin,
                product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                product_image_sale: newImageSale || oldImageSale,
                product_image_creator: newImageCreator || oldImageCreator,
                product_status: status
            }, env);

            if (updateResult instanceof Response) throw new Error("Erro na atualização");

            const successCleanup = async () => {
                if (newImageSale && newImageSale !== oldImageSale) await env.sale.delete(oldImageSale).catch(() => { });
                if (newImageCreator && newImageCreator !== oldImageCreator) await env.creator.delete(oldImageCreator).catch(() => { });
            };
            if (ctx?.waitUntil) ctx.waitUntil(successCleanup());

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            const rollback = async () => {
                if (newImageSale) await env.sale.delete(newImageSale).catch(() => { });
                if (newImageCreator) await env.creator.delete(newImageCreator).catch(() => { });
            };
            if (ctx?.waitUntil) ctx.waitUntil(rollback());
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Excluir Produto
    if (subPath.startsWith("/products/delete") && method === "DELETE") {
        try {
            const productId = url.searchParams.get("id");
            if (!productId) throw new Error("ID obrigatório.");

            // 1. Buscar dados para saber quais imagens apagar
            const current = await dataBaseRequest(`dashboard_products?id=eq.${productId}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Produto não encontrado.");
            const product = current[0];

            // 2. Tentar deletar do banco PRIMEIRO
            const deleteResult = await dataBaseRequest(`dashboard_products?id=eq.${productId}`, "DELETE", null, env);

            // Se o banco falhar, retornamos o erro e as imagens continuam salvas (seguro)
            if (deleteResult instanceof Response) return deleteResult;

            // 3. Se deu certo no banco, limpamos as imagens em background
            const cleanupImages = async () => {
                const deletePromises = [];
                if (product.product_image_sale) deletePromises.push(env.sale.delete(product.product_image_sale));
                if (product.product_image_creator) deletePromises.push(env.creator.delete(product.product_image_creator));
                await Promise.allSettled(deletePromises);
            };

            if (ctx && ctx.waitUntil) ctx.waitUntil(cleanupImages());
            else cleanupImages(); // Fallback

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar detalhes de um produto (com URLs assinadas)
    if (subPath.startsWith("/products/get") && method === "GET") {
        try {
            const productUid = url.searchParams.get("uid");
            const data = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}`, "GET", null, env);

            if (data instanceof Response || !data.length) throw new Error("Não encontrado");

            const product = data[0];
            const [urlSale, urlCreator] = await Promise.all([
                product.product_image_sale ? generateSignedUrl(product.product_image_sale, "sale", env) : null,
                product.product_image_creator ? generateSignedUrl(product.product_image_creator, "creator", env) : null
            ]);

            return new Response(JSON.stringify({ ...product, url_sale_preview: urlSale, url_creator_preview: urlCreator }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // POST: Ajuste rápido de estoque
    if (subPath.startsWith("/products/stock-adjust") && method === "POST") {
        try {
            const { uid, action } = await request.json();
            const current = await dataBaseRequest(`dashboard_products?uid=eq.${uid}`, "GET", null, env);

            if (current instanceof Response || !current.length) throw new Error("Produto não encontrado.");

            const p = current[0];
            const newStock = (action === "in") ? p.product_stock_now + 1 : Math.max(0, p.product_stock_now - 1);
            const newStatus = newStock <= 0 ? 2 : (newStock < p.product_stock_min ? 1 : 0);

            const updated = await dataBaseRequest(`dashboard_products?uid=eq.${uid}`, "PATCH", {
                product_stock_now: newStock,
                product_status: newStatus
            }, env);

            if (updated instanceof Response) return updated;

            return new Response(JSON.stringify({
                success: true,
                new_row_html: create_product_row(updated[0])
            }), { status: 200 });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Carregar lista de estoque
    if (subPath.startsWith("/products/load") && method === "GET") {
        try {
            const products = await dataBaseRequest("dashboard_products?select=*&order=product_title.asc", "GET", null, env);
            if (products instanceof Response) return products;

            const productsRows = products.map(product => create_product_row(product));
            return new Response(JSON.stringify(productsRows), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), { status: 404 });
}
