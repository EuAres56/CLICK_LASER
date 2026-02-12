import login from "../auth/login.js";
import updatePassword from "../auth/updatePassword.js";
// import register from "../auth/register.js";


export default async function apiPrivateRouter(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    //  ======================================================================
    //  Area de Autenticação
    //  ======================================================================
    // Rota: Login
    if (url.pathname === "/api/private/auth/login" || url.pathname === "/api/public/auth/login" && method === "POST") {
        return await login(request, env);
    }
    // Rota: Atualizar senha
    if (url.pathname === "/api/private/auth/update-password" && method === "POST") {
        return await updatePassword(request, env);
    }

    // Rota: Cadastro (desativada por enquanto, pois apenas o administrador pode criar novos usuários)
    // if (url.pathname === "/public_api/auth/register" && method === "POST") {
    //     return await register(request, env);
    // }

    // Rota: Logout
    if (url.pathname === "/api/private/auth/logout" && method === "POST") {
        return await logout(request, env);
    }
    //  ======================================================================
    // Rota de Teste para verificar o banco
    if (url.pathname === "/api/private/test-db" && method === "GET") {
        return new Response(JSON.stringify({ status: "Conexão OK" }), { status: 200 });
    }

    // Se nenhuma rota bater
    return new Response(JSON.stringify({ error: "Rota de API não mapeada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
    });
}
