// logout.js

import verifyAuth from './verifyAuth.js';

export default async function logout(request, env) {

    // 🔐 valida sessão atual
    const auth = await verifyAuth(request, env);

    if (!auth.ok) {
        return new Response(
            JSON.stringify({ error: auth.error }),
            { status: auth.status }
        );
    }

    const supabaseUrl =
        `${env.SUPABASE_URL}/rest/v1/staff/auth_users?id=eq.${encodeURIComponent(auth.id)}`;

    const response = await fetch(supabaseUrl, {
        method: 'PATCH',
        headers: {
            "apikey": env.SUPABASE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            key_auth: null,
            time_auth: null
        })
    });

    if (!response.ok) {
        const err = await response.text();
        return new Response(
            JSON.stringify({ error: 'Erro ao encerrar sessão', details: err }),
            { status: 500 }
        );
    }

    return new Response(
        JSON.stringify({ success: true, message: 'Logout realizado com sucesso' }),
        { status: 200 }
    );
}
