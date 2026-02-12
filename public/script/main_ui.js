const outline = document.getElementById('outline');
const fill = document.getElementById('fill');
const container = document.getElementById('mainContainer');
const loaderWrapper = document.getElementById('loader-wrapper');

// Variável para controlar se a página já carregou
let pageLoaded = false;
window.onload = () => { pageLoaded = true; };

function createSpark(x, y) {
    const spark = document.createElement('div');
    spark.className = 'spark';
    document.body.appendChild(spark);

    const dx = (Math.random() - 0.5) * 60 + 'px';
    const dy = (Math.random() - 0.5) * 60 + 'px';

    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    spark.style.setProperty('--dx', dx);
    spark.style.setProperty('--dy', dy);
    spark.style.animation = "burn 0.4s ease-out forwards";

    setTimeout(() => spark.remove(), 400);
}

async function runPageLoader() {
    // Garantir que as coordenadas estejam corretas após o carregamento da fonte
    const rect = container.getBoundingClientRect();

    // --- FASE 1: GRAVANDO CONTORNO ---
    for (let p = 100; p >= 0; p -= 2) {
        outline.style.clipPath = `inset(${p}% 0 0 0)`;
        const currentY = rect.top + (rect.height * (p / 100));

        for (let i = 0; i < 5; i++) {
            const randomX = rect.left + (Math.random() * rect.width);
            createSpark(randomX, currentY);
        }
        await new Promise(r => setTimeout(r, 20));
    }

    // Aguarda um pequeno momento para o impacto visual
    await new Promise(r => setTimeout(r, 300));

    // --- FASE 2: PREENCHIMENTO ---
    // Aqui fazemos o preenchimento avançar
    for (let p = 100; p >= 0; p -= 4) {
        fill.style.clipPath = `inset(0 ${p}% 0 0)`;
        const currentX = rect.left + (rect.width * (1 - p / 100));

        for (let i = 0; i < 8; i++) {
            const randomY = rect.top + (Math.random() * rect.height);
            createSpark(currentX, randomY);
        }
        await new Promise(r => setTimeout(r, 40));
    }

    // --- FASE 3: FINALIZAÇÃO ---
    // Se a página ainda não carregou totalmente, esperamos aqui (opcional)
    while (!pageLoaded) {
        await new Promise(r => setTimeout(r, 100));
    }

    // Adiciona classe de saída e remove do DOM após a transição
    setTimeout(() => {
        loaderWrapper.classList.add('fade-out');
        // Remove o elemento após o tempo da transition do CSS (0.8s)
        setTimeout(() => {
            loaderWrapper.style.display = 'none';
        }, 800);
    }, 500);
}

// Inicia o processo
document.fonts.ready.then(runPageLoader);
