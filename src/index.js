import apiPrivateRouter from "./routers/privateApi_routes.js";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const method = request.method;

        // Se for API entra nos routers
        if (url.pathname.startsWith("/api/")) {
            return await apiPrivateRouter(request, env);
        }


        // 2. TRATAMENTO DE ASSETS (HTML, CSS, JS)
        // Se não for uma das rotas de API acima, o Cloudflare busca o arquivo na pasta 'public'
        try {
            const response = await env.ASSETS.fetch(request);

            // Se o arquivo existir (status 200 ou 304), retorna ele
            if (response.status !== 404) {
                return response;
            }
        } catch (e) {
            console.error("Erro ao carregar asset:", e);
        }

        // 5. FALLBACK FINAL (Se não for API nem Arquivo)
        return new Response("Página ou Rota não encontrada", { status: 404 });
    }
};
