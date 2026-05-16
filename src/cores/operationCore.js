/*
=====================================================================
PUBLIC CREATE ORDER + JOB
1 ORDER = 1 JOB
STATUS = APROVADA
=====================================================================
*/

if (
    subPath.startsWith("/public/operator/order/create")
    && method === "POST"
) {

    const uploadedImages = [];

    try {

        /*
        =============================================================
        FORM DATA
        =============================================================
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
        =============================================================
        VALIDATION
        =============================================================
        */

        if (
            !body.client_name
            || !body.client_phone
        ) {

            throw new Error(
                "Cliente e contato são obrigatórios."
            );

        }


        /*
        =============================================================
        CREATE ORDER
        STATUS:
        1 = APROVADA
        =============================================================
        */

        const createdOrder =
            await dataBaseRequest(

                "dashboard_orders",

                "POST",

                {

                    client_name:
                        body.client_name,

                    client_phone:
                        body.client_phone,

                    client_address:
                        body.client_address || null,

                    order_origin:
                        "OPERADOR",

                    order_priority:
                        1,

                    order_status:
                        1,

                    order_delivery_date:
                        body.order_delivery_date || null

                },

                env

            );


        if (
            createdOrder instanceof Response
        ) {

            return createdOrder;

        }


        const order =
            createdOrder[0];


        /*
        =============================================================
        IMAGE
        =============================================================
        */

        let uploadedImageUrl =
            null;

        const file =
            formData.get("file");

        if (
            file
            && file instanceof File
            && file.size > 0
        ) {

            uploadedImageUrl =
                await uploadImage(
                    file,
                    "sale",
                    env
                );

            if (!uploadedImageUrl) {

                throw new Error(
                    "Falha no upload da imagem."
                );

            }

            uploadedImages.push(
                uploadedImageUrl
            );

        }


        /*
        =============================================================
        CREATE JOB
        STATUS:
        1 = APROVADO
        =============================================================
        */

        const createdJob =
            await dataBaseRequest(

                "dashboard_jobs",

                "POST",

                {

                    order_uid:
                        order.uid,

                    order_num:
                        order.id_num,


                    /*
                    ==========================================
                    PRODUCT
                    ==========================================
                    */

                    product_uid:
                        body.product_uid || null,

                    product_title:
                        body.product_title || null,

                    product_color:
                        body.product_color || null,


                    /*
                    ==========================================
                    TEXT
                    ==========================================
                    */

                    job_text_title:
                        body.job_text_title || null,

                    job_text_font:
                        body.job_text_font || null,

                    job_font_uid:
                        body.job_font_uid || null,


                    /*
                    ==========================================
                    VECTOR
                    ==========================================
                    */

                    job_figure_uid:
                        body.job_figure_uid || null,

                    job_figure_name:
                        body.job_figure_name || null,

                    job_figure_url:
                        body.job_figure_url || null,


                    /*
                    ==========================================
                    IMAGE
                    ==========================================
                    */

                    job_image_url_reference:
                        uploadedImageUrl,


                    /*
                    ==========================================
                    OBS
                    ==========================================
                    */

                    job_observ:
                        body.job_observ || null,


                    /*
                    ==========================================
                    STATUS
                    ==========================================
                    */

                    job_status:
                        1,

                    job_start_date:
                        new Date().toISOString()

                },

                env

            );


        /*
        =============================================================
        JOB ERROR
        =============================================================
        */

        if (
            createdJob instanceof Response
        ) {

            /*
            ==========================================
            DELETE ORDER
            ==========================================
            */

            await dataBaseRequest(

                `dashboard_orders?uid=eq.${order.uid}`,

                "DELETE",

                null,

                env

            );


            /*
            ==========================================
            DELETE IMAGE
            ==========================================
            */

            if (uploadedImageUrl) {

                await deleteFromBucket(
                    uploadedImageUrl,
                    "sale",
                    env
                );

            }

            return createdJob;

        }


        const job =
            createdJob[0];


        /*
        =============================================================
        UPDATE ORDER
        =============================================================
        */

        await dataBaseRequest(

            `dashboard_orders?uid=eq.${order.uid}`,

            "PATCH",

            {

                order_list_jobs: [
                    job.uid
                ]

            },

            env

        );


        /*
        =============================================================
        SUCCESS
        =============================================================
        */

        return new Response(

            JSON.stringify({

                success: true,

                order_uid:
                    order.uid,

                order_id:
                    order.id_num,

                job_uid:
                    job.uid

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
            "[PUBLIC OPERATOR CREATE ERROR]:",
            error.message
        );


        /*
        =============================================================
        CLEANUP
        =============================================================
        */

        if (
            uploadedImages.length > 0
        ) {

            const cleanup =
                uploadedImages.map(url =>

                    deleteFromBucket(
                        url,
                        "sale",
                        env
                    )

                );

            await Promise.allSettled(
                cleanup
            );

        }


        return new Response(

            JSON.stringify({

                error:
                    error.message

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
