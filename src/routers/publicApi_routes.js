import login from "../auth/login.js";
import register from "../auth/register.js";
import logout from "../auth/logout.js";


export default async function apiPublicRouter(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    //  ======================================================================
    //  Area de Autenticação
    //  ======================================================================
    // Rota: Login
    if (url.pathname === "/api/public/auth/login" && method === "POST") {
        return await login(request, env);
    }

    // Rota: Cadastro (desativada por enquanto, pois apenas o administrador pode criar novos usuários)
    // if (url.pathname === "/public_api/auth/register" && method === "POST") {
    //     return await register(request, env);
    // }

    // Rota: Logout
    if (url.pathname === "/api/public/auth/logout" && method === "POST") {
        return await logout(request, env);
    }
    //  ======================================================================
    // Rota de Teste para verificar o banco
    if (url.pathname === "/api/public/test-db" && method === "GET") {
        return new Response(JSON.stringify({ status: "Conexão OK" }), { status: 200 });
    }

    // Se nenhuma rota bater
    return new Response(JSON.stringify({ error: "Rota de API não mapeada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
    });
}
