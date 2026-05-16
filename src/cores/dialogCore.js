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
            "dashboard_figures?select=uid,figure_name,figure_class,figure_url&order=figure_class.asc,figure_name.asc",
            "GET",
            null,
            env
        );

        if (figures instanceof Response) {
            return figures;
        }


        /*
        =========================================================
        EMPTY RESPONSE
        =========================================================
        */

        if (
            !Array.isArray(figures)
            || figures.length === 0
        ) {

            return new Response(
                JSON.stringify({}),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "public, max-age=3600"
                    }
                }
            );

        }


        /*
        =========================================================
        GROUP BY CATEGORY
        =========================================================
        */

        const grouped = {};


        figures.forEach(fig => {

            /*
            =========================================
            SAFE CATEGORY
            =========================================
            */

            const rawCategory =
                typeof fig.figure_class === "string"
                    ? fig.figure_class
                    : "Outros";


            /*
            =========================================
            NORMALIZE CATEGORY
            =========================================
            */

            const category =
                rawCategory
                    .trim()
                    .replace(/\s+/g, " ");


            const normalizedCategory =
                category.charAt(0).toUpperCase() +
                category.slice(1).toLowerCase();


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
            SAFE IMAGE URL
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
            "[PUBLIC VECTORS LOAD ERROR]",
            error
        );

        return new Response(
            JSON.stringify({
                error: error.message || "Erro interno"
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
