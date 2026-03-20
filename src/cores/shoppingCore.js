import { dataBaseRequest } from "../utils/connectDataBase.js"; // Ajuste o path conforme seu projeto

export default async function shoppingCore(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const subPath = url.pathname.replace("/api/public/shopping/", "");
    const publicPrefix = "/api/public/assets/serve/";

    // GET: Listar catálogo de produtos
    if (subPath === "list" && method === "GET") {
        try {
            // Filtro: estoque > 0 e ordenação por título
            const endpoint = "dashboard_products?select=*&product_stock_now=gt.0&order=product_title.asc";

            const products = await dataBaseRequest(endpoint, "GET", null, env);

            if (products instanceof Response) return products;
            const catalog = products.map(p => ({
                id: p.uid,
                nome: p.product_title,
                cor: p.product_color,
                preco: parseFloat(p.product_price_sell) || 0, // Usei o preço de venda
                estoque: p.product_stock_now, // Enviando a quantidade para o front
                img: p.product_image_sale ? `${publicPrefix}${p.product_image_sale}?b=lib` : ""
            }));

            return new Response(JSON.stringify(catalog), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: "Endpoint de shopping não encontrado" }), { status: 404 });
}
