// createToken.js (Cloudflare Worker compatible)

function generateToken(bytes = 32) {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);

    return [...array]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hashToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export default async function createToken(uid, env) {

    if (!uid) {
        throw new Error("UID inválido para criação de token");
    }

    const token = generateToken();
    const tokenHash = await hashToken(token);

    const timeStampNow = new Date();
    // Definimos a expiração para agora + 10 minutos
    const expiresAt = new Date(timeStampNow.getTime() + 10 * 60 * 1000);

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
            token_key: tokenHash,
            last_access: timeStampNow.toISOString().replace('Z', '+03:00'),
            token_time: expiresAt.toISOString().replace('Z', '+03:00') // Agora salva corretamente "2026-02-19T22:10:00"
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error("Erro ao salvar token: " + err);
    }

    // 🔑 Retorna o token puro para ser enviado ao cliente (Cookie/LocalStorage)
    return token;
}
