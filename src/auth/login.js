import createToken from "./createToken.js";

export default async function login(request, env) {
    try {
        const url = new URL(request.url);
        const url_pathname = url.pathname;

        if (url_pathname.startsWith("/api/private")) {
            const clonedRequest = request.clone();
            const { email, password } = await clonedRequest.json();

            // Tabela de login do staff no supabase
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

            if (!user) {
                return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }

            // Verifique se o nome da coluna de senha é 'password' ou 'senha'
            if (user.password !== password) {
                return new Response(JSON.stringify({ error: "Senha incorreta" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }

            const token = await createToken(user.uid, env);

            return new Response(
                JSON.stringify({
                    success: true,
                    user_id: user.uid,
                    state_account: user.state_account
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
        if (url_pathname.startsWith("/api/public")) {
            // Aqui você pode implementar a lógica de login para rotas públicas, se necessário.
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
