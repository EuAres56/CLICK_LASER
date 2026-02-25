// tokenRefresh.js

export default async function tokenRefresh(uid, env) {
    if (!uid) {
        return { ok: false, status: 400, error: 'missing_user_id' };
    }

    const now = new Date();
    const newExpiration = new Date(now.getTime() + 10 * 60 * 1000);

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
                token_time: newExpiration // Verifique se é 'token_time' ou 'time_auth'
            })
        });

        return {
            ok: response.ok,
            status: response.status,
            expires_at: newExpiration // Retornamos para o verifyAuth saber a nova data
        };
    } catch (error) {
        return { ok: false, status: 500, error: error.message };
    }
}
