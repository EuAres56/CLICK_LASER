/**
 * 1. Upload de Imagens de Produto/Venda
 * Mantida exatamente como sua versão original (Tratamento WebP + wsrv.nl)
 */
export async function uploadImage(fileData, bucketType, env) {
    const bucket = env[bucketType];

    if (typeof fileData === 'string' && !fileData.startsWith('data:') && !fileData.startsWith('blob:')) {
        return null;
    }

    let blob;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        blob = await res.blob();
    } else {
        blob = fileData;
    }

    if (!blob || blob.size === 0) return null;

    const isWebP = blob.type === "image/webp";
    const isSmallEnough = blob.size <= (bucketType === 'sale' ? 500 * 1024 : 1024 * 1024);

    let finalBuffer;
    let contentType = "image/webp";

    if (isWebP && isSmallEnough) {
        finalBuffer = await blob.arrayBuffer();
    } else {
        try {
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

    const limit = bucketType === 'sale' ? 1.5 * 1024 * 1024 : 3 * 1024 * 1024;
    if (finalBuffer.byteLength > limit) {
        throw new Error("Arquivo excede o limite de segurança pós-processamento.");
    }

    const extension = contentType.split('/')[1] || 'webp';

    const type = bucketType === 'sale' || bucketType === 'sales' ? 'products' : 'figures';
    const newFileName = `${type}/${crypto.randomUUID()}.${extension}`;

    await bucket.put(newFileName, finalBuffer, {
        httpMetadata: { contentType: contentType }
    });

    return newFileName;
}

/**
 * 2. Upload de Ativos da Biblioteca (Figuras/PNG)
 * Focado em manter a integridade (transparência) para uso do Staff
 */
export async function uploadLibraryAsset(fileData, env) {
    const bucket = env['lib'];

    // 1. Validar se o dado existe
    if (!fileData || fileData.size === 0) return null;

    // 2. Extrair o buffer
    const buffer = await fileData.arrayBuffer();

    // 3. Identificar a extensão e o MIME correto
    // Se fileData for um File (do FormData), ele tem .name e .type
    const extension = fileData.name ? fileData.name.split('.').pop().toLowerCase() : 'png';

    // Mapeamento manual para evitar o "text/plain"
    const mimeTypes = {
        'png': 'image/png',
        'svg': 'image/svg+xml',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif'
    };

    // Prioridade: tipo do arquivo > mapa manual > padrão image/png
    const contentType = fileData.type && fileData.type !== "text/plain"
        ? fileData.type
        : (mimeTypes[extension] || "image/png");

    const newFileName = `vectors/${crypto.randomUUID()}.${extension}`;

    // 4. O PULO DO GATO: Salvar explicitamente o contentType
    await bucket.put(newFileName, buffer, {
        httpMetadata: {
            contentType: contentType, // Aqui garantimos que não será text/plain
            cacheControl: "public, max-age=31536000, immutable"
        }
    });

    return newFileName;
}

/**
 * 3. Upload de Fontes da Biblioteca
 */
export async function uploadFont(fileData, env) {
    const bucket = env["lib"];

    if (typeof fileData === 'string' && !fileData.startsWith('data:') && !fileData.startsWith('blob:')) {
        return null;
    }

    let blob;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        blob = await res.blob();
    } else {
        blob = fileData;
    }

    if (!blob || blob.size === 0) return null;

    const allowedTypes = [
        "font/ttf", "font/otf", "font/woff", "font/woff2",
        "application/font-sfnt", "application/x-font-ttf"
    ];

    const isFont = allowedTypes.includes(blob.type) ||
        (blob.name && /\.(ttf|otf|woff|woff2)$/i.test(blob.name));

    if (!isFont) {
        throw new Error("Formato de fonte inválido. Use TTF, OTF ou WOFF2.");
    }

    if (blob.size > 5 * 1024 * 1024) throw new Error("Fonte muito pesada (Máx 5MB).");

    const buffer = await blob.arrayBuffer();

    let extension = "woff2";
    if (blob.name) {
        extension = blob.name.split('.').pop().toLowerCase();
    } else if (blob.type) {
        extension = blob.type.replace("font/", "").replace("application/x-font-", "");
    }

    const newFileName = `fonts/${crypto.randomUUID()}.${extension}`;

    await bucket.put(newFileName, buffer, {
        httpMetadata: {
            contentType: blob.type || `font/${extension}`,
            cacheControl: "public, max-age=31536000, immutable"
        }
    });

    return newFileName;
}
