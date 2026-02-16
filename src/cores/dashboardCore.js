import verifyAuth from '../auth/verifyAuth.js';
import { create_job_card, create_order_row, create_product_row } from "../renders/dashboard.js";
import { uploadImage, generateSignedUrl } from "../utils/imageConnect.js";

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
            const body = await request.json();
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            // 1. Inserir a Order
            const orderResp = await fetch(`${supabaseUrl}/dashboard_orders`, {
                method: "POST",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    client_name: body.client_name,
                    client_uid: body.client_uid,
                    client_address: body.client_address,
                    client_phone: body.client_phone,
                    order_priority: body.order_priority || 1,
                    order_origin: body.order_origin || '',
                    order_total_price: body.order_total_price || 0,
                    order_status: 0
                })
            });

            if (!orderResp.ok) throw new Error("Falha ao criar Order");
            const order = (await orderResp.json())[0];

            // 2. Inserir Jobs vinculados
            let jobUids = [];
            if (body.jobs && body.jobs.length > 0) {


                const jobsToInsert = body.jobs.map(job => ({
                    order_uid: order.uid,
                    order_num: order.id_num,
                    job_text_title: job.title,
                    job_text_font: job.font,
                    job_image_name: job.image_name || 'N/A',
                    job_image_url: job.image_url || '',
                    job_observ: job.observ || '',
                    job_delivery_date: job.delivery_date,
                    job_status: 0
                }));

                const jobsResp = await fetch(`${supabaseUrl}/dashboard_jobs`, {
                    method: "POST",
                    headers: {
                        "apikey": env.SUPABASE_KEY,
                        "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify(jobsToInsert)
                });

                if (jobsResp.ok) {
                    const insertedJobs = await jobsResp.json();
                    jobUids = insertedJobs.map(j => j.uid);

                    // Atualiza a lista de IDs na Order
                    await fetch(`${supabaseUrl}/dashboard_orders?uid=eq.${order.uid}`, {
                        method: "PATCH",
                        headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ order_list_jobs: jobUids })
                    });
                }
            }

            return new Response(JSON.stringify({ success: true, order_id: order.id_num }), { status: 201 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar informações do Cliente/Endereço
    if (subPath.startsWith("/orders/update-info") && method === "PATCH") {
        try {
            const body = await request.json();
            const { uid, ...updateData } = body;

            await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_orders?uid=eq.${uid}`, {
                method: "PATCH",
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ ...updateData, order_date_last_modified: new Date().toISOString() })
            });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Cancelar Order (Status 99) e limpar imagens
    if (subPath.startsWith("/orders/cancel") && method === "PATCH") {
        try {
            const { order_uid } = await request.json();

            const jobsResp = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_jobs?uid_order=eq.${order_uid}&select=job_image_url`, {
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}` }
            });
            const jobs = await jobsResp.json();

            // Lógica de deleção de imagens (Comentada conforme solicitado)
            /* for (const job of jobs) {
                if (job.job_image_url) {
                    const fileKey = job.job_image_url.split('/').pop();
                    await env.MY_BUCKET.delete(fileKey);
                }
            } */

            await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_orders?uid=eq.${order_uid}`, {
                method: "PATCH",
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ order_status: 99 })
            });

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar Orders por intervalo de data
    if (subPath.startsWith("/orders/search") && method === "GET") {
        try {
            const startDate = url.searchParams.get("start"); // Formato YYYY-MM-DD
            const endDate = url.searchParams.get("end");

            if (!startDate || !endDate) {
                return new Response(JSON.stringify({ error: "Datas inicial e final são obrigatórias." }), { status: 400 });
            }

            // Validação de intervalo de 6 meses
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

            if (diffInMonths > 6 || diffInMonths < 0) {
                return new Response(JSON.stringify({ error: "O intervalo máximo permitido é de 6 meses." }), { status: 400 });
            }

            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/dashboard_orders`;

            // Query: Filtra por order_created_at e ordena por hora (descendente - mais recentes primeiro)
            const queryUrl = `${supabaseUrl}?order_created_at=gte.${startDate}T00:00:00&order_created_at=lte.${endDate}T23:59:59&order=order_created_at.desc`;

            const response = await fetch(queryUrl, {
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            const orders = await response.json();

            // Gerar o HTML das linhas usando o renderizador que criamos
            // Para o resumo dos itens, usamos o conteúdo da coluna order_list_jobs
            const htmlRows = orders.map(order => {
                // Lógica simples para gerar o resumo visual dos jobs a partir do JSON
                const jobsCount = Array.isArray(order.order_list_jobs) ? order.order_list_jobs.length : 0;
                const summary = jobsCount > 0 ? `${jobsCount === 1 ? "1 item" : jobsCount + " itens"}` : "Sem itens";

                return create_order_row(order, summary);
            });

            return new Response(JSON.stringify(htmlRows), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE JOBS (TRABALHOS) ---

    // GET: Buscar Jobs para o Dashboard (Renderiza Cards)
    if (subPath.startsWith("/jobs/search") && method === "GET") {
        const dateFilter = url.searchParams.get("date");
        try {
            const response = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_jobs?job_start_date=eq.${dateFilter}&select=*`, {
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" }
            });
            const jobsFromDb = await response.json();

            const htmlCardsArray = jobsFromDb.map(row => {
                return create_job_card(
                    { order_uid: row.order_uid, order_id: row.order_num, priority: row.job_status },
                    {
                        uid: row.uid, job_id: row.uid.split('-')[0],
                        product_title: row.product_title, product_color: row.product_color,
                        text: row.job_text_title || "Sem Texto", font: row.job_text_font || "Sem Texto",
                        name_image: row.job_image_name || "Sem Imagem", observ: row.job_observ
                    }
                );
            });

            const res = new Response(JSON.stringify(htmlCardsArray), { status: 200, headers: { "Content-Type": "application/json" } });

            return res;
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar um Job individualmente (Fonte, Título, Observação, etc.)
    if (subPath.startsWith("/jobs/update-detail") && method === "PATCH") {
        try {
            const body = await request.json(); // { uid: "...", job_text_font: "...", job_observ: "..." }
            const { uid, ...updateFields } = body;

            const response = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_jobs?uid=eq.${uid}`, {
                method: "PATCH",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updateFields)
            });

            if (!response.ok) throw new Error("Erro ao editar detalhes do Job");

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Alterar Status do Job (Iniciar/Finalizar)
    if (subPath.startsWith("/jobs/status") && method === "PATCH") {
        try {
            const body = await request.json();
            await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_jobs?uid=eq.${body.uid}`, {
                method: "PATCH",
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ job_status: body.status })
            });
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE PRODUCTS (PRODUTOS) ---

    // POST: Criar Produto
    if (subPath.startsWith("/products/create") && method === "POST") {
        // Variáveis para rastrear os nomes gerados
        let imageSalePath = null;
        let imageCreatorPath = null;

        try {
            const formData = await request.formData();
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const priceBuy = parseFloat(formData.get('price_buy')) || 0;
            const priceSell = parseFloat(formData.get('price_sell')) || 0;

            let status = 0;
            if (stockNow <= 0) status = 2;
            else if (stockNow < stockMin) status = 1;

            // 1. Processamento de Imagens (Mantendo sua chamada original)
            imageSalePath = await uploadImage(formData.get('image_sale'), "sale", env);
            imageCreatorPath = await uploadImage(formData.get('image_creator'), "creator", env);

            if (!imageSalePath || !imageCreatorPath) throw new Error("Erro ao processar imagens.");

            // 2. Envio para o Supabase
            const productResp = await fetch(`${supabaseUrl}/dashboard_products`, {
                method: "POST",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    product_title: formData.get('name'),
                    product_type: formData.get('type'),
                    product_color: formData.get('color'),
                    product_desc: formData.get('description'),
                    product_stock_now: stockNow,
                    product_stock_min: stockMin,
                    product_price_buy: priceBuy,
                    product_price_sell: priceSell,
                    product_image_sale: imageSalePath,
                    product_image_creator: imageCreatorPath,
                    product_status: status
                })
            });

            // 3. Verificação do Retorno
            if (!productResp.ok) {
                // Se o banco falhou, lançamos o erro para cair no catch e limpar as imagens
                throw new Error("Erro ao salvar produto no banco.");
            }

            const productData = await productResp.json();
            return new Response(JSON.stringify({ success: true, data: productData[0] }), { status: 201 });

        } catch (error) {
            // --- LOGICA DE LIMPEZA (ROLLBACK) ---
            // Se as imagens foram geradas mas o processo parou depois disso, deletamos
            const cleanup = async () => {
                if (imageSalePath) await env.sale.delete(imageSalePath).catch(e => console.error("Erro cleanup sale:", e));
                if (imageCreatorPath) await env.creator.delete(imageCreatorPath).catch(e => console.error("Erro cleanup creator:", e));
            };

            // Executa a limpeza em background sem travar a resposta de erro para o cliente
            if (ctx && typeof ctx.waitUntil === 'function') {
                ctx.waitUntil(cleanup());
            } else {
                cleanup(); // Fallback se ctx não estiver disponível
            }

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Produto
    if (subPath.startsWith("/products/update") && method === "PATCH") {
        let newImageSale = null;
        let newImageCreator = null;
        let oldImageSale = null;
        let oldImageCreator = null;

        try {
            const formData = await request.formData();
            const productId = formData.get('id');
            if (!productId) throw new Error("ID do produto é obrigatório.");

            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            // 1. Buscar dados atuais
            const currentResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${productId}`, {
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}` }
            });
            const currentData = await currentResp.json();
            if (!currentData.length) throw new Error("Produto não encontrado.");

            oldImageSale = currentData[0].product_image_sale;
            oldImageCreator = currentData[0].product_image_creator;

            // 2. Lógica de Status e Conversões
            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            let status = 0;
            if (stockNow <= 0) status = 2;
            else if (stockNow < stockMin) status = 1;

            // 3. Upload das novas imagens (Retornam NULL se não houver arquivo no FormData)
            newImageSale = await uploadImage(formData.get('image_sale'), "sale", env);
            newImageCreator = await uploadImage(formData.get('image_creator'), "creator", env);

            const updateResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${productId}`, {
                method: "PATCH",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    product_title: formData.get('name'),
                    product_type: formData.get('type'),
                    product_color: formData.get('color'),
                    product_desc: formData.get('description'),
                    product_stock_now: stockNow,
                    product_stock_min: stockMin,
                    product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                    product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                    // AJUSTE AQUI: Se for null, usa a antiga.
                    product_image_sale: newImageSale || oldImageSale,
                    product_image_creator: newImageCreator || oldImageCreator,
                    product_status: status
                })
            });

            if (!updateResp.ok) throw new Error("Erro ao atualizar banco.");

            // --- SUCESSO: Limpar as imagens antigas apenas se foram trocadas ---
            const successCleanup = async () => {
                if (newImageSale && newImageSale !== oldImageSale) await env.sale.delete(oldImageSale).catch(() => { });
                if (newImageCreator && newImageCreator !== oldImageCreator) await env.creator.delete(oldImageCreator).catch(() => { });
            };
            if (ctx?.waitUntil) ctx.waitUntil(successCleanup());

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // --- ERRO: Rollback apenas se uma nova imagem chegou a ser criada ---
            const errorRollback = async () => {
                if (newImageSale) await env.sale.delete(newImageSale).catch(() => { });
                if (newImageCreator) await env.creator.delete(newImageCreator).catch(() => { });
            };
            if (ctx?.waitUntil) ctx.waitUntil(errorRollback());

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Excluir Produto
    if (subPath.startsWith("/products/delete") && method === "DELETE") {
        try {
            const url = new URL(request.url);
            const productId = url.searchParams.get("id");

            if (!productId) throw new Error("ID do produto é obrigatório.");

            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            // 1. Buscar os caminhos das imagens antes de deletar o registro
            const currentResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${productId}`, {
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`
                }
            });

            const currentData = await currentResp.json();
            if (!currentData || currentData.length === 0) {
                throw new Error("Produto não encontrado.");
            }

            const product = currentData[0];

            // 2. Deletar as imagens dos Buckets R2
            // Usamos Promise.allSettled para tentar deletar ambas, mesmo que uma falhe
            const deletePromises = [];

            if (product.product_image_sale) {
                deletePromises.push(env.sale.delete(product.product_image_sale));
            }
            if (product.product_image_creator) {
                deletePromises.push(env.creator.delete(product.product_image_creator));
            }

            await Promise.allSettled(deletePromises);

            // 3. Deletar o registro no Supabase
            const deleteResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${productId}`, {
                method: "DELETE",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            if (!deleteResp.ok) throw new Error("Erro ao deletar produto do banco de dados.");

            return new Response(JSON.stringify({
                success: true,
                message: "Produto e imagens removidos com sucesso."
            }), { status: 200 });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar Produtos para o Dashboard (Estoque)
    if (subPath.startsWith("/products/load") && method === "GET") {
        try {
            const response = await fetch(`${env.SUPABASE_URL}/rest/v1/dashboard_products?select=*&order=product_title.asc`, {
                headers: { "apikey": env.SUPABASE_KEY, "Authorization": `Bearer ${env.SUPABASE_KEY}` }
            });
            const productsFromDb = await response.json();

            // Gerar as linhas da tabela com URLs assinadas para o preview do estoque
            const productsRows = await Promise.all(productsFromDb.map(async (product) => {
                return create_product_row({ ...product });
            }));

            return new Response(JSON.stringify(productsRows), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar detalhes de um produto para edição
    if (subPath.startsWith("/products/get") && method === "GET") {
        try {
            const url = new URL(request.url);
            const productUid = url.searchParams.get("uid");
            if (!productUid) throw new Error("ID não fornecido.");

            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            const resp = await fetch(`${supabaseUrl}/dashboard_products?uid=eq.${productUid}`, {
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`
                }
            });

            const data = await resp.json();
            if (!data.length) throw new Error("Produto não encontrado.");

            const product = data[0];
            // Gerar URLs assinadas para o Staff visualizar no modal
            const [urlSale, urlCreator] = await Promise.all([
                product.product_image_sale ? generateSignedUrl(product.product_image_sale, "sale", env) : null,
                product.product_image_creator ? generateSignedUrl(product.product_image_creator, "creator", env) : null
            ]);

            return new Response(JSON.stringify({
                ...product,
                url_sale_preview: urlSale,
                url_creator_preview: urlCreator
            }), { status: 200 });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // POST: Ajuste rápido de estoque
    if (subPath.startsWith("/products/stock-adjust") && method === "POST") {
        try {
            const { id, action } = await request.json(); // action: "in" ou "out"
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1`;

            // 1. Buscar estoque atual e mínimo
            const currentResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${id}`, {
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`
                }
            });
            const productArr = await currentResp.json();
            if (!productArr.length) throw new Error("Produto não encontrado.");

            const p = productArr[0];
            let newStock = p.product_stock_now;

            // 2. Aplicar o ajuste
            if (action === "in") newStock++;
            else if (action === "out") newStock = Math.max(0, newStock - 1);

            // 3. Recalcular Status
            let newStatus = 0;
            if (newStock <= 0) newStatus = 2;
            else if (newStock < p.product_stock_min) newStatus = 1;

            // 4. Salvar no Banco
            const updateResp = await fetch(`${supabaseUrl}/dashboard_products?id=eq.${id}`, {
                method: "PATCH",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    product_stock_now: newStock,
                    product_status: newStatus
                })
            });

            if (!updateResp.ok) throw new Error("Erro ao atualizar estoque.");

            return new Response(JSON.stringify({
                success: true,
                new_stock: newStock,
                new_status: newStatus
            }), { status: 200 });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), { status: 404 });
}
