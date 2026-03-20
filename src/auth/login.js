import { dataBaseRequest } from "../utils/connectDataBase.js";
import createToken from "./createToken.js";
import { getUserPermissions } from "./permissions.js";
import verifyAuth from "../auth/verifyAuth.js";// Importando o novo módulo


export default async function login(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const url_pathname = (url.pathname).replace("/api/private/auth/", "");
    console.log(url_pathname);
    console.log(method);

    try {
        if (url_pathname.startsWith("login") && method === "POST") {
            const body = await request.json();
            const { email, password } = body;
            // Busca completa do usuário incluindo colunas de permissão
            const response = await dataBaseRequest(`auth_staff?email=eq.${encodeURIComponent(email)}&select=*`, "GET", null, env)

            if (response instanceof Response || !response) {
                throw new Error("Erro ao buscar usuários");
            }

            const user = response[0];

            if (!user || !user.enable_account) { // Já checa se está habilitado
                console.log("Acesso negado ou conta desativada");
                return new Response(JSON.stringify({ error: "Acesso negado ou conta desativada" }), {
                    status: 401, headers: { "Content-Type": "application/json" }
                });
            }

            if (user.password !== password) {
                return new Response(JSON.stringify({ error: "Senha incorreta" }), {
                    status: 401, headers: { "Content-Type": "application/json" }
                });
            }

            // --- LÓGICA DE PERMISSÕES INTEGRADA ---
            const access = getUserPermissions(user);
            const token = await createToken(user.uid, env);

            // O Front recebe o token E o HTML das seções de uma vez só
            return new Response(
                JSON.stringify({
                    success: true,
                    user_info: access,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                }
            );
        }

        if (url_pathname.startsWith("update-password") && method === "PATCH") {
            const { newPassword } = await request.json();

            if (!newPassword) {
                return new Response(JSON.stringify({ error: "Nova senha inválida" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // 🔐 valida sessão atual
            const auth = await verifyAuth(request, env);

            if (!auth.ok) {
                return new Response(
                    JSON.stringify({ error: auth.error }),
                    { status: auth.status }
                );
            }

            const uid = auth.uid;
            if (!uid) {
                return new Response(
                    JSON.stringify({ error: "UID inválido" }),
                    { status: 401 }
                );
            }

            // 🔐 atualiza senha no banco

            const response = dataBaseRequest(`auth_staff?uid=eq.${encodeURIComponent(uid)}`, "PATCH", {
                password: newPassword,
                state_account: true
            }, env);

            const data = await response;
            if (!response.ok) {
                return new Response(
                    JSON.stringify({ error: data?.error || "Erro ao atualizar senha" }),
                    { status: response.status, headers: { "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: "Senha atualizada com sucesso" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }
    }
    catch (error) {
        console.error("Erro ao fazer login:", error);
        return new Response(
            JSON.stringify({ error: "Erro ao fazer login" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
