import apiPrivateRouter from "./routers/privateApi_routes.js";
import apiPublicRouter from "./routers/publicApi_routes.js";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const method = request.method;

        // Se for API entra nos routers
        if (url.pathname.startsWith("/api/private")) {
            return await apiPrivateRouter(request, env);
        }

        // Se for API entra nos routers
        if (url.pathname.startsWith("/api/public")) {
            return await apiPublicRouter(request, env);
        }

        // 2. TRATAMENTO DE ASSETS (HTML, CSS, JS)
        // Se não for uma das rotas de API acima, o Cloudflare busca o arquivo na pasta 'public'
        try {
            const response = await env.ASSETS.fetch(request);

            // Se o arquivo existe (200, 304, etc), entrega ele (CSS, JS, Imagens, etc)
            if (response.status !== 404) {
                return response;
            }

            // SE CHEGOU AQUI, O ARQUIVO NÃO EXISTE (404)
            // Para não mostrar erro ao usuário, mandamos para o shopping
            const shoppingPath = "/shopping.html"; // Ajuste aqui para o nome do seu arquivo atual

            // Evita redirecionar se o usuário já estiver tentando acessar o próprio shopping e ele der erro
            if (url.pathname !== shoppingPath) {
                return Response.redirect(new URL(shoppingPath, url.origin).toString(), 302);
            }

        } catch (e) {
            console.error("Erro ao carregar asset:", e);
        }

        // 5. FALLBACK FINAL (Se até o shopping.html sumir do bucket)
        return new Response("Sistema em manutenção. Volte logo!", { status: 503 });
    }
}
