export async function dataBaseRequest(endPoint, method, body = null, env) {
    try {
        if (!endPoint || !method) throw new Error("EndPoint e Método são obrigatórios.");

        const cleanEndPoint = endPoint.replace(/^\/|\/$/g, '');
        const url = `${env.SUPABASE_URL}/rest/v1/${cleanEndPoint}`;

        const headers = {
            "apikey": env.SUPABASE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_KEY}`,
            "Content-Type": "application/json"
        };

        if (method !== "GET") headers["Prefer"] = "return=representation";

        const options = { method, headers };
        if (body && method !== "GET") options.body = JSON.stringify(body);

        const res = await fetch(url, options);

        // Se a resposta do Supabase NÃO for OK (400, 401, 404, 500 do banco)
        if (!res.ok) {
            const errorText = await res.text();
            // Log técnico para ver no console do Cloudflare
            console.error(`[DB ERROR]: ${res.status} - ${errorText}`);

            // Interrompe e lança para o catch desta mesma função
            throw new Error("DB_FAILURE");
        }

        // Se chegou aqui, deu tudo certo. Retorna o JSON (Array de objetos)
        return await res.json();

    } catch (error) {
        // Log para o desenvolvedor
        console.error(`[UTILITY CATCH]: ${error.message}`);

        // RETORNO DIRETO PARA O CLIENTE:
        // Como você quer que o utilitário já resolva a resposta de erro:
        return new Response(JSON.stringify({
            error: "Falha no banco de dados",
            details: "Tente novamente, se o erro persistir contate o suporte."
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
