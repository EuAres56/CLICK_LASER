import verifyAuth from '../auth/verifyAuth.js';
import { create_job_card, create_order_row, create_product_row, create_selection_item, create_staff_row, buildDashboardPayloadSections } from "../renders/dashboard.js";
import { uploadLibraryAsset, deleteFromBucket } from "../utils/connectBuckets.js";
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
    const permissions_map = JSON.parse(auth.permissions_map) || {};
    const permissions_level = auth.permissions_level || 0;


    // GET: carrega toda a estrutura do dashboard de acordo com as permissões do usuário
    if (subPath.startsWith("/start") && method === "GET") {
        try {
            const sections_html = await buildDashboardPayloadSections(permissions_map, auth.uid, env)
            const scripts = `
<script src="./script/dashboard_main.js"></script>
            `
            sections_html.scripts = scripts

            return new Response(JSON.stringify(sections_html), { status: 200 });
        } catch (error) {
            const html = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Erro ao carregar dashboard</h4>
                <p>${error.message}</p>
            </div>
        `
            return new Response(JSON.stringify({ sections_html: html, modals_html: '', pages_list_html: '' }), JSON.stringify({ error: error.message }), { status: 500 });
        }
    }


    // GET /dashboard/stats
    if (subPath.startsWith("/stats") && method === "GET") {
        try {
            // Buscamos contagens específicas de Ordens e Jobs
            const [pendentes, emGravacao, concluidos] = await Promise.all([
                dataBaseRequest("dashboard_orders?order_status=eq.0&select=count", "GET", null, env),
                dataBaseRequest("dashboard_jobs?job_status=eq.2&select=count", "GET", null, env),
                dataBaseRequest("dashboard_orders?order_status=eq.2&select=count", "GET", null, env) // Assumindo 2 como concluído
            ]);

            return new Response(JSON.stringify({
                pending: pendentes[0]?.count || 0,
                activeJobs: emGravacao[0]?.count || 0,
                completedToday: concluidos[0]?.count || 0
            }), { status: 200 });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE ORDERS (PEDIDOS) ---

    // POST: Criar Ordem e Jobs simultaneamente
    if (subPath.startsWith("/orders/create") && method === "POST") {
        const uploadedImages = [];

        try {
            const formData = await request.formData();
            const payloadStr = formData.get('payload');
            if (!payloadStr) throw new Error("Payload não encontrado.");

            const body = JSON.parse(payloadStr);

            // 1. Criar a Ordem Principal
            const orderData = await dataBaseRequest("dashboard_orders", "POST", {
                client_uid: body.client_uid,
                client_name: body.client_name,
                client_address: body.client_address,
                client_phone: body.client_phone,
                order_origin: body.order_origin || '',
                order_status: parseInt(body.order_status) || 0,
                order_priority: body.order_priority || 1,
                order_delivery_date: body.order_delivery_date || null,
            }, env);

            if (orderData instanceof Response) return orderData;
            const order = orderData[0];

            // 2. Processar os Jobs
            const jobsToInsert = [];
            const orderStatus = parseInt(body.order_status) || 0;

            if (body.jobs && body.jobs.length > 0) {
                for (const [index, job] of body.jobs.entries()) {

                    const file = formData.get(`file_job_${index}`);
                    let finalImageUrl = null;

                    if (file && file instanceof File && file.size > 0) {
                        finalImageUrl = await uploadImage(file, "sale", env);

                        // REVISÃO: Valida se o upload realmente funcionou
                        if (finalImageUrl) {
                            uploadedImages.push(finalImageUrl);
                        } else {
                            throw new Error(`Falha ao realizar upload da imagem para o job ${index}`);
                        }
                    }

                    jobsToInsert.push({
                        order_uid: order.uid,
                        order_num: order.id_num,
                        product_uid: job.product_uid,
                        product_title: job.product_title,
                        product_color: job.product_color,

                        job_text_title: job.text_title || null,
                        job_text_font: job.text_font || null,
                        job_font_uid: job.font_uid || null,

                        job_figure_uid: job.uid_figure || null,
                        job_figure_name: job.figure_name || null,
                        job_figure_url: job.figure_url || null,

                        job_image_url_reference: finalImageUrl,
                        job_observ: job.observation || null,
                        job_status: 0,
                        // REVISÃO: Lógica idêntica ao Update para consistência de data
                        job_start_date: (orderStatus !== 99 && orderStatus !== 0) ? new Date().toISOString() : null
                    });
                }

                // 3. Inserção em lote no banco
                const insertedJobs = await dataBaseRequest("dashboard_jobs", "POST", jobsToInsert, env);

                if (insertedJobs instanceof Response) {
                    // ROLLBACK: Limpeza total em caso de falha na inserção
                    await dataBaseRequest(`dashboard_orders?uid=eq.${order.uid}`, "DELETE", null, env);

                    if (uploadedImages.length > 0) {
                        const imgRollback = uploadedImages.map(url => deleteFromBucket(url, 'sale', env));
                        await Promise.allSettled(imgRollback);
                    }
                    return insertedJobs;
                }

                // 4. Atualizar a Ordem com os UIDs reais retornados pelo banco
                const jobUids = insertedJobs.map(j => j.uid);
                await dataBaseRequest(`dashboard_orders?uid=eq.${order.uid}`, "PATCH", {
                    order_list_jobs: jobUids
                }, env);
            }

            return new Response(JSON.stringify({ success: true, order_id: order.id_num }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("[CREATE ERROR]:", error.message);

            // Rollback de segurança para evitar arquivos órfãos no R2
            if (uploadedImages.length > 0) {
                const imgRollback = uploadedImages.map(url => deleteFromBucket(url, 'sale', env));
                // Usamos allSettled para garantir que tente deletar todos mesmo que um falhe
                if (typeof ctx !== 'undefined' && ctx.waitUntil) {
                    ctx.waitUntil(Promise.allSettled(imgRollback));
                } else {
                    await Promise.allSettled(imgRollback);
                }
            }

            return new Response(JSON.stringify({ error: "Erro interno: " + error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Ordem e Jobs (Com Sincronização, Cancelamento e Reativação)
    if (subPath.startsWith("/orders/update") && method === "PATCH") {
        try {
            const formData = await request.formData();
            const payloadStr = formData.get('payload');
            if (!payloadStr) throw new Error("Payload não encontrado.");

            const body = JSON.parse(payloadStr);
            const order_uid = formData.get('uid');

            if (!order_uid) throw new Error("UID da ordem não fornecido.");

            // 1. BUSCA ESTADO ATUAL
            const currentOrderRes = await dataBaseRequest(`dashboard_orders?uid=eq.${order_uid}`, "GET", null, env);
            if (currentOrderRes instanceof Response || !currentOrderRes.length) throw new Error("Ordem não encontrada.");
            const dbOrder = currentOrderRes[0];

            // REVISÃO: Busca jobs usando order_uid para garantir que pegamos todos, mesmo os que não estão na lista da ordem por erro prévio
            const dbJobs = await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}`, "GET", null, env);
            if (dbJobs instanceof Response) throw new Error("Erro ao buscar jobs atuais.");

            const imagesToDelete = [];
            const newImagesUploaded = [];

            // 2. IDENTIFICAR JOBS PARA EXCLUSÃO
            const frontJobUids = body.jobs.filter(j => j.uid).map(j => j.uid);
            const jobsToDeleteFromDb = dbJobs.filter(dj => !frontJobUids.includes(dj.uid));

            // 3. PROCESSAR CADA JOB DO PAYLOAD (UPDATE OU INSERT)
            const processJobsPromises = body.jobs.map(async (frontJob, index) => {
                const dbJob = frontJob.uid ? dbJobs.find(j => j.uid === frontJob.uid) : null;

                const file = formData.get(`file_job_${index}`);
                let finalImageUrl = frontJob.job_image_url_reference || (dbJob ? dbJob.job_image_url_reference : null);

                if (file && file instanceof File && file.size > 0) {
                    const uploadedUrl = await uploadImage(file, "sale", env);
                    if (!uploadedUrl) throw new Error(`Falha no upload da imagem do job ${index}`);

                    newImagesUploaded.push(uploadedUrl);
                    if (dbJob?.job_image_url_reference) imagesToDelete.push(dbJob.job_image_url_reference);
                    finalImageUrl = uploadedUrl;
                }

                const jobPayload = {
                    product_uid: frontJob.product_uid,
                    product_title: frontJob.product_title,
                    product_color: frontJob.product_color,
                    job_text_title: frontJob.text_title || null,
                    job_font_uid: frontJob.font_uid || null,
                    job_text_font: frontJob.text_font || null,
                    job_figure_uid: frontJob.figure_uid || null,
                    job_figure_name: frontJob.figure_name || null,
                    job_figure_url: frontJob.figure_url || null,
                    job_observ: frontJob.observation || null,
                    job_image_url_reference: finalImageUrl
                };

                if (dbJob) {
                    return dataBaseRequest(`dashboard_jobs?uid=eq.${dbJob.uid}`, "PATCH", jobPayload, env);
                } else {
                    return dataBaseRequest(`dashboard_jobs`, "POST", {
                        ...jobPayload,
                        order_uid: dbOrder.uid,
                        order_num: dbOrder.id_num,
                        job_status: 0
                    }, env);
                }
            });

            const jobResults = await Promise.all(processJobsPromises);
            if (jobResults.some(r => r instanceof Response)) throw new Error("Falha na sincronização dos jobs.");

            // 4. EXECUTAR DELEÇÕES
            if (jobsToDeleteFromDb.length > 0) {
                const deletePromises = jobsToDeleteFromDb.map(async (jobToDel) => {
                    await dataBaseRequest(`dashboard_jobs?uid=eq.${jobToDel.uid}`, "DELETE", null, env);
                    if (jobToDel.job_image_url_reference) imagesToDelete.push(jobToDel.job_image_url_reference);
                });
                await Promise.all(deletePromises);
            }

            // 5. RECONSTRUIR LISTA DE JOBS (Fundamental para manter o array order_list_jobs atualizado)
            const allCurrentJobs = await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}&select=uid`, "GET", null, env);
            const updatedJobUids = Array.isArray(allCurrentJobs) ? allCurrentJobs.map(j => j.uid) : [];

            // 6. PREPARAR PAYLOAD DA ORDEM
            const orderUpdatePayload = { order_list_jobs: updatedJobUids };

            // Comparações de campos simples
            const fields = ['client_name', 'client_address', 'client_phone', 'order_origin', 'order_priority', 'order_delivery_date'];
            fields.forEach(field => {
                if (body[field] !== undefined && body[field] !== dbOrder[field]) {
                    orderUpdatePayload[field] = body[field];
                }
            });

            // 7. LÓGICA DE STATUS: Cancelamento, Reativação ou Produção
            const oldStatus = parseInt(dbOrder.order_status);
            const newStatus = parseInt(body.order_status);

            if (newStatus !== oldStatus) {
                orderUpdatePayload.order_status = newStatus;

                if (newStatus === 99) {
                    // Cancelamento: Tudo vira 99
                    await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}`, "PATCH", { job_status: 99 }, env);
                }
                else if (oldStatus >= 2 && newStatus === 1) {
                    // REVISÃO: Se estava Concluída/Finalizada (>=2) e voltou para Aprovada (1)
                    // Resetamos status para 0 e forçamos nova data de início como "hoje"
                    await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}`, "PATCH", {
                        job_status: 1,
                        job_start_date: new Date().toISOString()
                    }, env);
                }
                else if (oldStatus === 99 && newStatus !== 99) {
                    // Reativação de cancelada: Reset total
                    await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}`, "PATCH", {
                        job_status: 1,
                        job_start_date: new Date().toISOString()
                    }, env);
                }
                else if (newStatus !== 0) {
                    // Fluxo normal: Apenas marca data se ainda estiver nula
                    await dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}&job_start_date=is.null`, "PATCH", {
                        job_start_date: new Date().toISOString()
                    }, env);
                }
            }

            // 8. FINALIZAR UPDATE DA ORDEM (Só faz se houver mudanças no payload)
            if (Object.keys(orderUpdatePayload).length > 0) {
                const finalUpdate = await dataBaseRequest(`dashboard_orders?uid=eq.${order_uid}`, "PATCH", orderUpdatePayload, env);
                if (finalUpdate instanceof Response) throw new Error("Erro ao atualizar cabeçalho da ordem.");
            }

            // 9. CLEANUP BUCKET
            if (imagesToDelete.length > 0) {
                const cleanup = imagesToDelete.map(url => deleteFromBucket(url, 'sale', env));
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(Promise.allSettled(cleanup));
                else await Promise.allSettled(cleanup);
            }

            // 10. RETORNA SUCESSO E NUMERO DA ORDEM
            const nowIdNum = dbOrder.id_num;
            return new Response(JSON.stringify({
                success: true,
                id_num: nowIdNum
            }), { status: 200 });

        } catch (error) {
            console.error("[CRITICAL UPDATE ERROR]:", error.message);
            // Rollback de imagens enviadas nesta tentativa
            if (newImagesUploaded.length > 0) {
                const rollback = newImagesUploaded.map(url => deleteFromBucket(url, 'sale', env));
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(Promise.allSettled(rollback));
                else await Promise.allSettled(rollback);
            }
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET /orders/search-sale
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

    // PATCH: Cancelar Order (Status 99) em cascata
    if (subPath.startsWith("/orders/cancel") && method === "PATCH") {
        try {
            const order_uid = url.searchParams.get("uid");
            if (!order_uid) throw new Error("UID da ordem é obrigatório.");

            // 1. Preparamos as promises de atualização
            // REVISÃO: Usamos parseInt ou garantimos que o status seja enviado como número/string correta conforme o BD
            const statusCancel = 99;

            // 2. EXECUTAR EM PARALELO COM TRATAMENTO DE ERRO
            // Atualiza a Ordem Principal e todos os Jobs que pertencem a ela
            const [orderRes, jobsRes] = await Promise.all([
                dataBaseRequest(`dashboard_orders?uid=eq.${order_uid}`, "PATCH", {
                    order_status: statusCancel
                }, env),
                dataBaseRequest(`dashboard_jobs?order_uid=eq.${order_uid}`, "PATCH", {
                    job_status: statusCancel
                }, env)
            ]);

            // REVISÃO: Verificação rigorosa de erro
            // No PostgREST, uma resposta de sucesso geralmente é um array ou vazio,
            // mas se retornar uma Response com status >= 400, houve erro.
            if (orderRes instanceof Response && orderRes.status >= 400) {
                const errorData = await orderRes.json();
                throw new Error(`Erro ao cancelar Ordem: ${errorData.message || orderRes.statusText}`);
            }

            if (jobsRes instanceof Response && jobsRes.status >= 400) {
                const errorData = await jobsRes.json();
                throw new Error(`Erro ao cancelar Jobs: ${errorData.message || jobsRes.statusText}`);
            }

            return new Response(JSON.stringify({
                success: true,
                message: "Ordem e Jobs cancelados com sucesso."
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[CRITICAL CANCEL ERROR]: ${error.message}`);
            return new Response(JSON.stringify({
                error: error.message
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    // GET: Buscar Orders por intervalo de data (Mês atual ou filtro customizado)
    if (subPath.startsWith("/orders/search") && method === "GET") {
        try {
            let startDate = url.searchParams.get("start");
            let endDate = url.searchParams.get("end");

            // 1. LÓGICA DE DATA PADRÃO (Mês Atual: do dia 01 até o último dia)
            if (!startDate || !endDate) {
                const now = new Date();

                // Primeiro dia do mês atual (ex: 2024-05-01)
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

                // Último dia do mês atual (O dia 0 do mês seguinte é o último dia do mês atual)
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                // Formata para YYYY-MM-DD considerando o fuso local para evitar saltos de data
                const offset = now.getTimezoneOffset() * 60000;
                startDate = new Date(firstDay - offset).toISOString().split('T')[0];
                endDate = new Date(lastDay - offset).toISOString().split('T')[0];

            }

            // 2. BUSCA NO BANCO DE DADOS
            // Filtro: Desde 00:00:00 do primeiro dia até 23:59:59 do último
            const endpoint = `dashboard_orders?order_created_at=gte.${startDate}T00:00:00&order_created_at=lte.${endDate}T23:59:59&order=order_created_at.desc`;

            const orders = await dataBaseRequest(endpoint, "GET", null, env);

            if (orders instanceof Response) return orders;

            // 3. CONSTRUÇÃO DAS LINHAS DA TABELA
            const htmlRows = orders.map(order => {
                const jobsCount = Array.isArray(order.order_list_jobs) ? order.order_list_jobs.length : 0;
                const summary = jobsCount > 0 ? `${jobsCount} itens` : "Sem itens";

                // Retorna o componente pronto (HTML string) para o seu front-end
                return create_order_row(order, summary);
            });

            return new Response(JSON.stringify(htmlRows), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Search Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Finalizar Order e Job em cascata
    if (subPath.startsWith("/orders/finalize-with-job") && method === "PATCH") {
        try {
            const body = await request.json();
            const { job_uid } = body;
            if (!job_uid) throw new Error('Necessário informar o UID do Job para finalizar a Ordem');

            // 1. Busca o JOB para descobrir a qual ORDER ele pertence
            // Supondo que a coluna no banco se chame 'job_order_uid' ou similar
            const jobData = await dataBaseRequest(`dashboard_jobs?uid=eq.${job_uid}&select=order_uid`, "GET", null, env);

            if (jobData instanceof Response || !jobData || jobData.length === 0) {
                return new Response(JSON.stringify({ error: "Job não localizado para identificar a Ordem" }), { status: 404 });
            }

            const orderUid = jobData[0].order_uid;

            if (!orderUid) {
                return new Response(JSON.stringify({ error: "Este Job não possui uma Ordem vinculada" }), { status: 400 });
            }

            const now = new Date().toISOString();

            // 2. Finaliza a Order (Status 3 = Finalizado)
            const orderResponse = await dataBaseRequest(`dashboard_orders?uid=eq.${orderUid}`, "PATCH", {
                order_status: 3,
                order_updated_at: now
            }, env);

            // 3. Finaliza o Job (Status 3 = Finalizado)
            const jobResponse = await dataBaseRequest(`dashboard_jobs?uid=eq.${job_uid}`, "PATCH", {
                job_status: 3,
                job_updated_at: now
            }, env);

            // Verifica se ambas as operações foram bem sucedidas (opcional, dependendo do seu dataBaseRequest)
            return new Response(JSON.stringify({
                success: true,
                order_uid: orderUid,
                job_uid: job_uid
            }), { status: 200 });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE JOBS (TRABALHOS) ---

    if (dbData.production_jobs && Array.isArray(dbData.production_jobs) && dbData.production_jobs.length > 0) {
        // 1. Mapear UIDs únicos para buscar as ordens
        const orderUids = [...new Set(dbData.production_jobs.map(j => j.order_uid))];
        const ordersFromDb = await dataBaseRequest(`dashboard_orders?uid=in.(${orderUids.join(',')})&select=*`, "GET", null, env);

        // Converter ordens para um Map para busca rápida
        const ordersMap = new Map(ordersFromDb.map(o => [o.uid, o]));

        // 2. Definir a Blacklist de Status da Ordem (mesma da rota de busca)
        // 0: Pendente, 3: Concluído, 99: Cancelado/Aprovado
        const blackListView = [0, 3, 99];

        templateData.production = {
            html: dbData.production_jobs
                .filter(row => {
                    const order = ordersMap.get(row.order_uid);
                    // Só exibe se a ordem existir e não estiver nos status bloqueados
                    return order && !blackListView.includes(parseInt(order.order_status));
                })
                .sort((a, b) => {
                    // Ordenação por prioridade da Ordem (descendente)
                    const priorityA = ordersMap.get(a.order_uid)?.order_priority || 0;
                    const priorityB = ordersMap.get(b.order_uid)?.order_priority || 0;
                    return priorityB - priorityA;
                })
                .map(row => {
                    const order = ordersMap.get(row.order_uid);

                    // Formatar URL de referência (usando prefixo público e bucket lib)
                    const url_reference = row.job_image_url_reference
                        ? `${publicServePrefix}${row.job_image_url_reference}?b=lib`
                        : "";

                    // Retornar o card com TODOS os dados que a rota de busca fornece
                    return create_job_card(
                        {
                            order_uid: row.order_uid,
                            order_id: order.id_num,
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
                            url_image: row.job_figure_url || "",
                            json_image: row.job_image_json || "",
                            observ: row.job_observ || "",
                            status: row.job_status
                        }
                    );
                }).join('')
        };
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

    // PATCH: Atualizar status do Job e verificar conclusão da Ordem
    if (subPath.startsWith("/jobs/update-status") && method === "PATCH") {
        try {
            const body = await request.json();
            const { uid, status } = body;
            const targetStatus = parseInt(status);

            if (!uid) throw new Error("UID do Job não fornecido.");

            // 1. BUSCAR OS DADOS DO JOB ATUAL (Para saber a qual Ordem ele pertence)
            const currentJob = await dataBaseRequest(`dashboard_jobs?uid=eq.${uid}&select=order_uid,job_status`, "GET", null, env);

            if (!currentJob || currentJob.length === 0 || currentJob instanceof Response) {
                throw new Error("Job não encontrado.");
            }

            const parentOrderUid = currentJob[0].order_uid;

            // 2. SE NÃO FOR PARA CONCLUIR (status != 3) OU SE NÃO TIVER ORDEM PAI
            // Atualiza e encerra a requisição aqui.
            if (targetStatus !== 3 || !parentOrderUid) {
                const updated = await dataBaseRequest(`dashboard_jobs?uid=eq.${uid}`, "PATCH", { job_status: targetStatus }, env);
                return new Response(JSON.stringify({ code: (updated instanceof Response || !updated) ? 99 : 0 }), { status: 200 });
            }

            // 3. SE FOR PARA CONCLUIR (status = 3), VERIFICAR IRMÃOS NA MESMA ORDEM
            // Buscamos jobs da mesma ordem que NÃO sejam o atual e que NÃO estejam concluídos (status != 3)
            const pendingJobs = await dataBaseRequest(
                `dashboard_jobs?order_uid=eq.${parentOrderUid}&uid=neq.${uid}&job_status=neq.3&select=uid`,
                "GET",
                null,
                env
            );

            if (pendingJobs instanceof Response) return new Response(JSON.stringify({ code: 99 }), { status: 200 });

            if (pendingJobs.length === 0) {
                // Todos os outros jobs desta ordem já estão em status 3.
                // Retorna 1 para o Front perguntar se deseja fechar a Ordem.
                return new Response(JSON.stringify({ code: 1 }), { status: 200 });
            } else {
                // Ainda existem jobs pendentes na mesma ordem.
                // Apenas atualiza o status deste job para 3.
                const updated = await dataBaseRequest(`dashboard_jobs?uid=eq.${uid}`, "PATCH", { job_status: 3 }, env);
                return new Response(JSON.stringify({ code: updated instanceof Response ? 99 : 0 }), { status: 200 });
            }

        } catch (error) {
            console.error("[JOB UPDATE ERROR]:", error.message);
            return new Response(JSON.stringify({ code: 99 }), { status: 200 });
        }
    }

    // --- ROTAS DE PRODUCTS (PRODUTOS) ---

    // POST: Criar Produto
    if (subPath.startsWith("/products/create") && method === "POST") {
        let pathSale = null;
        let pathCreator = null;

        try {
            const formData = await request.formData();

            // 1. Upload das Imagens (se existirem)
            const fileSale = formData.get('image_sale');
            const fileCreator = formData.get('image_creator');

            if (fileSale && fileSale.size > 0) {
                pathSale = await uploadLibraryAsset(fileSale, 'image', env);
            }
            if (fileCreator && fileCreator.size > 0) {
                pathCreator = await uploadLibraryAsset(fileCreator, 'image', env);
            }

            // 2. Preparação dos dados para o banco
            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;
            const status = stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0);

            const data = {
                product_title: formData.get('name'),
                product_type: formData.get('type'),
                product_color: formData.get('color'),
                product_desc: formData.get('description'),
                product_stock_now: stockNow,
                product_stock_min: stockMin,
                product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                product_image_sale: pathSale,
                product_image_creator: pathCreator,
                product_status: status
            };

            const result = await dataBaseRequest("dashboard_products", "POST", data, env);
            if (result instanceof Response) throw new Error("Erro ao salvar no banco.");

            return new Response(JSON.stringify({ success: true }), { status: 201 });

        } catch (error) {
            // Rollback: Deleta o que subiu se o banco falhou
            if (pathSale) await deleteFromBucket(pathSale, 'sale', env).catch(() => { });
            if (pathCreator) await deleteFromBucket(pathCreator, 'creator', env).catch(() => { });

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar Produto
    if (subPath.startsWith("/products/update") && method === "PATCH") {
        let newPathSale = null;
        let newPathCreator = null;
        let oldPathSale = null;
        let oldPathCreator = null;

        try {
            const formData = await request.formData();
            const uid = formData.get('uid');
            if (!uid) throw new Error("UID obrigatório.");

            // 1. Busca dados atuais para cleanup futuro
            const current = await dataBaseRequest(`dashboard_products?uid=eq.${uid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Não encontrado.");

            const dbProd = current[0];
            oldPathSale = dbProd.product_image_sale;
            oldPathCreator = dbProd.product_image_creator;

            // 2. Upload de novos arquivos
            const fileSale = formData.get('image_sale');
            const fileCreator = formData.get('image_creator');

            if (typeof fileSale === 'string') console.log("String:", fileSale);
            if (typeof fileCreator === 'string') console.log("String:", fileCreator);
            if (fileSale && typeof fileSale !== 'string' && fileSale.size > 0) {
                console.log("File: ", fileSale);
                newPathSale = await uploadLibraryAsset(fileSale, "image", env);
                if (!newPathSale) throw new Error("Falha ao realizar upload da imagem.");
            };
            if (fileCreator && typeof fileCreator !== 'string' && fileCreator.size > 0) {
                console.log("File: ", fileCreator);
                newPathCreator = await uploadLibraryAsset(fileCreator, "image", env);
                if (!newPathCreator) throw new Error("Falha ao realizar upload da imagem.");

            }

            // 3. Montagem do Update
            const stockNow = parseInt(formData.get('amount')) || 0;
            const stockMin = parseInt(formData.get('amount_min')) || 0;

            const updateData = {
                product_title: formData.get('name'),
                product_type: formData.get('type'),
                product_color: formData.get('color'),
                product_desc: formData.get('description'),
                product_stock_now: stockNow,
                product_stock_min: stockMin,
                product_price_buy: parseFloat(formData.get('price_buy')) || 0,
                product_price_sell: parseFloat(formData.get('price_sell')) || 0,
                product_status: stockNow <= 0 ? 2 : (stockNow < stockMin ? 1 : 0)
            };

            if (newPathSale) updateData.product_image_sale = newPathSale;
            if (newPathCreator) updateData.product_image_creator = newPathCreator;

            const result = await dataBaseRequest(`dashboard_products?uid=eq.${uid}`, "PATCH", updateData, env);
            if (result instanceof Response) throw new Error("Erro no banco.");

            // 4. Cleanup de arquivos antigos (Sucesso)
            const cleanup = async () => {
                if (newPathSale && oldPathSale) await deleteFromBucket(oldPathSale, 'sale', env);
                if (newPathCreator && oldPathCreator) await deleteFromBucket(oldPathCreator, 'creator', env);
            };
            if (typeof ctx !== 'undefined') ctx.waitUntil(cleanup()); else await cleanup();

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // Rollback de arquivos novos (Erro)
            if (newPathSale) await deleteFromBucket(newPathSale, 'sale', env).catch(() => { });
            if (newPathCreator) await deleteFromBucket(newPathCreator, 'creator', env).catch(() => { });

            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Excluir Produto
    if (subPath.startsWith("/products/delete") && method === "DELETE") {
        try {
            const productUid = url.searchParams.get("uid");
            if (!productUid) throw new Error("UID obrigatório.");

            // O parâmetro 'select=*' no DELETE do PostgREST retorna o que foi apagado
            const deleteData = await dataBaseRequest(`dashboard_products?uid=eq.${productUid}&select=product_image_sale,product_image_creator`, "DELETE", null, env);

            if (deleteData instanceof Response) return deleteData;
            if (!deleteData || deleteData.length === 0) {
                return new Response(JSON.stringify({ error: "Produto não encontrado." }), { status: 404 });
            }

            const deletedProduct = deleteData[0];

            // Cleanup paralelo de todas as imagens associadas
            const cleanupImages = async () => {
                const deletePromises = [];
                if (deletedProduct.product_image_sale) {
                    deletePromises.push(deleteFromBucket(deletedProduct.product_image_sale, 'sale', env));
                }
                if (deletedProduct.product_image_creator) {
                    deletePromises.push(deleteFromBucket(deletedProduct.product_image_creator, 'creator', env));
                }
                await Promise.allSettled(deletePromises);
            };

            await cleanupImages();

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
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
                    ? `${publicPrefix}${product.product_image_sale}?b=lib`
                    : null,
                url_creator_preview: product.product_image_creator
                    ? `${publicPrefix}${product.product_image_creator}?b=lib`
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
                new_row_html: create_product_row(updated[0], permissions_map.stock)
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

            const productsRows = products.map(product => create_product_row(product, permissions_map.stock));
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
                console.log(file);
                uploadedPath = await uploadLibraryAsset(file, "font", env);
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
            const fontUid = formData.get('uid');

            if (!fontUid) throw new Error("UID da fonte é obrigatório.");

            // 1. Busca os dados atuais
            const current = await dataBaseRequest(`dashboard_fonts?uid=eq.${fontUid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Fonte não encontrada.");

            const dbFont = current[0];
            oldUploadedPath = dbFont.font_url;

            // 2. Lógica de Upload (Apenas se for um arquivo novo/Blob)
            const file = formData.get('file');
            if (file && typeof file !== 'string' && file.size > 0) {
                newUploadedPath = await uploadLibraryAsset(file, "font", env);
                if (!newUploadedPath) throw new Error("Erro no processamento do novo arquivo de fonte.");
            }

            // 3. Prepara os dados apenas se houver diferença
            const updateData = {};
            const newName = formData.get('name');
            const newClass = formData.get('classification');

            if (newName && newName !== dbFont.font_name) updateData.font_name = newName;
            if (newClass && newClass !== dbFont.font_type) updateData.font_type = newClass;
            if (newUploadedPath) updateData.font_url = newUploadedPath;

            // 4. Atualiza se houver o que atualizar
            if (Object.keys(updateData).length > 0) {
                const result = await dataBaseRequest(`dashboard_fonts?uid=eq.${fontUid}`, "PATCH", updateData, env);
                if (result instanceof Response) throw new Error("Erro ao atualizar dados no banco.");
            }

            // 5. Cleanup da fonte antiga (Sucesso)
            if (newUploadedPath && oldUploadedPath && newUploadedPath !== oldUploadedPath) {
                const cleanup = () => deleteFromBucket(oldUploadedPath, 'lib', env);
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup());
                else await cleanup();
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // Rollback: Apaga o arquivo novo se o banco falhar
            if (newUploadedPath) {
                const rollback = () => deleteFromBucket(newUploadedPath, 'lib', env);
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(rollback());
                else await rollback();
            }

            console.error(`[Font Update Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // DELETE: Remover fonte
    if (subPath.startsWith("/assets/fonts/delete") && method === "DELETE") {
        try {
            const uid = url.searchParams.get("uid");
            if (!uid) throw new Error("UID obrigatório.");

            // 1. Busca os dados para pegar a URL do arquivo antes de deletar
            const current = await dataBaseRequest(`dashboard_fonts?uid=eq.${uid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Fonte não encontrada.");

            const fontToDelete = current[0];

            // 2. Deleta do Banco
            const deleteResult = await dataBaseRequest(`dashboard_fonts?uid=eq.${uid}`, "DELETE", null, env);
            if (deleteResult instanceof Response) return deleteResult;

            // 3. Cleanup do Bucket (Usa a URL que estava no banco)
            const cleanup = async () => {
                if (fontToDelete.font_url) {
                    await deleteFromBucket(fontToDelete.font_url, 'lib', env);
                }
            };

            if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup());
            else await cleanup();

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
                    { id: fig.uid, label: `${fig.figure_name.toUpperCase()}` },
                    "figure",
                    null,
                    {
                        figure_uid: fig.uid,
                        figure_name: fig.figure_name,
                        figure_class: fig.figure_class,
                        figure_url: figureUrl
                    },
                    null,
                    "input-creator_assets_figure" // inputClass
                )
            });
            return new Response(JSON.stringify(htmlItems), { status: 200 });
        } catch (error) {
            console.log(error);
            return new Response(JSON.stringify({ error: error }), { status: 500 });
        }
    }

    // GET: carregar dados individuais de uma figura
    if (subPath.startsWith("/assets/vectors/get") && method === "GET") {
        try {
            const figure_uid = url.searchParams.get("uid");

            const font = await dataBaseRequest(`dashboard_figures?uid=eq.${figure_uid}`, "GET", null, env);
            if (font instanceof Response) return font;

            const data = font[0];
            const body = {
                figure_uid: data.uid,
                figure_name: data.figure_name,
                figure_url: `${publicServePrefix}${data.figure_url}?b=lib`,
                figure_class: data.figure_class
            }

            return new Response(JSON.stringify(body), { status: 200 });
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
                        figure_uid: fig.uid,
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
                uploadedPath = await uploadLibraryAsset(file, "figure", env);
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
            const figureUid = formData.get('uid');

            if (!figureUid) throw new Error("UID da figura é obrigatório.");

            // 1. Busca os dados atuais para comparação e identificação do arquivo antigo
            const current = await dataBaseRequest(`dashboard_figures?uid=eq.${figureUid}`, "GET", null, env);
            if (current instanceof Response || !current.length) throw new Error("Figura não encontrada.");

            const dbFigure = current[0];
            oldUploadedPath = dbFigure.figure_url;

            // 2. Processamento do novo arquivo (se houver)
            const file = formData.get('file');
            if (file && typeof file !== 'string' && file.size > 0) {
                console.log("File: ", file);
                newUploadedPath = await uploadLibraryAsset(file, "figure", env);
                if (!newUploadedPath) throw new Error("Erro no upload do novo vetor.");
            }

            // 3. Montagem do objeto de atualização apenas com o que mudou
            const updateData = {};
            const newName = formData.get('name');
            const newClass = formData.get('classification');

            if (newName && newName !== dbFigure.figure_name) updateData.figure_name = newName;
            if (newClass && newClass !== dbFigure.figure_class) updateData.figure_class = newClass;
            if (newUploadedPath) updateData.figure_url = newUploadedPath;

            // 4. Atualização no banco (apenas se houver mudanças)
            if (Object.keys(updateData).length > 0) {
                const result = await dataBaseRequest(`dashboard_figures?uid=eq.${figureUid}`, "PATCH", updateData, env);
                if (result instanceof Response) throw new Error("Erro ao atualizar banco de dados.");
            }

            // 5. Cleanup: Se o arquivo mudou, deletamos o antigo (Sucesso)
            if (newUploadedPath && oldUploadedPath && newUploadedPath !== oldUploadedPath) {
                const cleanup = () => deleteFromBucket(oldUploadedPath, 'lib', env);
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup());
                else await cleanup();
            }

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            // Rollback: Remove o arquivo novo se algo falhou após o upload
            if (newUploadedPath) {
                const rollback = () => deleteFromBucket(newUploadedPath, 'lib', env);
                if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(rollback());
                else await rollback();
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

            // 1. Deleta do Banco e já retorna o caminho do arquivo para cleanup
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

            // 2. Cleanup do Bucket (Usa a função padronizada)
            const cleanup = async () => {
                if (deletedFigure.figure_url) {
                    await deleteFromBucket(deletedFigure.figure_url, 'lib', env);
                }
            };

            if (typeof ctx !== 'undefined' && ctx.waitUntil) ctx.waitUntil(cleanup());
            else await cleanup();

            return new Response(JSON.stringify({ success: true }), { status: 200 });

        } catch (error) {
            console.error(`[Vector Delete Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // --- ROTAS DE STAFF --- //
    // POST: Criar Colaborador
    if (subPath.startsWith("/staff/create") && method === "POST") {
        try {
            // Mudamos de .formData() para .json() para bater com o seu saveStaff
            const body = await request.json();

            if (!body) throw new Error("Dados não recebidos corretamente.");

            // Validação da senha conforme sua lógica de front
            if (!body.password) throw new Error("A senha do colaborador deve ser informada!");

            // Mapeamento do status (front envia 'enabled_account')
            const enable_account_value = body.enabled_account === 'active';

            const data = {
                email: body.email,
                name: body.name,
                phone: body.phone,
                job_position: body.job_position,
                permissions_level: parseInt(body.permissions_level) || 1,
                date_of_birth: body.date_of_birth || null,

                state_account: false, // Inativa até o primeiro login (sua lógica)
                enable_account: enable_account_value,

                // Permissões padrão para novos usuários
                permissions_sections: {
                    home: "view",
                    orders: "blocked",
                    production: "blocked",
                    stock: "blocked",
                    staff: "blocked",
                    creator: "blocked"
                },
                configs: JSON.stringify({}),
                password: body.password // Aqui entra a senha (texto puro para o seu hash posterior)
            };

            const staffResult = await dataBaseRequest("auth_staff", "POST", data, env);

            if (staffResult instanceof Response) {
                const errorDb = await staffResult.json();
                throw new Error(errorDb.message || "Erro ao salvar no banco.");
            }

            return new Response(JSON.stringify({ success: true, data: staffResult[0] }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Staff Create Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    // PATCH: Atualizar Colaborador
    if (subPath.startsWith("/staff/update") && method === "PATCH") {
        try {
            const url = new URL(request.url);
            const staffUid = url.searchParams.get("uid");

            if (!staffUid) throw new Error("UID do colaborador é obrigatório.");

            const body = await request.json();
            if (!body) throw new Error("Dados de atualização não recebidos.");

            // 1. Mapeamento dos campos vindos do seu staffData (JS)
            // Note que aqui só incluímos o que o seu front-end realmente envia
            const updateData = {
                name: body.name,
                email: body.email,
                phone: body.phone,
                job_position: body.job_position,
                permissions_level: body.permissions_level,
                date_of_birth: body.date_of_birth || null,
                enable_account: body.enabled_account === 'active'
            };

            // 2. Lógica condicional de senha:
            // Se o operador gerou uma senha nova (reset), ela vai no body e atualizamos.
            if (body.password) {
                updateData.password = body.password; // O hash deve ser feito aqui antes do banco
                // Opcional: updateData.state_account = false; // Forçar reset no primeiro acesso
            }

            // 3. Persistência no banco de dados
            const updateResult = await dataBaseRequest(`auth_staff?uid=eq.${staffUid}`, "PATCH", updateData, env);

            if (updateResult instanceof Response) {
                const errorDb = await updateResult.json();
                throw new Error(errorDb.message || "Erro na atualização do banco.");
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Staff Update Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
    // GET: Buscar detalhes de um colaborador
    if (subPath.startsWith("/staff/get") && method === "GET") {
        try {
            const staffUid = url.searchParams.get("uid");

            if (!staffUid) {
                return new Response(JSON.stringify({ error: "UID do colaborador não informado" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 1. Busca os dados na tabela auth_staff
            const data = await dataBaseRequest(`auth_staff?uid=eq.${staffUid}`, "GET", null, env);

            if (data instanceof Response) return data;
            if (!data || data.length === 0) {
                return new Response(JSON.stringify({ error: "Colaborador não encontrado" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 2. Retorna os dados para popular o modal
            // Diferente de produtos, aqui não temos prefixo de imagem, então retornamos o objeto puro
            return new Response(JSON.stringify(data[0]), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: "Erro interno ao processar detalhes do colaborador" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    // GET: Carregar lista da tabela de colaboradores
    if (subPath.startsWith("/staff/load") && method === "GET") {
        try {
            // 1. Busca todos os membros ordenados por nome
            const staffList = await dataBaseRequest("auth_staff?select=*&order=name.asc", "GET", null, env);
            if (staffList instanceof Response) return staffList;

            /**
             * 2. Mapeamento da Tabela
             * userId: UID do usuário logado (enviado no header pelo seu apiFetch)
             * permissions_map.staff: Nível de acesso do usuário atual para a seção de equipe
             */
            const staffRows = staffList.map(member => {
                return create_staff_row(
                    member,
                    auth.uid, // Identifica se é "Você" baseado no uid vindo do banco
                    permissions_map.staff // 'edit', 'view' ou 'blocked'
                )
            }
            );

            return new Response(JSON.stringify(staffRows), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // GET: Buscar apenas permissões de um colaborador
    if (subPath.startsWith("/staff/permissions") && method === "GET") {
        try {
            const staffUid = url.searchParams.get("uid");
            if (!staffUid) throw new Error("UID não informado");

            // Buscamos apenas a coluna necessária para economizar banda
            const data = await dataBaseRequest(`auth_staff?select=permissions_sections&uid=eq.${staffUid}`, "GET", null, env);

            if (data instanceof Response || !data.length) {
                return new Response(JSON.stringify({ error: "Não encontrado" }), { status: 404 });
            }

            return new Response(JSON.stringify(data[0].permissions_sections), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    // PATCH: Atualizar permissões com Sanitização e Segurança
    if (subPath.startsWith("/staff/permissions/update") && method === "PATCH") {
        try {
            const staffUid = url.searchParams.get("uid");
            if (!staffUid) throw new Error("UID do colaborador é obrigatório.");

            const body = await request.json();
            if (!body || !body.permissions_sections) throw new Error("Dados não recebidos.");

            // 1. Definição das Regras de Ouro (Whitelist)
            const validSections = ['home', 'orders', 'production', 'creator', 'stock', 'staff'];
            const validLevels = ['blocked', 'view', 'edit'];

            // 2. Parse da string (caso venha stringificada do front)
            let rawPermissions = typeof body.permissions_sections === 'string'
                ? JSON.parse(body.permissions_sections)
                : body.permissions_sections;

            // 3. Sanitização Rigorosa
            const sanitizedPermissions = {};

            // Garantimos que TODAS as seções válidas existam no objeto final
            validSections.forEach(section => {
                const incomingValue = rawPermissions[section];

                // Se o valor enviado for válido, usamos ele. Caso contrário, 'blocked' por segurança.
                if (validLevels.includes(incomingValue)) {
                    sanitizedPermissions[section] = incomingValue;
                } else {
                    sanitizedPermissions[section] = 'blocked';
                }
            });

            // 4. Persistência no banco (tabela auth_staff)
            // Enviamos o objeto puro, o dataBaseRequest deve cuidar da formatação SQL/JSON
            const updateResult = await dataBaseRequest(`auth_staff?uid=eq.${staffUid}`, "PATCH", {
                permissions_sections: sanitizedPermissions
            }, env);

            if (updateResult instanceof Response) {
                const errorDb = await updateResult.json();
                throw new Error(errorDb.message || "Erro ao atualizar banco.");
            }

            return new Response(JSON.stringify({
                success: true,
                message: "Permissões sanitizadas e atualizadas."
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error(`[Permissions Security Error]: ${error.message}`);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }


    return new Response(JSON.stringify({ error: "Rota não encontrada" }), { status: 404 });
}
