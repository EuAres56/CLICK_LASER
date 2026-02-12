/**
 * scripts/main.js
 * Versão: Escala Real + Sistema Anti-Vazamento + Exportação Corrigida (Canvas/Metal)
 */

// Dados da API
let PRODUCT_DATA = {
    alturaRealMM: 260,
    areaUtilLarguraMM: 35,
    areaUtilAlturaMM: 110,
    distanciaBaseMM: 25
};

let currentSelected = 'vector';

const elements = {
    vector: { id: 'target-vector', name: 'Logo/Vetor', x: 0, y: 0, scale: 1, angle: 0, visible: true, el: null },
    text: { id: 'target-text', name: 'Texto Personalizado', x: 0, y: 50, scale: 1, angle: 0, visible: true, el: null }
};

const CORES_DISPONIVEIS = [
    { nome: "Preto", hex: "#1a1a1a" },
    { nome: "Azul Marinho", hex: "#001f3f" },
    { nome: "Vinho", hex: "#800000" },
    { nome: "Verde Militar", hex: "#4b5320" },
    { nome: "Aço Escovado", hex: "#808080" }
];

document.addEventListener('DOMContentLoaded', () => {
    elements.vector.el = document.querySelector('#target-vector');
    elements.text.el = document.querySelector('#target-text');

    initMockup();

    window.addEventListener('resize', () => {
        initMockup();
    });
});

function initMockup() {
    updateSafeZone(PRODUCT_DATA);
    setupInteractions();
    renderColorPalette();
    updateLayerUI();
    selectElement(currentSelected);
    Object.keys(elements).forEach(id => keepInside(id));
}

function updateSafeZone(data) {
    const sz = document.getElementById('safe-zone');
    const container = document.getElementById('preview-container');
    if (!sz || !container) return;

    const containerHeight = container.offsetHeight;
    const pxPerMM = containerHeight / data.alturaRealMM;
    window.currentPxPerMM = pxPerMM;

    sz.style.width = `${data.areaUtilLarguraMM * pxPerMM}px`;
    sz.style.height = `${data.areaUtilAlturaMM * pxPerMM}px`;
    sz.style.bottom = `${data.distanciaBaseMM * pxPerMM}px`;
}

function keepInside(id) {
    const item = elements[id];
    const sz = document.getElementById('safe-zone');
    if (!item.el || !sz || !item.visible) return;

    const parentRect = sz.getBoundingClientRect();
    const childRect = item.el.getBoundingClientRect();

    let moveX = 0;
    let moveY = 0;

    if (childRect.left < parentRect.left) moveX = (parentRect.left - childRect.left);
    if (childRect.right > parentRect.right) moveX = (parentRect.right - childRect.right);
    if (childRect.top < parentRect.top) moveY = (parentRect.top - childRect.top);
    if (childRect.bottom > parentRect.bottom) moveY = (parentRect.bottom - childRect.bottom);

    if (moveX !== 0 || moveY !== 0) {
        item.x += moveX;
        item.y += moveY;
        updateTransform(id);
    }
}

function setupInteractions() {
    interact('.draggable-item').unset();
    interact('.draggable-item').draggable({
        listeners: {
            start(event) {
                const id = event.target.id === 'target-vector' ? 'vector' : 'text';
                selectElement(id);
            },
            move(event) {
                const id = event.target.id === 'target-vector' ? 'vector' : 'text';
                elements[id].x += event.dx;
                elements[id].y += event.dy;
                updateTransform(id);
            },
            end(event) {
                const id = event.target.id === 'target-vector' ? 'vector' : 'text';
                keepInside(id);
            }
        },
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                endOnly: false
            })
        ]
    });
}

function updateTransform(id) {
    const item = elements[id];
    if (item.el) {
        item.el.style.transform = `translate(${item.x}px, ${item.y}px) rotate(${item.angle}deg) scale(${item.scale})`;
    }
}

/**
 * EXPORTAÇÃO CORRIGIDA PARA SISTEMA DE CANVAS/METAL
 */
async function exportArt(isDownload = false) {
    const sz = document.getElementById('safe-zone');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const qualityScale = 10; // 10px por mm para alta definição
    canvas.width = PRODUCT_DATA.areaUtilLarguraMM * qualityScale;
    canvas.height = PRODUCT_DATA.areaUtilAlturaMM * qualityScale;

    const screenToCanvasScale = canvas.width / sz.offsetWidth;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawLayer = async (data, isText = false) => {
        if (!data.visible) return;
        const el = document.getElementById(data.id);
        ctx.save();

        const w = el.offsetWidth;
        const h = el.offsetHeight;

        ctx.translate(
            (data.x + w / 2) * screenToCanvasScale,
            (data.y + h / 2) * screenToCanvasScale
        );

        ctx.rotate(data.angle * Math.PI / 180);
        ctx.scale(data.scale * screenToCanvasScale, data.scale * screenToCanvasScale);

        if (isText) {
            const textEl = document.getElementById('text-display');
            const style = window.getComputedStyle(textEl);
            const fontSize = parseInt(style.fontSize);

            ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
            ctx.fillStyle = "black"; // Exportação sempre em preto para o laser
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(textEl.innerText, 0, 0);
        } else {
            const vectorCanvas = document.getElementById('vector-canvas');
            if (vectorCanvas) {
                // Desenha o conteúdo do canvas do preview no canvas de exportação
                // Ocultamos o efeito metálico redesenhando apenas o traço preto
                ctx.drawImage(vectorCanvas, -w / 2, -h / 2, w, h);
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = 'black';
                ctx.fillRect(-w / 2, -h / 2, w, h);
            }
        }
        ctx.restore();
    };

    await drawLayer(elements.vector, false);
    await drawLayer(elements.text, true);

    const dataURL = canvas.toDataURL("image/png");
    if (isDownload) {
        const link = document.createElement('a');
        link.download = `gravacao-laser-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
    } else {
        const win = window.open();
        win.document.write(`<body style="margin:0; background:#f0f0f0; display:flex; justify-content:center; align-items:center; height:100vh;">
            <img src="${dataURL}" style="background:white; box-shadow: 0 0 20px rgba(0,0,0,0.2); max-width:90%;">
        </body>`);
    }
}

function rotateStep(dir) {
    elements[currentSelected].angle = (elements[currentSelected].angle + (dir * 45)) % 360;
    updateTransform(currentSelected);
    keepInside(currentSelected);
}

function zoomStep(factor) {
    elements[currentSelected].scale = Math.max(0.1, elements[currentSelected].scale + factor);
    updateTransform(currentSelected);
    setTimeout(() => keepInside(currentSelected), 10);
}

function updateText(val) {
    const textDisplay = document.getElementById('text-display');
    if (textDisplay) {
        textDisplay.innerText = val || "NOME";
        textDisplay.style.backgroundColor = "transparent";
        setTimeout(() => keepInside('text'), 50);
    }
}

function updateFont(fontName) {
    document.getElementById('text-display').style.fontFamily = fontName;
    setTimeout(() => keepInside('text'), 50);
}

function selectElement(type) {
    currentSelected = type;
    document.querySelectorAll('.draggable-item').forEach(el => el.classList.remove('active-element'));
    if (elements[type].el) elements[type].el.classList.add('active-element');

    document.getElementById('controls-vector').style.display = type === 'vector' ? 'block' : 'none';
    document.getElementById('controls-text').style.display = type === 'text' ? 'block' : 'none';
    updateLayerUI();
}

function toggleLayer(type) {
    elements[type].visible = !elements[type].visible;
    if (elements[type].el) {
        elements[type].el.style.display = elements[type].visible ? 'flex' : 'none';
    }
    updateLayerUI();
}

function updateLayerUI() {
    const list = document.getElementById('layer-list');
    if (!list) return;
    list.innerHTML = '';
    Object.keys(elements).forEach(key => {
        const item = document.createElement('div');
        item.className = `layer-item ${currentSelected === key ? 'active' : ''}`;
        item.innerHTML = `
            <span>${elements[key].name}</span>
            <button onclick="event.stopPropagation(); toggleLayer('${key}')" class="btn-toggle">
                ${elements[key].visible ? '🟢' : '🔴'}
            </button>
        `;
        item.onclick = () => selectElement(key);
        list.appendChild(item);
    });
}

function changeVector(path) {
    const container = document.getElementById('target-vector');
    container.innerHTML = '<canvas id="vector-canvas"></canvas>';
    const canvas = document.getElementById('vector-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = 'source-in';

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#635f5f');
        gradient.addColorStop(0.5, '#c4c4c4');
        gradient.addColorStop(1, '#635f5f');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        setTimeout(() => keepInside('vector'), 100);
    };
    img.src = path;
}

function changeProduct(path) {
    document.getElementById('product-base').src = path;
    const overlay = document.getElementById('color-overlay');
    overlay.style.webkitMaskImage = overlay.style.maskImage = `url(${path})`;
}

function renderColorPalette() {
    const palette = document.getElementById('color-palette');
    if (!palette) return;
    palette.innerHTML = '';
    CORES_DISPONIVEIS.forEach(cor => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = cor.hex;
        dot.onclick = () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
            document.getElementById('color-overlay').style.backgroundColor = cor.hex;
        };
        palette.appendChild(dot);
    });
}

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}
