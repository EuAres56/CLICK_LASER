import createToken from "./createToken.js";
import { getUserPermissions } from "./permissions.js"; // Importando o novo módulo

export default async function login(request, env) {
    try {
        const url = new URL(request.url);
        const url_pathname = url.pathname;

        if (url_pathname.startsWith("/api/private")) {
            const clonedRequest = request.clone();
            const { email, password } = await clonedRequest.json();

            // Busca completa do usuário incluindo colunas de permissão
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/auth_staff?email=eq.${encodeURIComponent(email)}&select=*`;

            const response = await fetch(supabaseUrl, {
                method: "GET",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Accept": "application/json"
                }
            });

            const data = await response.json();
            const user = data[0];

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
        return new Response(JSON.stringify({ error: "Rota pública de login não implementada" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.error("Erro no processo:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
