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

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('null')) {
        return { ok: false, status: 401, error: 'Token inválido' };
    }

    if (!userId || userId === 'null' || userId === 'undefined') {
        return { ok: false, status: 401, error: 'ID inválido' };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const tokenHash = await hashToken(token);

    // --- Lógica de Tempo ---
    const now = new Date();
    const nowISO = now.toISOString();

    // 1. Para a Query (Filtro): Usamos sua lógica de subtrair 3h para evitar o erro do '+' na URL
    const nowBrQuery = new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString();

    // 2. Para o Banco (Update): Usamos o offset no corpo do JSON (aqui não dá erro de URL)
    const lastAccessBR = nowISO.replace('Z', '+03:00');

    // Montagem da URL com o filtro de tempo "ajustado"
    /**
 * 🔎 QUERY EXPLICADA:
 * PATCH: Atualiza last_access apenas se as condições abaixo forem metidas:
 * uid=eq...          -> O ID do usuário coincide.
 * token_key=eq...    -> A hash do token enviado coincide com a do banco.
 * token_time=gt...   -> O token ainda é válido (data de expiração > agora).
 * Prefer: return=representation -> Devolve a linha completa após o update.
 */
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(userId)}&token_key=eq.${tokenHash}&token_time=gt.${nowBrQuery}`;

    try {
        const response = await fetch(supabaseUrl, {
            method: 'PATCH',
            headers: {
                "apikey": env.SUPABASE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify({
                last_access: lastAccessBR
            })
        });

        if (!response.ok) {
            return { ok: false, status: 500, error: 'Erro de conexão com DB' };
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return { ok: false, status: 401, error: 'Sessão expirada ou inválida' };
        }

        const userRecord = data[0];
        const expiresAtMs = new Date(userRecord.token_time).getTime();
        const nowMs = now.getTime();

        let refreshed = false;
        let finalExpiration = userRecord.token_time;

        // Se faltar menos de 2 min, renova
        if (expiresAtMs - nowMs <= 2 * 60 * 1000) {
            const refreshRes = await tokenRefresh(userRecord.uid, env);
            if (refreshRes.ok) {
                refreshed = true;
                finalExpiration = refreshRes.expires_at;
            }
        }

        return {
            ok: true,
            uid: userRecord.uid,
            refreshed,
            expires_at: finalExpiration,
            permissions_level: userRecord.permissions_level,
            permissions_map: typeof userRecord.permissions_sections === 'string'
                ? userRecord.permissions_sections
                : JSON.stringify(userRecord.permissions_sections)
        };

    } catch (err) {
        return { ok: false, status: 500, error: 'Erro interno' };
    }
}
