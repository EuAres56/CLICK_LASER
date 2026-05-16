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
            console.log(
                "[RAW FIGURES ARRAY]",
                JSON.stringify(figures, null, 2)
            );

            console.log(
                "[TOTAL FIGURES]",
                figures.length
            );

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

if (
    subPath.startsWith("vectors/load")
    && method === "GET"
) {

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
                    "Cache-Control": "public, max-age=3600"
                }
            }
        );

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
