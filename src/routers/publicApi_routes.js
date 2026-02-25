export default async function apiPublicRouter(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const subPath = url.pathname.replace("/api/public", "");
    // --- ROTA UNIVERSAL PARA SERVIR ASSETS (R2) ---
    if (subPath.startsWith("/assets/serve/") && method === "GET") {
        try {
            // 1. Extrai o nome do arquivo (ex: "produtos/camisa.png")
            const filePath = subPath.replace("/assets/serve/", "");
            if (!filePath) return new Response("Caminho vazio", { status: 400 });

            // 2. Define o bucket alvo via parâmetro ?b= (default: lib)
            const bucketKey = url.searchParams.get("b") || "lib";
            const bucket = env[bucketKey];

            if (!bucket) {
                return new Response("Bucket não configurado", { status: 400 });
            }

            // 3. Busca o objeto no R2
            const object = await bucket.get(filePath);

            if (!object) {
                console.error(`[R2] 404 em ${bucketKey}: ${filePath}`);
                return new Response("Arquivo não encontrado", { status: 404 });
            }

            // 4. Configura os Headers de resposta
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Cache-Control", "public, max-age=31536000"); // 1 ano de cache

            // 5. Garante o Content-Type para renderização
            let contentType = headers.get("Content-Type");
            if (!contentType || contentType.includes("text/plain")) {
                const ext = filePath.split('.').pop().toLowerCase();
                const mimeMap = {
                    'png': 'image/png', 'svg': 'image/svg+xml', 'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg', 'webp': 'image/webp', 'woff2': 'font/woff2',
                    'ttf': 'font/ttf'
                };
                headers.set("Content-Type", mimeMap[ext] || "application/octet-stream");
            }

            return new Response(object.body, { headers });

        } catch (error) {
            console.error(`[R2 Serve Error]: ${error.message}`);
            return new Response("Erro interno ao servir arquivo", { status: 500 });
        }
    }

    // Se nenhuma rota bater
    return new Response(JSON.stringify({ error: "Rota de API não mapeada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
    });
}
