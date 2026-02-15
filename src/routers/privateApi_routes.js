import login from "../auth/login.js";
import updatePassword from "../auth/updatePassword.js";
import verifyAuth from "../auth/verifyAuth.js";
// import register from "../auth/register.js";

import dashboardCore from "../cores/dashboardCore.js";


export default async function apiPrivateRouter(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    console.log(`Rota Acessada: ${url.pathname} | Método: ${method}`);

    //  ======================================================================
    //  Area de Autenticação
    //  ======================================================================
    // Rota: Login
    if (url.pathname === "/api/private/auth/login" && method === "POST") {
        return await login(request, env);
    }
    // Rota: Atualizar senha
    if (url.pathname === "/api/private/auth/update-password" && method === "POST") {
        return await updatePassword(request, env);
    }

    if (url.pathname === "/api/private/auth/check" && method === "GET") {
        const auth = await verifyAuth(request, env);
        if (!auth.ok) {
            return new Response(JSON.stringify({ ok: false, error: auth.error }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Retorna sucesso e os dados do usuário para o Dash (nome, email, etc)
        const responseData = { ok: true, user: auth.user };
        const response = new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

        // Se o token foi renovado no processo, avisa o front
        if (auth.refreshed) {
            response.headers.set('X-New-Token-Expires', auth.expires_at);
        }

        return response;
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
    //  ======================================================================
    // Rotas de Gerenciamento do Dashboard
    if (url.pathname.startsWith("/api/private/dashboard")) {
        return await dashboardCore(request, env);
    }


    //  ======================================================================
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
