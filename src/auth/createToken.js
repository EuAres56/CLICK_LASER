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
    // agora + 10 minutos
    const dateExpires = new Date(timeStampNow.getTime() + 10 * 60 * 1000);

    const expiresAt = dateExpires.toLocaleString("sv-SE", {
        timeZone: "America/Sao_Paulo"
    }).replace(" ", "T") + ".000Z";
    // Usamos 'sv-SE' pois ele retorna o formato YYYY-MM-DD nativamente

    console.log(expiresAt);

    const supabaseUrl =
        `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(uid)}`;

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
            token_time: expiresAt
        })
    });


    if (!response.ok) {
        const err = await response.text();
        throw new Error("Erro ao salvar token: " + err);
    }

    // 🔑 retorna APENAS o token puro
    return token;
}
