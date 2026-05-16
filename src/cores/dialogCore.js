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

            const figures = await dataBaseRequest(
                `dashboard_figures?select=uid,figure_name,figure_class,figure_url&order=figure_class.asc,figure_name.asc`,
                "GET",
                null,
                env
            );

            if (figures instanceof Response)
                return figures;


            /*
            =========================================
            GROUPED CATEGORIES
            =========================================
            */

            const grouped = {};

            figures.forEach(fig => {

                const category =
                    (
                        fig.figure_class ||
                        "Outros"
                    )
                    .trim();

                if (!grouped[category]) {
                    grouped[category] = [];
                }

                grouped[category].push({

                    figure_uid: fig.uid,

                    figure_name: fig.figure_name,

                    figure_class: fig.figure_class,

                    figure_url:
                        fig.figure_url
                            ? `${publicPrefix}${fig.figure_url}?b=lib`
                            : "/assets/default-vector.png"

                });

            });


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
