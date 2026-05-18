/*
=========================================================
PUBLIC DIALOG ROUTER
=========================================================
*/

import { dataBaseRequest } from "../utils/connectDataBase.js";

export default async function apiPublicRouter(request, env) {

    const url = new URL(request.url);

    const method = request.method;

    const subPath = url.pathname.replace("/api/public/dialog/", "");

    const publicPrefix = "/api/public/assets/serve/";

    /*
    =========================================================
    FONTS
    =========================================================
    */

    if (subPath.startsWith("fonts/load") && method === "GET") {

        try {
            const fonts = await dataBaseRequest(
                `dashboard_fonts?select=uid,font_name,font_url,font_type&order=font_name.asc`,
                "GET",
                null,
                env
            );

            if (fonts instanceof Response)
                return fonts;

            const body = fonts.map(font => ({

                font_uid: font.uid,

                font_name: font.font_name,

                font_url: font.font_url ? `${publicPrefix}${font.font_url}?b=lib` : null,

                font_type: font.font_type

            }));


            return new Response(
                JSON.stringify(body),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=3600"
                    }
                }
            );

        } catch (error) {

            return new Response(
                JSON.stringify({
                    error: error.message
                }),
                {
                    status: 500
                }
            );

        }

    }


    /*
    =========================================================
    VECTORS / FIGURES
    =========================================================
    */

    if (subPath.startsWith("vectors/load") && method === "GET") {

        try {

            /*
            =========================================================
            LOAD FIGURES
            =========================================================
            */

            const figures = await dataBaseRequest(
                "dashboard_figures?select=*&order=figure_class.asc",
                "GET",
                null,
                env
            );

            if (figures instanceof Response) {
                return figures;
            }


            /*
            =========================================================
            GROUPED CATEGORIES
            =========================================================
            */

            const grouped = {};


            figures.forEach(fig => {

                /*
                =========================================
                SAFE CATEGORY
                =========================================
                */

                const category =
                    (
                        fig.figure_class ||
                        "Outros"
                    )
                        .trim()
                        .replace(/\s+/g, " ");


                /*
                =========================================
                NORMALIZE CATEGORY
                =========================================
                */

                const normalizedCategory =
                    category.length > 0

                        ? category
                            .toLowerCase()
                            .replace(
                                /\b\w/g,
                                l => l.toUpperCase()
                            )

                        : "Outros";


                /*
                =========================================
                CREATE CATEGORY
                =========================================
                */

                if (!grouped[normalizedCategory]) {

                    grouped[normalizedCategory] = [];

                }


                /*
                =========================================
                FIGURE URL
                =========================================
                */

                let figureUrl =
                    "/assets/default-vector.png";


                if (
                    fig.figure_url
                    && typeof fig.figure_url === "string"
                ) {

                    figureUrl =
                        `${publicPrefix}${fig.figure_url}?b=lib`;

                }


                /*
                =========================================
                PUSH FIGURE
                =========================================
                */

                grouped[normalizedCategory].push({

                    figure_uid: fig.uid,

                    figure_name:
                        fig.figure_name || "Sem nome",

                    figure_class:
                        normalizedCategory,

                    figure_url:
                        figureUrl

                });

            });


            /*
            =========================================================
            DEBUG
            =========================================================
            */

            console.log(
                "[PUBLIC VECTORS]",
                JSON.stringify(grouped, null, 2)
            );


            /*
            =========================================================
            RESPONSE
            =========================================================
            */

            return new Response(
                JSON.stringify(grouped),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store"
                    }
                }
            );


            // return new Response(
            //     JSON.stringify(grouped),
            //     {
            //         status: 200,
            //         headers: {
            //             "Content-Type": "application/json",
            //             "Cache-Control": "public, max-age=3600"
            //         }
            //     }
            // );

        } catch (error) {

            console.error(
                "[PUBLIC VECTORS ERROR]",
                error
            );

            return new Response(
                JSON.stringify({
                    error: error.message
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

        }

    }

    // POST: Criar Ordem + Job
    if (
        subPath.startsWith("/orders/create")
        && method === "POST"
    ) {

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


            /*
            =========================================
            PARSE BODY
            =========================================
            */

            const body =
                JSON.parse(payloadStr);


            /*
            =========================================
            VALIDATE
            =========================================
            */

            if (
                !body.client_name
                || !body.client_phone
            ) {

                return new Response(
                    JSON.stringify({
                        error:
                            "Cliente e contato são obrigatórios."
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            }


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
                            0,

                        order_created_at:
                            new Date().toISOString()
                    },
                    env
                );


            /*
            =========================================
            ORDER ERROR
            =========================================
            */

            if (orderData instanceof Response) {

                return orderData;

            }

            if (
                !Array.isArray(orderData)
                || !orderData.length
            ) {

                throw new Error(
                    "Falha ao criar ordem."
                );

            }


            /*
            =========================================
            ORDER DATA
            =========================================
            */

            const order =
                orderData[0];


            /*
            =========================================
            SAFE JOB
            =========================================
            */

            const job =
                (
                    body.jobs
                    && body.jobs.length > 0
                )

                    ? body.jobs[0]

                    : null;


            if (!job) {

                /*
                =====================================
                DELETE EMPTY ORDER
                =====================================
                */

                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${order.uid}`,
                    "DELETE",
                    null,
                    env
                );

                throw new Error(
                    "Nenhum job enviado."
                );

            }


            /*
            =========================================
            CREATE JOB
            =========================================
            */

            const jobData =
                await dataBaseRequest(
                    "dashboard_jobs",
                    "POST",
                    {
                        order_uid:
                            order.uid,

                        order_num:
                            order.id_num,

                        product_title:
                            job.product_title || null,

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

            if (jobData instanceof Response) {

                /*
                =====================================
                ROLLBACK ORDER
                =====================================
                */

                await dataBaseRequest(
                    `dashboard_orders?uid=eq.${order.uid}`,
                    "DELETE",
                    null,
                    env
                );

                return jobData;

            }

            if (
                !Array.isArray(jobData)
                || !jobData.length
            ) {

                throw new Error(
                    "Falha ao criar job."
                );

            }


            /*
            =========================================
            JOB DATA
            =========================================
            */

            const insertedJob =
                jobData[0];


            /*
            =========================================
            UPDATE ORDER JOB LIST
            =========================================
            */

            const updateOrder =
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


            if (updateOrder instanceof Response) {

                throw new Error(
                    "Falha ao atualizar lista de jobs."
                );

            }


            /*
            =========================================
            RESPONSE
            =========================================
            */

            return new Response(
                JSON.stringify({

                    success: true,

                    order: {

                        uid:
                            order.uid,

                        id_num:
                            order.id_num,

                        client_name:
                            order.client_name,

                        client_phone:
                            order.client_phone

                    },

                    job: {

                        uid:
                            insertedJob.uid,

                        product_title:
                            insertedJob.product_title,

                        job_text_title:
                            insertedJob.job_text_title,

                        job_text_font:
                            insertedJob.job_text_font,

                        job_figure_name:
                            insertedJob.job_figure_name,

                        job_figure_url:
                            insertedJob.job_figure_url,

                        job_observ:
                            insertedJob.job_observ

                    }

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
                "[CREATE ORDER ERROR]",
                error
            );

            return new Response(
                JSON.stringify({
                    error:
                        error.message ||
                        "Erro interno."
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


    /*
    =========================================================
    NOT FOUND
    =========================================================
    */

    return new Response(
        JSON.stringify({
            error: "Route not found"
        }),
        {
            status: 404,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

}
