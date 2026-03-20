/**
 * 1. Upload de Imagens de Produto/Venda
 * Mantida exatamente como sua versão original (Tratamento WebP + wsrv.nl)
 */
export async function uploadLibraryAsset(fileData, assetType, env) {
    const bucket = env["lib"];

    if (!bucket) {
        console.error("[R2 Error] Bucket 'lib' não encontrado no env.");
        return null;
    }

    // 1. Tratamento de Input (Garante que Base64 vire Blob real)
    let blob;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const res = await fetch(fileData);
        blob = await res.blob();
    } else if (fileData instanceof Blob || (fileData && fileData.size)) {
        blob = fileData;
    } else {
        return null;
    }

    if (!blob || blob.size === 0) return null;

    // 2. Configurações por Tipo de Asset
    const configs = {
        image: {
            limit: 1.5 * 1024 * 1024, // Ajustado para 1.5MB conforme seu comentário
            folder: 'products',
            mimes: { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp' }
        },
        figure: {
            limit: 3 * 1024 * 1024, // Ajustado para 3MB
            folder: 'figures',
            mimes: { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp', 'svg': 'image/svg+xml' }
        },
        font: {
            limit: 5 * 1024 * 1024,
            folder: 'fonts',
            mimes: { 'ttf': 'font/ttf', 'otf': 'font/otf', 'woff': 'font/woff', 'woff2': 'font/woff2' }
        }
    };

    const config = configs[assetType];
    if (!config) {
        console.error(`[R2 Error] Configuração de ${assetType} não encontrada.`);
        return null;
    }

    // 3. Validação de Tamanho
    if (blob.size > config.limit) {
        const sizeMB = (config.limit / (1024 * 1024)).toFixed(1);
        throw new Error(`Arquivo excede o limite para ${assetType} (Máx: ${sizeMB}MB).`);
    }

    // 4. Determinar Extensão e Corrigir Content-Type (O Pulo do Gato)
    let extension = "bin";
    if (blob.name) {
        extension = blob.name.split('.').pop().toLowerCase();
    } else if (blob.type) {
        extension = blob.type.split('/').pop().replace('x-font-', '').replace('svg+xml', 'svg');
    }

    // IMPORTANTE: Se o blob veio como octet-stream, tentamos mapear pela extensão
    // Isso resolve o problema das imagens que não renderizam
    const contentType = (blob.type === "application/octet-stream" || !blob.type)
        ? (config.mimes[extension] || "application/octet-stream")
        : blob.type;

    const newFileName = `${config.folder}/${crypto.randomUUID()}.${extension}`;

    try {
        // 5. Extração do Buffer e Upload com Metadados Explícitos
        const buffer = await blob.arrayBuffer();
        console.log(`[Upload] ${newFileName} (${contentType})`);
        console.log(buffer);
        await bucket.put(newFileName, buffer, {
            httpMetadata: {
                contentType: contentType, // O navegador precisa disso correto para exibir a imagem
                cacheControl: "public, max-age=31536000, immutable"
            }
        });

        return newFileName;

    } catch (error) {
        console.error(`[Upload Critical Error]: ${error.message}`);
        throw error;
    }
}

export async function deleteFromBucket(fileIdentifier, bucketType, env) {
    const bucket = env[bucketType];
    if (!fileIdentifier || !bucket) return false;

    try {
        let key = fileIdentifier;
        // Extrai a key se for uma URL completa
        if (fileIdentifier.includes('://')) {
            const url = new URL(fileIdentifier);
            key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        }

        await bucket.delete(key);
        return true;
    } catch (error) {
        console.error(`[Bucket ${bucketType}] Erro ao deletar ${fileIdentifier}:`, error.message);
        return false;
    }
}
