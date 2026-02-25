import verifyAuth from '../auth/verifyAuth.js';
import { create_job_card, create_order_row, create_product_row, create_selection_item } from "../renders/dashboard.js";
import { uploadFont, uploadLibraryAsset, uploadImage } from "../utils/connectBuckets.js";
import { dataBaseRequest } from '../utils/connectDataBase.js';


export default async function dashboardCore(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const basePath = "/api/private/dashboard";
    const subPath = url.pathname.replace(basePath, "");
    // Prefixo da sua nova rota pública
    const publicServePrefix = "/api/public/assets/serve/";

    // 1. 🛡️ Validação de Autenticação
    const auth = await verifyAuth(request, env);
    if (!auth.ok) {
        return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { "Content-Type": "application/json" }
        });
    }

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
                        job_font_uid: job.uid_font,
                        job_figure_name: job.figure_name || null,
                        job_figure_url: job.figure_url || null,
                        job_figure_uid: job.figure_url || null,
                        job_image_url_reference: finalImageUrl, // URL do R2
                        job_observ: job.observation || null,
                        job_status: 0
                    });
                    console.log(jobsToInsert);
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

    if (subPath.startsWith("/orders/search-sale") && method === "GET") {
        try {
            const order_uid = url.searchParams.get("uid");
            if (!order_uid) throw new Error("UID do pedido é obrigatório.");

            // 1. Busca os dados da venda
            const order = await dataBaseRequest(`dashboard_orders?uid=eq.${order_uid}`, "GET", null, env);
            if (order instanceof Response) return order;
            if (!order.length) throw new Error("Venda não encontrada.");

            const order_data = order[0];
            const job_uid_list = order_data.order_list_jobs; // Array de UIDs

            let data_jobs = [];

            // 2. Busca todos os jobs em uma ÚNICA chamada se a lista não estiver vazia
            if (job_uid_list && job_uid_list.length > 0) {
                // Transformamos o array [1, 2, 3] em uma string "1,2,3" para o filtro 'in'
                const uidsFilter = job_uid_list.join(',');

                const jobs = await dataBaseRequest(
                    `dashboard_jobs?uid=in.(${uidsFilter})`,
                    "GET",
                    null,
                    env
                );

                if (jobs instanceof Response) throw new Error("Erro ao buscar itens da venda.");

                data_jobs = jobs;
            }

            // 3. Retorno consolidado
            return new Response(JSON.stringify({
                order: order_data,
                jobs: data_jobs
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Search Sale Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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
            // 1. Busca os Jobs filtrados pela data
            const jobsFromDb = await dataBaseRequest(`dashboard_jobs?job_start_date=eq.${dateFilter}&select=*`, "GET", null, env);
            if (jobsFromDb instanceof Response) return jobsFromDb;
            if (jobsFromDb.length === 0) return new Response(JSON.stringify([]), { status: 200 });

            // 2. Extrai UIDs únicos das Orders para buscar os detalhes
            const orderUids = [...new Set(jobsFromDb.map(j => j.order_uid))];

            // 3. Busca as Orders correspondentes (Trazemos status e prioridade/dados do pedido)
            // Usamos o filtro .in.(id1,id2,...)
            const ordersFromDb = await dataBaseRequest(`dashboard_orders?uid=in.(${orderUids.join(',')})&select=*`, "GET", null, env);
            if (ordersFromDb instanceof Response) return ordersFromDb;

            // Criamos um mapa para acesso rápido: { "uid-123": { order_data } }
            const ordersMap = new Map(ordersFromDb.map(o => [o.uid, o]));

            const publicServePrefix = "/api/public/assets/serve/";

            // 4. Mapeia os Jobs cruzando com os dados da Order
            const htmlCardsArray = jobsFromDb
                .filter(row => {
                    const order = ordersMap.get(row.order_uid);
                    // FILTRO: Só exibe o Job se a ordem existir e NÃO estiver finalizada
                    // Ajuste 'Finalizado' para o nome exato do seu status de conclusão
                    return order && order.order_status !== 1;
                })
                .map(row => {
                    const order = ordersMap.get(row.order_uid);
                    const url_reference = row.job_image_url_reference ? publicServePrefix + row.job_image_url_reference : "";
                    return create_job_card(
                        {
                            order_uid: row.order_uid,
                            order_id: order.id_num,
                            // Prioridade agora vem da Order, não do Job
                            priority: order.order_priority
                        },
                        {
                            uid: row.uid,
                            product_title: row.product_title,
                            product_color: row.product_color,
                            text: row.job_text_title || "",
                            font: row.job_text_font || "",
                            art_json: row.job_art_json || "",
                            url_ref: url_reference,
                            name_image: row.job_figure_name || "",
                            json_image: row.job_image_json || "",
                            observ: row.job_observ || ""
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

            // 1. Processamento de dados numéricos e status
            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const status = stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0);

            const data = {
                product_title: formData.get('name'), // Verifique se o nome da coluna no banco é 'name' ou 'product_title'
                product_type: formData.get('type'),
                product_color: formData.get('color'),
                product_desc: formData.get('description'),
                product_stock_now: stockNow,
                product_stock_min: stockMin,
                product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                product_status: status
            };

            // 2. Lógica de Upload Condicional
            const fileSale = formData.get('image_sale');
            const fileCreator = formData.get('image_creator');

            // Só faz upload se 'fileSale' for um objeto File/Blob e tiver tamanho > 0
            if (fileSale && typeof fileSale !== 'string' && fileSale.size > 0) {
                imageSalePath = await uploadImage(fileSale, "sale", env);
                if (!imageSalePath) throw new Error("Erro ao processar imagem de venda.");
                data.product_image_sale = imageSalePath;
            } else {
                data.product_image_sale = null; // Ou uma string vazia, conforme seu banco
            }

            if (fileCreator && typeof fileCreator !== 'string' && fileCreator.size > 0) {
                imageCreatorPath = await uploadImage(fileCreator, "creator", env);
                if (!imageCreatorPath) throw new Error("Erro ao processar imagem do criador.");
                data.product_image_creator = imageCreatorPath;
            } else {
                data.product_image_creator = null;
            }

            // 3. Persistência no Banco
            const productData = await dataBaseRequest("dashboard_products", "POST", data, env);

            if (productData instanceof Response) throw new Error("Erro ao salvar no banco");

            return new Response(JSON.stringify({ success: true, data: productData[0] }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            // Cleanup de imagens em caso de erro no banco
            const cleanup = async () => {
                if (imageSalePath) await env.MY_BUCKET_SALE.delete(imageSalePath).catch(() => { });
                if (imageCreatorPath) await env.MY_BUCKET_CREATOR.delete(imageCreatorPath).catch(() => { });
            };

            if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup()); else await cleanup();

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Produto
    if (subPath.startsWith("/products/update") && method === "PATCH") {
        let newImageSale, newImageCreator, oldImageSale, oldImageCreator;

        try {
            const formData = await request.formData();
            const productUid = formData.get('uid'); // Pegando do formData conforme seu front

            if (!productUid) throw new Error("UID do produto é obrigatório.");

            const current = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Produto não encontrado.");

            const productDataOld = current[0];
            oldImageSale = productDataOld.product_image_sale;
            oldImageCreator = productDataOld.product_image_creator;

            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const status = stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0);

            // Lógica de Upload
            const imgSale = formData.get('image_sale');
            const imgCreator = formData.get('image_creator');

            if (imgSale && typeof imgSale !== 'string' && imgSale.size > 0) {
                newImageSale = await uploadImage(imgSale, "sale", env);
            }

            if (imgCreator && typeof imgCreator !== 'string' && imgCreator.size > 0) {
                newImageCreator = await uploadImage(imgCreator, "creator", env);
            }

            const updateResult = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}`, "PATCH", {
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

            if (updateResult instanceof Response) throw new Error("Erro na atualização do banco");

            // Limpeza (Cleanup)
            const successCleanup = async () => {
                if (newImageSale && oldImageSale && newImageSale !== oldImageSale) {
                    await env.sale.delete(oldImageSale).catch(() => { });
                }
                if (newImageCreator && oldImageCreator && newImageCreator !== oldImageCreator) {
                    await env.creator.delete(oldImageCreator).catch(() => { });
                }
            };

            // Se o ctx existir, usa waitUntil para não segurar a resposta.
            // Se não, aguarda com await.
            if (typeof ctx !== 'undefined' && ctx.waitUntil) {
                ctx.waitUntil(successCleanup());
            } else {
                await successCleanup();
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // Rollback: Se deu erro, apaga as imagens novas que acabaram de subir
            const rollback = async () => {
                if (newImageSale) await env.sale.delete(newImageSale).catch(() => { });
                if (newImageCreator) await env.creator.delete(newImageCreator).catch(() => { });
            };

            if (typeof ctx !== 'undefined' && ctx.waitUntil) {
                ctx.waitUntil(rollback());
            } else {
                await rollback();
            }

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Excluir Produto
    if (subPath.startsWith("/products/delete") && method === "DELETE") {
        try {
            const productUid = url.searchParams.get("uid");
            if (!productUid) throw new Error("UID obrigatório.");

            // 1. Deletamos e já pedimos os dados das imagens de volta na mesma chamada
            // O parâmetro 'select=*' no DELETE retorna o objeto que foi removido
            const deleteData = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}&select=product_image_sale,product_image_creator`, "DELETE", null, env);

            if (deleteData instanceof Response) return deleteData;

            // Se o array vier vazio, o produto não existia
            if (!deleteData || deleteData.length === 0) {
                return new Response(JSON.stringify({ error: "Produto não encontrado ou já excluído." }), { status: 404 });
            }

            const deletedProduct = deleteData[0];

            // 2. Cleanup das Imagens (Sem ctx.waitUntil, usamos await direto)
            const cleanupImages = async () => {
                const deletePromises = [];
                // Usamos os nomes de bucket 'sale' e 'creator' conforme seu padrão
                if (deletedProduct.product_image_sale) {
                    deletePromises.push(env.sale.delete(deletedProduct.product_image_sale).catch(() => { }));
                }
                if (deletedProduct.product_image_creator) {
                    deletePromises.push(env.creator.delete(deletedProduct.product_image_creator).catch(() => { }));
                }

                if (deletePromises.length > 0) {
                    await Promise.allSettled(deletePromises);
                }
            };

            // Como não estamos usando ctx, aguardamos a limpeza antes de responder
            await cleanupImages();

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Delete Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar detalhes de um produto
    if (subPath.startsWith("/products/get") && method === "GET") {
        try {
            const productUid = url.searchParams.get("uid");

            if (!productUid) {
                return new Response(JSON.stringify({ error: "UID do produto não informado" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 1. Busca os dados do produto no banco de dados
            const data = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}`, "GET", null, env);

            // Verifica se houve erro na requisição ou se o produto não existe
            if (data instanceof Response) return data;
            if (!data || data.length === 0) {
                return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const product = data[0];
            const publicPrefix = "/api/public/assets/serve/";

            // 2. Monta as URLs de visualização utilizando o parâmetro de bucket (?b=)
            // Isso permite que o navegador carregue as imagens diretamente no src da tag <img>
            const productWithUrls = {
                ...product,
                url_sale_preview: product.product_image_sale
                    ? `${publicPrefix}${product.product_image_sale}?b=sale`
                    : null,
                url_creator_preview: product.product_image_creator
                    ? `${publicPrefix}${product.product_image_creator}?b=creator`
                    : null
            };

            // 3. Retorna os dados completos do produto
            return new Response(JSON.stringify(productWithUrls), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });

        } catch (error) {
            console.error(`[Products Get Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: "Erro interno ao processar detalhes do produto" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
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
    // GET: Carregar lista de produtos para seleção no Pedido
    if (subPath.startsWith("/products/selection-list") && method === "GET") {
        try {
            // Busca apenas produtos ativos/em estoque (opcional filtrar por product_status < 2)
            const products = await dataBaseRequest(
                "dashboard_products?select=uid,product_title,product_color&order=product_title.asc",
                "GET",
                null,
                env
            );

            if (products instanceof Response) return products;

            // Gera o HTML para cada produto
            const htmlItems = products.map(p => create_selection_item(
                { id: p.uid, label: `${p.product_title} - ${p.product_color}` },
                "prod", null,
                { product_uid: p.uid, product_title: p.product_title, product_color: p.product_color }
            ));

            return new Response(JSON.stringify(htmlItems), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }



    // --- ROTAS DE ASSETS: FONTS ---

    // GET: Carregar lista de fontes para seleção (HTML)
    if (subPath.startsWith("/assets/fonts/load") && method === "GET") {
        try {
            const fonts = await dataBaseRequest("dashboard_fonts?select=*&order=font_name.asc", "GET", null, env);
            if (fonts instanceof Response) return fonts;

            const htmlItems = fonts.map(f => {
                // Monta a URL completa apontando para o seu novo router público
                const fontUrl = `${publicServePrefix}${f.font_url}?b=lib`;

                return create_selection_item(
                    { id: f.uid, label: f.font_name.toUpperCase() },
                    "font",
                    null,
                    {
                        font_uid: f.uid,
                        font_name: f.font_name,
                        font_url: fontUrl, // <--- URL Padronizada
                        font_type: f.font_type
                    },
                    `style="font-family: '${f.font_name}'"`,
                    "input-creator_assets_font"

                );
            });

            return new Response(JSON.stringify(htmlItems), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: carregar dados individuais de uma fonte
    if (subPath.startsWith("/assets/fonts/get") && method === "GET") {
        try {
            const font_uid = url.searchParams.get("uid");

            const font = await dataBaseRequest(`dashboard_fonts?uid=eq.${font_uid}`, "GET", null, env);
            if (font instanceof Response) return font;

            const data = font[0];
            const body = {
                font_uid: data.uid,
                font_name: data.font_name,
                font_url: `${publicServePrefix}${data.font_url}?b=lib`,
                font_type: data.font_type
            }

            return new Response(JSON.stringify(body), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Carregar lista de Fontes para seleção
    if (subPath.startsWith("/assets/fonts/selection-list") && method === "GET") {
        try {
            const fonts = await dataBaseRequest("dashboard_fonts?select=*&order=font_name.asc",
                "GET", null, env
            );
            if (fonts instanceof Response) return fonts;

            const htmlItems = fonts.map(f => {
                // Monta a URL completa apontando para o seu novo router público
                const fontUrl = `${publicServePrefix}${f.font_url}?b=lib`;

                return create_selection_item(
                    { id: f.uid, label: f.font_name.toUpperCase() },
                    "sale-font",
                    null,
                    {
                        font_uid: f.uid,
                        font_name: f.font_name,
                        font_url: fontUrl, // <--- URL Padronizada
                        font_type: f.font_type
                    },
                    `style="font-family: '${f.font_name}'"`,
                    "input-sale_assets_font"

                );
            });
            return new Response(JSON.stringify(htmlItems), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // POST: Criar nova fonte
    if (subPath.startsWith("/assets/fonts/create") && method === "POST") {
        let uploadedPath = null;
        try {
            const formData = await request.formData();
            const file = formData.get('file');

            if (file && file.size > 0) {
                // Agora usa a função específica para fontes
                uploadedPath = await uploadFont(file, env);
                if (!uploadedPath) throw new Error("Erro no processamento da fonte.");
            }

            const data = {
                font_name: formData.get('name'),
                font_type: formData.get('classification'), // Sans, Serif, etc
                font_url: uploadedPath
            };

            const result = await dataBaseRequest("dashboard_fonts", "POST", data, env);
            if (result instanceof Response) throw new Error("Erro ao salvar fonte no banco.");

            return new Response(JSON.stringify({ success: true }), { status: 201 });
        } catch (error) {
            if (uploadedPath) await env.MY_BUCKET_FONTS.delete(uploadedPath).catch(() => { });
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Fonte
    if (subPath.startsWith("/assets/fonts/update") && method === "PATCH") {
        let newUploadedPath = null;
        let oldUploadedPath = null;

        try {
            const formData = await request.formData();
            const fontUid = formData.get('uid'); // UID vindo do front-end

            if (!fontUid) throw new Error("UID da fonte é obrigatório.");

            // 1. Busca os dados atuais para saber qual arquivo deletar depois
            const current = await dataBaseRequest(`dashboard_fonts?uid=eq.${fontUid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Fonte não encontrada.");

            oldUploadedPath = current[0].font_url;

            // 2. Verifica se foi enviado um novo arquivo de fonte
            const file = formData.get('file');

            // Se 'file' for um File/Blob (não uma string) e tiver conteúdo, fazemos o upload
            if (file && typeof file !== 'string' && file.size > 0) {
                newUploadedPath = await uploadFont(file, env);
                if (!newUploadedPath) throw new Error("Erro no processamento do novo arquivo de fonte.");
            }

            // 3. Prepara os dados para atualização
            const updateData = {
                font_name: formData.get('name'),
                font_type: formData.get('classification')
            };

            // Se houve upload de arquivo novo, atualizamos o campo font_url
            if (newUploadedPath) {
                updateData.font_url = newUploadedPath;
            }

            // 4. Atualiza o banco de dados
            const result = await dataBaseRequest(`dashboard_fonts?uid=eq.${fontUid}`, "PATCH", updateData, env);
            if (result instanceof Response) throw new Error("Erro ao atualizar dados no banco.");

            // 5. SUCESSO: Agora sim, deletamos a fonte antiga do bucket (se ela existia e foi trocada)
            if (newUploadedPath && oldUploadedPath && newUploadedPath !== oldUploadedPath) {
                // Usamos o binding correto (ajuste para 'lib' ou o nome do seu bucket de fontes)
                await env.lib.delete(oldUploadedPath).catch(err => {
                    console.error(`[Cleanup Error] Não foi possível deletar a fonte antiga: ${oldUploadedPath}`, err);
                });
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // ROLLBACK: Se algo deu errado após o upload, apagamos o arquivo novo para não deixar lixo
            if (newUploadedPath) {
                await env.lib.delete(newUploadedPath).catch(() => { });
            }

            console.error(`[Font Update Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Remover fonte
    if (subPath.startsWith("/assets/fonts/delete") && method === "DELETE") {
        try {
            const uid = url.searchParams.get("uid");
            const current = await dataBaseRequest(`library_fonts?uid=eq.${uid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Fonte não encontrada.");

            const deleteResult = await dataBaseRequest(`library_fonts?uid=eq.${uid}`, "DELETE", null, env);
            if (deleteResult instanceof Response) return deleteResult;

            // Cleanup Bucket
            const cleanup = async () => {
                if (current[0].font_bucket_key) await env.MY_BUCKET_FONTS.delete(current[0].font_bucket_key).catch(() => { });
            };
            if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup()); else cleanup();

            return new Response(JSON.stringify({ success: true }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE ASSETS: VECTORS/FIGURES ---

    // GET: Carregar lista de figuras (HTML)
    if (subPath.startsWith("/assets/vectors/load") && method === "GET") {
        try {
            const figures = await dataBaseRequest("dashboard_figures?select=*&order=figure_class.asc,figure_name.asc", "GET", null, env);
            if (figures instanceof Response) return figures;

            // No map das figuras:
            const htmlItems = figures.map(fig => {
                const figureUrl = `${publicServePrefix}${fig.figure_url}?b=lib`;

                return create_selection_item(
                    { id: fig.uid, label: `${fig.figure_name}` },
                    "figure",
                    null,
                    { figure_url: figureUrl },
                    null,
                    "input-creator_assets_figure" // inputClass
                )
            });

            return new Response(JSON.stringify(htmlItems), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Carregar lista de Figuras/Vetores para seleção
    if (subPath.startsWith("/assets/vectors/selection-list") && method === "GET") {
        try {
            const figures = await dataBaseRequest("dashboard_figures?select=*l&order=figure_name.asc", "GET", null, env
            );

            if (figures instanceof Response) return figures;

            // No map das figuras:
            const htmlItems = figures.map(fig => {
                const figureUrl = `${publicServePrefix}${fig.figure_url}?b=lib`;

                return create_selection_item(
                    { id: fig.uid, label: `${fig.figure_name}` },
                    "sale-figure",
                    null,
                    {
                        figure_url: figureUrl,
                        figure_name: fig.figure_name
                    },
                    null,
                    "input-sale_assets_figure" // inputClass
                )
            });

            return new Response(JSON.stringify(htmlItems), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // POST: Criar nova figura
    if (subPath.startsWith("/assets/vectors/create") && method === "POST") {
        let uploadedPath = null;
        try {
            const formData = await request.formData();
            const file = formData.get('file');

            if (file && file.size > 0) {
                uploadedPath = await uploadLibraryAsset(file, env);
                if (!uploadedPath) throw new Error("Erro no upload do vetor.");
            }

            const data = {
                figure_name: formData.get('name'),
                figure_class: formData.get('classification'),
                figure_url: uploadedPath
            };

            const result = await dataBaseRequest("dashboard_figures", "POST", data, env);
            if (result instanceof Response) throw new Error("Erro ao salvar vetor no banco.");

            return new Response(JSON.stringify({ success: true }), { status: 201 });
        } catch (error) {
            if (uploadedPath) await env.MY_BUCKET_VECTORS.delete(uploadedPath).catch(() => { });
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Figura (Vetor)
    if (subPath.startsWith("/assets/vectors/update") && method === "PATCH") {
        let newUploadedPath = null;
        let oldUploadedPath = null;

        try {
            const formData = await request.formData();
            const figureUid = formData.get('uid'); // UID enviado pelo front

            if (!figureUid) throw new Error("UID da figura é obrigatório.");

            // 1. Busca os dados atuais para identificar o arquivo antigo
            const current = await dataBaseRequest(`dashboard_figures?uid=eq.${figureUid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Figura não encontrada.");

            oldUploadedPath = current[0].figure_url;

            // 2. Processamento do novo arquivo (se houver)
            const file = formData.get('file');

            // Verifica se é um arquivo real e não uma string/vazio
            if (file && typeof file !== 'string' && file.size > 0) {
                newUploadedPath = await uploadLibraryAsset(file, env);
                if (!newUploadedPath) throw new Error("Erro no upload do novo vetor.");
            }

            // 3. Montagem do objeto de atualização
            const updateData = {
                figure_name: formData.get('name'),
                figure_class: formData.get('classification')
            };

            // Se houve novo upload, incluímos o novo caminho
            if (newUploadedPath) {
                updateData.figure_url = newUploadedPath;
            }

            // 4. Atualização no banco de dados
            const result = await dataBaseRequest(`dashboard_figures?uid=eq.${figureUid}`, "PATCH", updateData, env);
            if (result instanceof Response) throw new Error("Erro ao atualizar banco de dados.");

            // 5. Cleanup: Se o arquivo mudou, deletamos o antigo do bucket
            if (newUploadedPath && oldUploadedPath && newUploadedPath !== oldUploadedPath) {
                // Ajuste 'lib' para o binding correto do seu bucket de vetores
                await env.lib.delete(oldUploadedPath).catch(err => {
                    console.error(`[Cleanup Error] Falha ao remover vetor antigo: ${oldUploadedPath}`);
                });
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // Rollback: Remove o arquivo novo se o banco falhou
            if (newUploadedPath) {
                await env.lib.delete(newUploadedPath).catch(() => { });
            }

            console.error(`[Vector Update Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }


    // DELETE: Remover Figura (Vetor)
    if (subPath.startsWith("/assets/vectors/delete") && method === "DELETE") {
        try {
            const uid = url.searchParams.get("uid");
            if (!uid) throw new Error("UID da figura é obrigatório.");

            // 1. Deletamos e já extraímos o caminho do arquivo em uma única transação
            // O retorno do dataBaseRequest será o objeto que acabou de ser deletado
            const deleteData = await dataBaseRequest(
                `dashboard_figures?uid=eq.${uid}&select=figure_url`,
                "DELETE",
                null,
                env
            );

            if (deleteData instanceof Response) return deleteData;

            // Verifica se o objeto existia
            if (!deleteData || deleteData.length === 0) {
                return new Response(JSON.stringify({ error: "Figura não encontrada." }), { status: 404 });
            }

            const deletedFigure = deleteData[0];

            // 2. Cleanup do Bucket (Síncrono, conforme seu padrão atual sem ctx)
            const cleanup = async () => {
                if (deletedFigure.figure_url) {
                    // Ajuste 'lib' para o nome do binding do seu bucket R2
                    await env.lib.delete(deletedFigure.figure_url).catch(() => { });
                }
            };

            // Como optamos por não usar ctx.waitUntil, aguardamos a exclusão do arquivo
            await cleanup();

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Vector Delete Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), { status: 404 });
}
