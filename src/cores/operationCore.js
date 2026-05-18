import { dataBaseRequest } from '../utils/connectDataBase.js';

export default async function operationCore(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const basePath = "/api/public/operation";
    const subPath = url.pathname.replace(basePath, "");
    // Prefixo da sua nova rota pública
    const publicServePrefix = "/api/public/assets/serve/";

    // POST: Criar Ordem e Jobs simultaneamente
    if (subPath.startsWith("/orders/create") && method === "POST") {

        try {
            const formData = await request.formData();
            const payloadStr = formData.get('payload');
            if (!payloadStr) throw new Error("Payload não encontrado.");

            const body = JSON.parse(payloadStr);

            // 1. Criar a Ordem
            const orderData = await dataBaseRequest("dashboard_orders", "POST", {
                client_name: body.client_name,
                client_phone: body.client_phone,
                order_status: 1,
                order_priority: 0,
            }, env);

            if (orderData instanceof Response) return orderData;
            const order = orderData[0];

            // 2. Criar o Job
            if (body.jobs && body.jobs.length > 0) {

                const job =
                    body.jobs[0];

                const insertedJob =
                    await dataBaseRequest("dashboard_jobs", "POST", {
                        order_uid: order.uid,
                        order_num: order.id_num,

                        product_title: job.product_title,

                        job_text_title: job.text_title || null,
                        job_text_font: job.text_font || null,
                        job_font_uid: job.font_uid || null,

                        job_figure_name: job.figure_name || null,
                        job_figure_url: job.figure_url || null,

                        job_observ: job.observation || null,
                        job_status: 1,
                        job_start_date: new Date().toISOString()
                    },
                        env
                    );

                if (insertedJob instanceof Response) {
                    await dataBaseRequest(
                        `dashboard_orders?uid=eq.${order.uid}`,
                        "DELETE",
                        null,
                        env
                    );

                    return insertedJob;

                }

                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${order.uid}`,
                    "PATCH",
                    {
                        order_list_jobs: [
                            insertedJob[0].uid
                        ]
                    },
                    env
                );

            }

            return new Response(JSON.stringify({ success: true, order_id: order.id_num }), {
                status: 201,
                headers: { "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error("[CREATE ERROR]:", error.message);

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

    // GET: Buscar OS do dia para Operation Core
    if (
        subPath.startsWith("/orders/search")
        && method === "GET"
    ) {

        try {

            /*
            =========================================================
            DATE
            =========================================================
            */

            let targetDate =
                url.searchParams.get("date");


            /*
            =========================================================
            DEFAULT TODAY
            =========================================================
            */

            if (!targetDate) {

                const now =
                    new Date();

                const offset =
                    now.getTimezoneOffset() * 60000;

                targetDate =
                    new Date(now - offset)
                        .toISOString()
                        .split("T")[0];

            }


            /*
            =========================================================
            LOAD ORDERS
            =========================================================
            */

            const orders =
                await dataBaseRequest(
                    `
                dashboard_orders
                ?select=*
                &order_created_at=gte.${targetDate}T00:00:00
                &order_created_at=lte.${targetDate}T23:59:59
                &order=id_num.desc
                `.replace(/\s+/g, ""),
                    "GET",
                    null,
                    env
                );


            if (orders instanceof Response) {
                return orders;
            }


            /*
            =========================================================
            EMPTY
            =========================================================
            */

            if (
                !orders
                || orders.length === 0
            ) {

                return new Response(
                    JSON.stringify([]),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

            }


            /*
            =========================================================
            ORDER UIDS
            =========================================================
            */

            const orderUids =
                orders.map(
                    order => order.uid
                );


            /*
            =========================================================
            LOAD JOBS
            =========================================================
            */

            const jobs =
                await dataBaseRequest(
                    `
                dashboard_jobs
                ?order_uid=in.(${orderUids.join(",")})
                &select=*
                `
                        .replace(/\s+/g, ""),
                    "GET",
                    null,
                    env
                );


            if (jobs instanceof Response) {
                return jobs;
            }


            /*
            =========================================================
            JOBS MAP
            =========================================================
            */

            const jobsMap =
                new Map();

            jobs.forEach(job => {

                jobsMap.set(
                    job.order_uid,
                    job
                );

            });


            /*
            =========================================================
            FORMAT
            =========================================================
            */

            const formatted =
                orders.map(order => {

                    const job =
                        jobsMap.get(order.uid);

                    return {

                        uid:
                            order.uid,

                        order_id:
                            order.id_num,

                        client_name:
                            order.client_name || "",

                        client_phone:
                            order.client_phone || "",

                        order_status:
                            order.order_status,

                        created_at:
                            order.order_created_at,

                        seller_name:
                            job?.job_observ
                                ?.split(":-")[0]
                                ?.replace(
                                    "Vendedor:",
                                    ""
                                )
                                ?.trim() || "",

                        observation:
                            job?.job_observ
                                ?.split(":-")[1]
                                ?.trim() || "",

                        product_title:
                            job?.product_title || "",

                        text:
                            job?.job_text_title || "",

                        font_uid:
                            job?.job_font_uid || null,

                        font_name:
                            job?.job_text_font || "",

                        figure_name:
                            job?.job_figure_name || "",

                        figure_url:
                            job?.job_figure_url || "",

                        job_uid:
                            job?.uid || null

                    };

                });


            /*
            =========================================================
            RESPONSE
            =========================================================
            */

            return new Response(
                JSON.stringify(formatted),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );

        } catch (error) {

            console.error(
                "[OPERATION SEARCH ERROR]",
                error
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Erro ao carregar OS"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }

    }

}
