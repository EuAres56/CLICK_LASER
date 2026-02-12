import tokenRefresh from './tokenRefresh.js';

// verifyAuth.js (Cloudflare Worker compatible)

async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export default async function verifyAuth(request, env) {

    const authHeader = request.headers.get('Authorization');
    const userId = request.headers.get('X-User-Id');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { ok: false, status: 401, error: 'Token não informado' };
    }

    if (!userId) {
        return { ok: false, status: 401, error: 'ID do usuário não informado' };
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
        return { ok: false, status: 401, error: 'Token inválido' };
    }

    // 🔎 consulta usuário
    const supabaseUrl =
        `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(userId)}&select=uid,token_key,token_time`;

    const response = await fetch(supabaseUrl, {
        headers: {
            "apikey": env.SUPABASE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_KEY}`,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        return { ok: false, status: 500, error: 'Erro ao consultar usuário' };
    }

    const data = await response.json();

    if (!data.length) {
        return { ok: false, status: 401, error: 'Usuário não encontrado' };
    }

    const { token_key, token_time, uid } = data[0];

    if (!token_key || !token_time) {
        return { ok: false, status: 401, error: 'Sessão inválida' };
    }

    const expiresAt = new Date(token_time).getTime();
    const now = Date.now();

    if (isNaN(expiresAt)) {
        return { ok: false, status: 401, error: 'Sessão corrompida' };
    }

    if (expiresAt < now) {
        return { ok: false, status: 401, error: 'Sessão expirada' };
    }

    // 🔒 valida token
    const tokenHash = await hashToken(token);

    if (tokenHash !== token_key) {
        return { ok: false, status: 401, error: 'Token inválido' };
    }

    // 🔄 refresh se faltar <= 2 minutos
    let refreshed = false;
    let newExpiration = token_time;

    if (expiresAt - now <= 2 * 60 * 1000) {

        const refreshResponse = await tokenRefresh(uid, env);

        if (!refreshResponse.ok) {
            return { ok: false, status: 401, error: 'Falha ao renovar sessão' };
        }


        refreshed = true;
        newExpiration = refreshResponse.expires_at;
    }

    // ✅ autenticado
    return {
        ok: true,
        uid,
        refreshed,
        expires_at: newExpiration
    };
}
