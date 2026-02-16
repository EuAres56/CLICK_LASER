import verifyAuth from "./verifyAuth.js";
export default async function updatePassword(request, env) {
    try {
        const url = new URL(request.url);
        const url_pathname = url.pathname;

        if (url_pathname.startsWith("/api/private")) {
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
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(uid)}`;

            const response = await fetch(supabaseUrl, {
                method: "PATCH",
                headers: {
                    "apikey": env.SUPABASE_KEY,
                    "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    password: newPassword,
                    state_account: true
                })
            });

            const data = await response.json();
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

    } catch (error) {
        console.error("Erro ao atualizar senha:", error);
        return new Response(
            JSON.stringify({ error: "Erro interno ao validar dados" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }


}
