export async function uploadImage(fileData, bucketType, env) {
    const bucket = env[bucketType];

    // 1. Verificação de Integridade: Se for apenas o path (string comum), não processa
    if (typeof fileData === 'string' && !fileData.startsWith('data:') && !fileData.startsWith('blob:')) {
        return null;
    }

    let blob;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        blob = await res.blob();
    } else {
        blob = fileData; // Blob/File vindo do FormData
    }

    // Se não houver arquivo ou o campo estiver vazio, retorna null
    if (!blob || blob.size === 0) return null;

    // --- LÓGICA DE OTIMIZAÇÃO E SEGURANÇA ---
    const isWebP = blob.type === "image/webp";
    const isSmallEnough = blob.size <= (bucketType === 'sale' ? 500 * 1024 : 1024 * 1024);

    let finalBuffer;
    let contentType = "image/webp";

    if (isWebP && isSmallEnough) {
        // Já está no formato ideal e leve
        finalBuffer = await blob.arrayBuffer();
    } else {
        try {
            // REDUNDÂNCIA EXTERNA via wsrv.nl (POST para processar binário)
            const maxW = bucketType === 'sale' ? 1200 : 1920;
            const transformUrl = `https://wsrv.nl/?url=placeholder&output=webp&q=80&w=${maxW}&il`;

            const formData = new FormData();
            formData.append("file", blob);

            const convResponse = await fetch(transformUrl, {
                method: "POST",
                body: formData
            });

            if (convResponse.ok) {
                finalBuffer = await convResponse.arrayBuffer();
            } else {
                // Fallback: Se a API falhar, salva o original (limite 2MB para segurança)
                if (blob.size > 2 * 1024 * 1024) throw new Error("Imagem original muito pesada.");
                finalBuffer = await blob.arrayBuffer();
                contentType = blob.type;
            }
        } catch (error) {
            console.error("Erro no processamento externo:", error.message);
            if (blob.size > 2 * 1024 * 1024) throw new Error("Falha crítica no processamento.");
            finalBuffer = await blob.arrayBuffer();
            contentType = blob.type;
        }
    }

    // 2. Validação Final de Segurança (Bytes finais)
    const limit = bucketType === 'sale' ? 1.5 * 1024 * 1024 : 3 * 1024 * 1024;
    if (finalBuffer.byteLength > limit) {
        throw new Error("Arquivo excede o limite de segurança pós-processamento.");
    }

    // 3. Upload para o R2 (Sem deletar nada antigo aqui)
    const extension = contentType.split('/')[1] || 'webp';
    const newFileName = `products/${crypto.randomUUID()}.${extension}`;

    await bucket.put(newFileName, finalBuffer, {
        httpMetadata: { contentType: contentType }
    });

    return newFileName; // Retorna o novo path para ser salvo no Supabase
}

/**
 * Função Global para Gerar URL temporária (Pre-signed URL)
 * Mantida exatamente como sua versão funcional
 */
export async function generateSignedUrl(key, bucketType, env) {
    // 1. Mapeamento Dinâmico
    // O bucketType vem como 'sale' ou 'creator', buscamos a VAR correspondente
    const bucketNames = {
        sale: `${env.BUCKET_NAME_SALE}`,
        creator: `${env.BUCKET_NAME_CREATOR}`
    };

    const realBucketName = bucketNames[bucketType];
    // Validação de segurança para evitar erros de ambiente
    if (!realBucketName) {
        throw new Error(`Configuração BUCKET_NAME_${bucketType?.toUpperCase()} não encontrada no ambiente.`);
    }

    const accessKeyId = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const accountId = env.R2_ACCOUNT_ID;

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const url = `https://${host}/${realBucketName}/${key}`;
    const method = "GET";
    const expiresIn = 300; // Tempo de expiração em segundos

    // 2. Preparação de Data e Escopo (AWS Signature V4)
    const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const datestamp = datetime.slice(0, 8);
    const region = "auto";
    const credentialScope = `${datestamp}/${region}/s3/aws4_request`;

    const queryParams = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
        "X-Amz-Date": datetime,
        "X-Amz-Expires": expiresIn.toString(),
        "X-Amz-SignedHeaders": "host",
    };

    // Ordenação e codificação da Query String
    const sortedQueryString = Object.keys(queryParams).sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join("&");

    // 3. Criação da Canonical Request
    // IMPORTANTE: O path deve incluir o nome real do bucket
    const canonicalRequest = [
        method,
        `/${realBucketName}/${key}`,
        sortedQueryString,
        `host:${host}\n`,
        "host",
        "UNSIGNED-PAYLOAD"
    ].join("\n");

    // Funções Criptográficas auxiliares
    const hash = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, "0")).join("");
    const hmac = async (k, d) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", typeof k === "string" ? new TextEncoder().encode(k) : k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), new TextEncoder().encode(d)));

    // 4. Cálculo da Assinatura (Derivação de Chaves)
    const kDate = await hmac(`AWS4${secretAccessKey}`, datestamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, "s3");
    const kSigning = await hmac(kService, "aws4_request");

    const stringToSign = ["AWS4-HMAC-SHA256", datetime, credentialScope, await hash(canonicalRequest)].join("\n");
    const signature = Array.from(await hmac(kSigning, stringToSign)).map(b => b.toString(16).padStart(2, "0")).join("");

    // 5. URL Final com Assinatura
    return `${url}?${sortedQueryString}&X-Amz-Signature=${signature}`;
}
