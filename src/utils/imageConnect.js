/**
 * Função Global para Upload no Cloudflare R2
 * @param {string|File} fileData - Arquivo em Base64 ou Blob
 * @param {string} bucketName - Nome do Binding do Bucket no Wrangler
 * @param {object} env - Objeto de ambiente do Worker
 */

// Função Global para Upload no Cloudflare R2
async function uploadImage(fileData, bucketType, env, oldKey = null) {
    const bucket = env[bucketType];

    // 1. Verificação: Se fileData for apenas uma string de caminho (sem ser base64),
    // significa que a imagem NÃO mudou. Retornamos a chave atual.
    if (typeof fileData === 'string' && !fileData.startsWith('data:')) {
        return fileData;
    }

    // --- Lógica de conversão redundante (Gatekeeper) ---
    let blob = fileData;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        blob = await res.blob();
    }

    const formData = new FormData();
    formData.append("file", blob);
    const transformUrl = `https://wsrv.nl/?output=webp&q=80&il`;
    const response = await fetch(transformUrl, { method: "POST", body: formData });

    if (!response.ok) throw new Error("Erro na conversão da nova imagem.");
    const webpArrayBuffer = await response.arrayBuffer();

    // 2. Deletar a imagem antiga se uma nova foi processada com sucesso
    if (oldKey) {
        try {
            await bucket.delete(oldKey);
        } catch (e) {
            console.error(`Falha ao deletar imagem antiga: ${oldKey}`);
        }
    }

    // 3. Salvar a nova
    const newFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    await bucket.put(newFileName, webpArrayBuffer, {
        httpMetadata: { contentType: "image/webp" }
    });

    return newFileName;
}

// Função Global para Gerar URL temporaria de Acesso ao Cloudflare R2
async function generateSignedUrl(key, bucketType, env) {
    const accessKeyId = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const accountId = env.R2_ACCOUNT_ID;
    const bucketName = bucketType; // O nome do bucket é o seu binding (ex: 'sale' ou 'creator')

    // Configurações da URL
    const region = "auto";
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const url = `https://${host}/${bucketName}/${key}`;
    const method = "GET";
    const expiresIn = 30; // 30 segundos conforme solicitado

    const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const datestamp = datetime.slice(0, 8);

    const credentialScope = `${datestamp}/${region}/s3/aws4_request`;
    const queryParams = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
        "X-Amz-Date": datetime,
        "X-Amz-Expires": expiresIn.toString(),
        "X-Amz-SignedHeaders": "host",
    };

    // Ordenar e criar query string
    const sortedQueryString = Object.keys(queryParams)
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join("&");

    const canonicalRequest = [
        method,
        `/${bucketName}/${key}`,
        sortedQueryString,
        `host:${host}\n`,
        "host",
        "UNSIGNED-PAYLOAD"
    ].join("\n");

    const hash = async (str) => {
        const msgUint8 = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    };

    const hmac = async (key, data) => {
        const keyData = typeof key === "string" ? new TextEncoder().encode(key) : key;
        const msgData = new TextEncoder().encode(data);
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        return new Uint8Array(sig);
    };

    const hashedCanonicalRequest = await hash(canonicalRequest);
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        datetime,
        credentialScope,
        hashedCanonicalRequest
    ].join("\n");

    // Derivação da Chave de Assinatura
    const kDate = await hmac(`AWS4${secretAccessKey}`, datestamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");

    // Assinatura Final
    const signature = Array.from(await hmac(kSigning, stringToSign))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return `${url}?${sortedQueryString}&X-Amz-Signature=${signature}`;
}

export { uploadImage, generateSignedUrl };
