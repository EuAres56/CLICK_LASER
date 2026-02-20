// tokenRefresh.js

export default async function tokenRefresh(uid, env) {

    if (!uid) {
        return {
            ok: false,
            status: 400,
            error: 'missing_user_id'
        };
    }

    const timeStampNow = new Date();
    // agora + 10 minutos
    const dateExpires = new Date(timeStampNow.getTime() + 10 * 60 * 1000);

    const newExpiration = dateExpires.toLocaleString("sv-SE", {
        timeZone: "America/Sao_Paulo"
    }).replace(" ", "T") + ".000Z";



    const supabaseUrl =
        `${env.SUPABASE_URL}/rest/v1/auth_staff?uid=eq.${encodeURIComponent(uid)}`;

    const response = await fetch(supabaseUrl, {
        method: 'PATCH',
        headers: {
            "apikey": env.SUPABASE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            time_auth: newExpiration
        })
    });

    return {
        ok: response.ok,
        status: response.status
    };
}
