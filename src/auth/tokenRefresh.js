// tokenRefresh.js (Cloudflare Worker compatible)

export default async function tokenRefresh(uid, env) {
    if (!uid) {
        return { ok: false, status: 400, error: 'missing_user_id' };
    }

    // Gerando a nova expiração (Agora + 10 minutos)
    const now = new Date();
    // Usamos o seu padrão de compensação +03:00 para manter a consistência no banco
    const newExpiration = (new Date(now.getTime() + 10 * 60 * 1000)).toISOString().replace('Z', '+03:00');

    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(uid)}`;

    try {
        const response = await fetch(supabaseUrl, {
            method: 'PATCH',
            headers: {
                "apikey": env.SUPABASE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                token_time: newExpiration // Confirmado conforme o seu verifyAuth
            })
        });

        if (!response.ok) {
            console.error(`Refresh failed for UID ${uid}: ${response.statusText}`);
        }

        return {
            ok: response.ok,
            status: response.status,
            expires_at: newExpiration // Retornamos para o verifyAuth saber a nova data e repassar ao cliente
        };
    } catch (error) {
        console.error("Token Refresh Exception:", error);
        return { ok: false, status: 500, error: error.message };
    }
}
