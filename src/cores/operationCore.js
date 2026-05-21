import { dataBaseRequest } from '../utils/connectDataBase.js';

export default async function operationCore(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const basePath = "/api/public/operation";
    const subPath = url.pathname.replace(basePath, "");
    // Prefixo da sua nova rota pública
    const publicServePrefix = "/api/public/assets/serve/";

    // POST: Criar Ordem e Job simultaneamente
    if (subPath.startsWith("/orders/create") && method === "POST") {

        try {

            /*
            =========================================
            FORM DATA
            =========================================
            */

            const formData =
                await request.formData();

            const payloadStr =
                formData.get("payload");

            if (!payloadStr) {

                throw new Error(
                    "Payload não encontrado."
                );

            }

            const body =
                JSON.parse(payloadStr);


            /*
            =========================================
            CREATE ORDER
            =========================================
            */

            const orderData =
                await dataBaseRequest(
                    "dashboard_orders",
                    "POST",
                    {
                        client_name:
                            body.client_name,

                        client_phone:
                            body.client_phone,

                        order_status:
                            1,

                        order_priority:
                            0
                    },
                    env
                );

            if (orderData instanceof Response) {

                return orderData;

            }

            const order =
                orderData[0];


            /*
            =========================================
            VALIDATE JOB
            =========================================
            */

            if (
                !body.jobs
                || !Array.isArray(body.jobs)
                || body.jobs.length === 0
            ) {

                throw new Error(
                    "Nenhum job enviado."
                );

            }

            const job =
                body.jobs[0];


            /*
            =========================================
            CREATE JOB
            =========================================
            */

            const insertedJobData =
                await dataBaseRequest(
                    "dashboard_jobs",
                    "POST",
                    {
                        order_uid:
                            order.uid,

                        order_num:
                            order.id_num,

                        product_title:
                            job.product_title,

                        job_text_title:
                            job.text_title || null,

                        job_text_font:
                            job.text_font || null,

                        job_font_uid:
                            job.font_uid || null,

                        job_figure_name:
                            job.figure_name || null,

                        job_figure_url:
                            job.figure_url || null,

                        job_observ:
                            job.observation || null,

                        job_status:
                            1,

                        job_start_date:
                            new Date().toISOString()
                    },
                    env
                );

            /*
            =========================================
            JOB ERROR
            =========================================
            */

            if (
                insertedJobData instanceof Response
            ) {

                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${order.uid}`,
                    "DELETE",
                    null,
                    env
                );

                return insertedJobData;

            }

            const insertedJob =
                insertedJobData[0];


            /*
            =========================================
            UPDATE ORDER JOB LIST
            =========================================
            */

            await dataBaseRequest(
                `dashboard_orders?uid=eq.${order.uid}`,
                "PATCH",
                {
                    order_list_jobs: [
                        insertedJob.uid
                    ]
                },
                env
            );


            /*
            =========================================
            SUCCESS RESPONSE
            =========================================
            */

            return new Response(
                JSON.stringify({

                    success: true,

                    uid:
                        insertedJob.uid,

                    created_at:
                        insertedJob.created_at,

                    client_name:
                        order.client_name,

                    client_phone:
                        order.client_phone,

                    product_title:
                        insertedJob.product_title,

                    text:
                        insertedJob.job_text_title,

                    font_name:
                        insertedJob.job_text_font,

                    figure_name:
                        insertedJob.job_figure_name,

                    figure_url:
                        insertedJob.job_figure_url,

                    obs:
                        insertedJob.job_observ

                }),
                {
                    status: 201,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        } catch (error) {

            console.error(
                "[CREATE ERROR]:",
                error
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Erro interno: "
                        + error.message
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

    // PATCH: Atualizar Ordem e Job
    if (subPath.startsWith("/orders/update") && method === "PATCH") {

        try {

            /*
            =========================================
            FORM DATA
            =========================================
            */

            const formData =
                await request.formData();

            const payloadStr =
                formData.get("payload");

            const jobUid =
                formData.get("uid");

            if (!payloadStr) {

                throw new Error(
                    "Payload não encontrado."
                );

            }

            if (!jobUid) {

                throw new Error(
                    "UID do job não informado."
                );

            }

            const body =
                JSON.parse(payloadStr);


            /*
            =========================================
            FIND CURRENT JOB
            =========================================
            */

            const currentJobData =
                await dataBaseRequest(
                    `dashboard_jobs?uid=eq.${jobUid}`,
                    "GET",
                    null,
                    env
                );

            if (
                currentJobData instanceof Response
            ) {

                return currentJobData;

            }

            if (
                !Array.isArray(currentJobData)
                || currentJobData.length === 0
            ) {

                throw new Error(
                    "Job não encontrado."
                );

            }

            const currentJob =
                currentJobData[0];


            /*
            =========================================
            FIND ORDER
            =========================================
            */

            const orderUid =
                currentJob.order_uid;

            const currentOrderData =
                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${orderUid}`,
                    "GET",
                    null,
                    env
                );

            if (
                currentOrderData instanceof Response
            ) {

                return currentOrderData;

            }

            if (
                !Array.isArray(currentOrderData)
                || currentOrderData.length === 0
            ) {

                throw new Error(
                    "Ordem não encontrada."
                );

            }

            const currentOrder =
                currentOrderData[0];


            /*
            =========================================
            VALIDATE JOB
            =========================================
            */

            if (
                !body.jobs
                || !Array.isArray(body.jobs)
                || body.jobs.length === 0
            ) {

                throw new Error(
                    "Nenhum job enviado."
                );

            }

            const job =
                body.jobs[0];


            /*
            =========================================
            UPDATE JOB
            =========================================
            */

            const updatedJobData =
                await dataBaseRequest(
                    `dashboard_jobs?uid=eq.${jobUid}`,
                    "PATCH",
                    {

                        product_title:
                            job.product_title,

                        job_text_title:
                            job.text_title || null,

                        job_text_font:
                            job.text_font || null,

                        job_font_uid:
                            job.font_uid || null,

                        job_figure_name:
                            job.figure_name || null,

                        job_figure_url:
                            job.figure_url || null,

                        job_observ:
                            job.observation || null

                    },
                    env
                );

            if (
                updatedJobData instanceof Response
            ) {

                return updatedJobData;

            }


            /*
            =========================================
            UPDATE ORDER
            =========================================
            */

            const updatedOrderData =
                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${orderUid}`,
                    "PATCH",
                    {

                        client_name:
                            body.client_name,

                        client_phone:
                            body.client_phone

                    },
                    env
                );

            if (
                updatedOrderData instanceof Response
            ) {

                return updatedOrderData;

            }


            /*
            =========================================
            GET UPDATED JOB
            =========================================
            */

            const finalJobData =
                await dataBaseRequest(
                    `dashboard_jobs?uid=eq.${jobUid}`,
                    "GET",
                    null,
                    env
                );

            if (
                finalJobData instanceof Response
            ) {

                return finalJobData;

            }

            const finalJob =
                finalJobData[0];


            /*
            =========================================
            SUCCESS RESPONSE
            =========================================
            */

            return new Response(
                JSON.stringify({

                    success: true,

                    uid:
                        finalJob.uid,

                    created_at:
                        finalJob.created_at,

                    client_name:
                        body.client_name,

                    client_phone:
                        body.client_phone,

                    product_title:
                        finalJob.product_title,

                    text:
                        finalJob.job_text_title,

                    font_name:
                        finalJob.job_text_font,

                    figure_name:
                        finalJob.job_figure_name,

                    figure_url:
                        finalJob.job_figure_url,

                    obs:
                        finalJob.job_observ

                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        } catch (error) {

            console.error(
                "[UPDATE ERROR]:",
                error
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Erro interno: "
                        + error.message
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

    // DELETE: Remover Ordem e Job
    if (
        subPath.startsWith("/orders/delete")
        && method === "DELETE"
    ) {

        try {

            /*
            =========================================
            URL PARAMS
            =========================================
            */

            const jobUid =
                url.searchParams.get("uid");

            if (!jobUid) {

                throw new Error(
                    "UID do job não informado."
                );

            }


            /*
            =========================================
            FIND JOB
            =========================================
            */

            const currentJobData =
                await dataBaseRequest(
                    `dashboard_jobs?uid=eq.${jobUid}`,
                    "GET",
                    null,
                    env
                );

            if (
                currentJobData instanceof Response
            ) {

                return currentJobData;

            }

            if (
                !Array.isArray(currentJobData)
                || currentJobData.length === 0
            ) {

                throw new Error(
                    "Job não encontrado."
                );

            }

            const currentJob =
                currentJobData[0];

            const orderUid =
                currentJob.order_uid;


            /*
            =========================================
            DELETE JOB
            =========================================
            */

            const deleteJob =
                await dataBaseRequest(
                    `dashboard_jobs?uid=eq.${jobUid}`,
                    "DELETE",
                    null,
                    env
                );

            if (
                deleteJob instanceof Response
            ) {

                return deleteJob;

            }


            /*
            =========================================
            DELETE ORDER
            =========================================
            */

            const deleteOrder =
                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${orderUid}`,
                    "DELETE",
                    null,
                    env
                );

            if (
                deleteOrder instanceof Response
            ) {

                throw new Error(
                    "Job removido, mas houve falha ao remover a ordem."
                );

            }


            /*
            =========================================
            SUCCESS
            =========================================
            */

            return new Response(
                JSON.stringify({

                    success: true,

                    deleted_job_uid:
                        jobUid,

                    deleted_order_uid:
                        orderUid

                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        } catch (error) {

            console.error(
                "[DELETE ERROR]:",
                error
            );

            return new Response(
                JSON.stringify({
                    error:
                        "Erro interno: "
                        + error.message
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

    // GET: Buscar OS do dia para Operation Core
    if (subPath.startsWith("/orders/search") && method === "GET") {

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
                            job?.uid || null,

                        obs: job?.job_observ || null,

                        status: job?.job_status || null

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
