/*
=========================================================
OS SYSTEM
=========================================================
*/

let currentOSUid = null;

let selectedFont = null;
let selectedVector = null;

let loadedFonts = [];
let loadedVectors = {};


/*
=========================================================
INIT
=========================================================
*/

window.addEventListener("DOMContentLoaded", async () => {

    await loadFonts();

    await loadVectors();

    await loadOrders();

});


/*
=========================================================
MODAL
=========================================================
*/

function openOSModal(uid = null) {

    currentOSUid = uid;

    const modal = document.getElementById("osModal");

    modal.classList.add("active");


    /*
    =========================================
    EDIT MODE
    =========================================
    */

    if (uid) {

        loadOrderData(uid);

    } else {

        resetOSForm();

    }

}


function closeOSModal() {

    document
        .getElementById("osModal")
        .classList.remove("active");

}


/*
=========================================================
RESET FORM
=========================================================
*/

function resetOSForm() {

    currentOSUid = null;

    selectedFont = null;
    selectedVector = null;


    /*
    =========================================
    CLEAR INPUTS
    =========================================
    */

    document
        .querySelectorAll("#osModal input, #osModal textarea")
        .forEach(el => {
            el.value = "";
        });


    /*
    =========================================
    REMOVE ACTIVE STATES
    =========================================
    */

    document
        .querySelectorAll(".font-card")
        .forEach(el => {
            el.classList.remove("active");
        });

    document
        .querySelectorAll(".vector-card")
        .forEach(el => {
            el.classList.remove("active");
        });


    /*
    =========================================
    UPDATE PREVIEWS
    =========================================
    */

    updateFontPreviews();

}


/*
=========================================================
UPDATE FONT PREVIEWS
=========================================================
*/

function updateFontPreviews() {

    const text =
        document
            .getElementById("osText")
            .value
            .trim() || "ABC";


    document
        .querySelectorAll(".font-preview")
        .forEach(preview => {

            preview.innerText = text;

        });

}


/*
=========================================================
LOAD FONTS
=========================================================
*/

async function loadFonts() {

    try {

        const response =
            await fetch(
                "/api/public/dialog/fonts/load"
            );

        const fonts =
            await response.json();

        loadedFonts = fonts;

        const container =
            document.getElementById(
                "osFontsContainer"
            );

        container.innerHTML = "";


        /*
        =========================================
        CREATE FONT CARDS
        =========================================
        */

        fonts.forEach(font => {

            /*
            =========================================
            LOAD FONT FACE
            =========================================
            */

            if (font.font_url) {

                const fontFace =
                    new FontFace(
                        font.font_name,
                        `url(${font.font_url})`
                    );

                fontFace
                    .load()
                    .then(f => {
                        document.fonts.add(f);
                    });

            }


            /*
            =========================================
            CARD
            =========================================
            */

            const card =
                document.createElement("div");

            card.className =
                "font-card";


            card.innerHTML = `
                <div
                    class="font-preview"
                    style="font-family:'${font.font_name}'"
                >
                    ABC
                </div>

                <div class="font-name">
                    ${font.font_name}
                </div>
            `;


            card.onclick = () => {

                document
                    .querySelectorAll(".font-card")
                    .forEach(el => {
                        el.classList.remove("active");
                    });

                card.classList.add("active");

                selectedFont = font;

            };


            container.appendChild(card);

        });


        updateFontPreviews();

    } catch (error) {

        console.error(
            "Erro ao carregar fontes:",
            error
        );

    }

}


/*
=========================================================
LOAD VECTORS
=========================================================
*/

async function loadVectors() {

    try {

        const response =
            await fetch(
                "/api/public/dialog/vectors/load"
            );

        const categories =
            await response.json();

        loadedVectors = categories;


        const tabs =
            document.getElementById(
                "osCatalogTabs"
            );

        const grid =
            document.getElementById(
                "osVectorsGrid"
            );


        tabs.innerHTML = "";

        const categoryNames =
            Object.keys(categories);


        if (categoryNames.length === 0)
            return;


        /*
        =========================================
        RENDER CATEGORY
        =========================================
        */

        function renderCategory(category) {

            grid.innerHTML = "";


            categories[category]
                .forEach(fig => {

                    const card =
                        document.createElement("div");

                    card.className =
                        "vector-card";


                    card.innerHTML = `
                        <img
                            src="${fig.figure_url}"
                            alt="${fig.figure_name}"
                        >

                        <div class="vector-name">
                            ${fig.figure_name}
                        </div>
                    `;


                    card.onclick = () => {

                        document
                            .querySelectorAll(".vector-card")
                            .forEach(el => {
                                el.classList.remove("active");
                            });

                        card.classList.add("active");

                        selectedVector = fig;

                    };


                    grid.appendChild(card);

                });

        }


        /*
        =========================================
        CREATE TABS
        =========================================
        */

        categoryNames
            .forEach((category, index) => {

                const tab =
                    document.createElement("button");

                tab.className =
                    "catalog-tab";

                tab.innerText =
                    category;


                if (index === 0) {

                    tab.classList.add("active");

                }


                tab.onclick = () => {

                    document
                        .querySelectorAll(".catalog-tab")
                        .forEach(el => {
                            el.classList.remove("active");
                        });

                    tab.classList.add("active");

                    renderCategory(category);

                };


                tabs.appendChild(tab);

            });


        /*
        =========================================
        FIRST CATEGORY
        =========================================
        */

        renderCategory(categoryNames[0]);

    } catch (error) {

        console.error(
            "Erro ao carregar vetores:",
            error
        );

    }

}


/*
=========================================================
LOAD ORDERS
=========================================================
*/

async function loadOrders() {

    try {

        /*
        =========================================
        DATE
        =========================================
        */

        const dateInput =
            document.getElementById(
                "filterDate"
            );

        let selectedDate =
            dateInput
                ? dateInput.value
                : "";


        /*
        =========================================
        DEFAULT TODAY
        =========================================
        */

        if (!selectedDate) {

            const now =
                new Date();

            const offset =
                now.getTimezoneOffset() * 60000;

            selectedDate =
                new Date(now - offset)
                    .toISOString()
                    .split("T")[0];

            if (dateInput) {
                dateInput.value =
                    selectedDate;
            }

        }


        /*
        =========================================
        REQUEST
        =========================================
        */

        const response =
            await fetch(
                `/api/public/operation/orders/search?date=${selectedDate}`
            );


        /*
        =========================================
        RESPONSE VALIDATION
        =========================================
        */

        if (!response.ok) {

            throw new Error(
                "Erro ao buscar OS"
            );

        }


        /*
        =========================================
        JSON
        =========================================
        */

        const orders =
            await response.json();


        console.log(
            "[ORDERS LOADED]",
            orders
        );


        /*
        =========================================
        RENDER
        =========================================
        */

        renderOrders(
            Array.isArray(orders)
                ? orders
                : []
        );

    } catch (error) {

        console.error(
            "[LOAD ORDERS ERROR]",
            error
        );

    }

}
/*
=========================================================
RENDER ORDERS
=========================================================
*/

/*
=========================================================
RENDER ORDERS
=========================================================
*/

function renderOrders(orders) {

    const container =
        document.getElementById(
            "osGrid"
        );

    container.innerHTML = "";


    /*
    =========================================
    EMPTY
    =========================================
    */

    if (!orders.length) {

        container.innerHTML = `

            <div class="os-empty">

                <div class="os-empty-icon">
                    📦
                </div>

                <div class="os-empty-title">
                    Nenhuma OS encontrada
                </div>

                <div class="os-empty-text">
                    Não existem ordens de serviço nesta data.
                </div>

            </div>

        `;

        return;

    }


    /*
    =========================================
    CARDS
    =========================================
    */

    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className =
            "os-card";
        card.dataset.uid = order.uid;
        card.dataset.date = order.created_at.replace("T", " - ").split(".")[0];

        card.innerHTML = `
        <div class="os-card-title">
            <div class="os-id">
                #${order.job_uid || "--"}
            </div>
        </div>
        <div class="os-card-body">
            <div class="os-header">
                <div class="os-client-area">
                    <div class="os-client-name">
                        ${order.client_name || "Sem nome"}
                    </div>
                    <div class="os-client-phone">
                        ${order.client_phone || "-"}
                    </div>
                </div>
                <div class="os-field" name="item">
                    <div class="os-label">Item</div>
                    <div class="os-value">${order.product_title || "Nenhum"}</div>
                </div>

            </div>


            <div class="os-body">
                <div class="os-content">
                    <div class="os-field" name="font">
                        <div class="os-label">Fonte</div>
                        <div class="os-value">${order.font_name || "Nenhuma"}</div>
                    </div>
                    <div class="os-field" name="text">
                        <div class="os-label">Texto</div>
                        <div class="os-value os-engraving-text" style="font-family: '${order.font_name || "Arial"}', sans-serif;">
                            ${order.text || "Sem texto"}
                        </div>
                    </div>
                </div>
                <div class="os-container">
                    <div class="os-preview">
                        ${order.figure_url ? `<img src="${order.figure_url}" class="os-preview-image">` : `<div class="os-preview-placeholder">Sem Figura</div>`}
                    </div>
                    <div class="os-value" name="vector">${order.figure_name || "Nenhum"}</div>
                </div>
            </div>
            <div class="os-field" name="obs">
                <div class="os-label">Observações</div>
                <div class="os-value">${order.obs || "Nenhuma"}</div>
            </div>
            <div class="os-actions">
                <button class="os-btn view-btn" onclick="reprintOS('${order.uid}')">Imprimir</button>
                <button class="os-btn edit-btn" onclick="openOSModal('${order.uid}')">Editar</button>
                <button class="os-btn delete-btn" onclick="deleteOrder('${order.uid}')">Deletar</button>
            </div>
        </div>
        `;

        container.appendChild(card);

    });

}


/*
=========================================================
SAVE ORDER
=========================================================
*/

async function saveOrder() {

    try {

        /*
        =========================================
        FORM DATA
        =========================================
        */

        const seller =
            document
                .getElementById("osSeller")
                .value
                .trim();

        const client =
            document
                .getElementById("osClient")
                .value
                .trim();

        const contact =
            document
                .getElementById("osContact")
                .value
                .trim();

        const product =
            document
                .getElementById("osProduct")
                .value
                .trim();

        const text =
            document
                .getElementById("osText")
                .value
                .trim();

        const obs =
            document
                .getElementById("obsText")
                .value
                .trim();


        /*
        =========================================
        VALIDATION
        =========================================
        */

        if (!seller || !client || !contact) {

            alert(
                "Preencha vendedor, cliente e contato."
            );

            return;

        }


        /*
        =========================================
        PAYLOAD
        =========================================
        */

        const payload = {
            client_name: client,
            client_phone: contact,
            jobs: [
                {
                    product_title: product,
                    text_title: text || null,
                    text_font: selectedFont ? selectedFont.font_name : null,
                    font_uid: selectedFont ? selectedFont.font_uid : null,
                    figure_name: selectedVector ? selectedVector.figure_name : null,
                    figure_url: selectedVector ? selectedVector.figure_url : null,
                    observation: `${seller} => ${obs}`.trim()
                }
            ]
        };


        console.log(
            "[SAVE ORDER PAYLOAD]",
            payload
        );


        /*
        =========================================
        FORM DATA
        =========================================
        */

        const formData = new FormData();
        formData.append("payload", JSON.stringify(payload));


        /*
        =========================================
        REQUEST
        =========================================
        */

        const response = await fetch("/api/public/operation/orders/create",
            {
                method: "POST",
                body: formData
            }
        );

        /*
        =========================================
        RESPONSE
        =========================================
        */

        const result = await response.json();

        console.log(
            "[SAVE ORDER RESPONSE]",
            result
        );

        if (!response.ok) {

            console.error(result);

            alert(
                result.error ||
                "Erro ao salvar OS."
            );

            return;

        }


        console.log(
            "[ORDER CREATED]",
            result
        );


        /*
        =========================================
        PRINT
        =========================================
        */

        printOrder({
            job_uid: result.uid,
            date: result.created_at,
            client_name: result.client_name,
            client_phone: result.client_phone,
            product_title: result.product_title,
            text_title: result.text,
            font_name: result.font_name,
            vector_name: result.figure_name,
            vector_url: result.figure_url,
            obs: result.obs
        });


        /*
        =========================================
        RESET
        =========================================
        */

        resetOSForm();

        closeOSModal();

        await loadOrders();

    } catch (error) {

        console.error(
            "[SAVE ORDER ERROR]",
            error
        );

        alert(
            "Erro ao salvar ordem."
        );

    }

}




/*
=========================================================
REPRINT OS
=========================================================
*/
function reprintOS(id) {

    const card = document.querySelector(`.os-card[data-uid="${id}"]`);

    if (!card) {

        alert(
            "OS não encontrada para reimpressão."
        );

        return;

    }
    printOrder({
        job_uid: id,
        date: card.getAttribute("data-date") || "Data desconhecida",
        client_name: card.querySelector(".os-client-name")?.textContent || "Sem nome",
        client_phone: card.querySelector(".os-client-phone")?.textContent || "Sem contato",
        product_title: card.querySelector(".os-field[name='item'] .os-value")?.textContent || "Nenhum",
        text_title: card.querySelector(".os-field[name='text'] .os-value")?.textContent.trim() || "Nenhuma",
        font_name: card.querySelector(".os-field[name='font'] .os-value")?.textContent || "Nenhuma",
        vector_name: card.querySelector(".os-value[name='vector']")?.textContent || "Nenhuma",
        vector_url: card.querySelector(".os-preview-image")?.src || null,
        obs: card.querySelector(".os-field[name='obs'] .os-value")?.textContent || "Nenhuma"
    });
}


/*
=========================================================
PRINT ORDER
=========================================================
*/

/*
=========================================================
PRINT ORDER
=========================================================
*/

function printOrder(data) {

    const vectorHtml =
        data.vector_url

            ? `
                <div class="vector-box">

                    <div class="copy-tag">
                        Clique para copiar
                    </div>

                    <img
                        src="${data.vector_url}"
                        class="vector-image"
                        id="vectorImage"
                    >

                </div>
            `

            : `
                <div class="vector-empty">
                    Nenhum vetor selecionado
                </div>
            `;


    const printWindow =
        window.open("", "_blank");


    printWindow.document.write(`
        <html>

        <head>

            <title>
                OS #${data.job_uid}
            </title>

            <style>
                *{
                    margin:0;
                    padding:0;
                    box-sizing:border-box;
                }

                body{
                    font-family:
                        Arial,
                        sans-serif;

                    background:
                        #efefef;

                    padding:
                        12px;

                    display:
                        flex;

                    justify-content:
                        center;

                    color:
                        #2d2d2d;
                }

                .page{
                    width:
                        100%;

                    max-width:
                        360px;
                }

                .ticket{
                    background:
                        #181818;

                    border:
                        1px solid #262626;

                    border-radius:
                        14px;

                    overflow:
                        hidden;
                }

                /*
                =========================================================
                HEADER
                =========================================================
                */

                .header{
                    padding:
                        14px 16px;

                    border-bottom:
                        1px dashed #333;

                    background:
                        #151515;
                }

                .header-top{
                    display:
                        flex;

                    flex-direction:
                        column;

                    justify-content:
                        space-between;

                    align-items:
                        center;

                    gap:
                        10px;
                }

                .title{
                    font-size:
                        16px;

                    font-weight:
                        700;

                    letter-spacing:
                        .5px;
                }

                .os-id{
                    background:
                        rgba(222, 59, 255, 0.12);
                    color:
                        #ae25ee;

                    padding:
                        4px 10px;

                    border-radius:
                        999px;

                    font-size:
                        11px;

                    font-weight:
                        700;
                }

                .date{
                    margin-top:
                        6px;

                    color:
                        #8c8c8c;

                    font-size:
                        11px;
                }

                /*
                =========================================================
                CONTENT
                =========================================================
                */

                .content{
                    padding:
                        14px 16px;
                }

                .block{
                    margin-bottom:
                        14px;
                }

                .label{
                    font-size:
                        9px;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        1px;

                    color:
                        #777;

                    margin-bottom:
                        4px;
                }

                .value{
                    font-size:
                        14px;

                    line-height:
                        1.35;

                    color:
                        #fff;

                    word-break:
                        break-word;
                }

                .highlight{
                    font-size:
                        20px;

                    font-weight:
                        700;
                }

                /*
                =========================================================
                COPYABLE
                =========================================================
                */

                .copyable{
                    cursor:
                        pointer;

                    transition:
                        .2s;
                }

                .copyable:hover{
                    color:
                        #ae25ee;
                }

                /*
                =========================================================
                VECTOR
                =========================================================
                */

                .vector-box{
                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    background:
                        rgba(222, 59, 255, 0.5);

                    border:
                        1px solid #2a2a2a;

                    border-radius:
                        10px;

                    padding:
                        10px;

                    min-height:
                        110px;

                    position:
                        relative;
                }

                .copy-tag{
                    position:
                        absolute;

                    top:
                        6px;

                    right:
                        6px;

                    font-size:
                        9px;

                    background:
                        rgba(255,255,255,.08);

                    padding:
                        3px 7px;

                    border-radius:
                        999px;

                    color:
                        #999;
                }

                .vector-image {
                    width: 60mm;
                    object-fit: contain;
                    cursor: pointer;
                    transition: .2s;
                }

                .vector-image:hover{
                    transform:
                        scale(1.03);
                }

                .vector-empty{
                    border:
                        1px dashed #444;

                    border-radius:
                        8px;

                    padding:
                        16px;

                    text-align:
                        center;

                    font-size:
                        12px;

                    color:
                        #777;
                }

                /*
                =========================================================
                FOOTER
                =========================================================
                */

                .footer{
                    border-top:
                        1px dashed #333;

                    padding:
                        10px;

                    text-align:
                        center;

                    font-size:
                        9px;

                    color:
                        #777;
                }

                /*
                =========================================================
                BUTTON
                =========================================================
                */

                .print-btn{
                    width:
                        100%;

                    margin-top:
                        12px;

                    border:
                        none;

                    background:
                        rgba(174, 37, 238, 0.12);

                    color:
                        #ae25ee;

                    padding:
                        12px;

                    border-radius:
                        10px;

                    font-size:
                        13px;

                    font-weight:
                        700;

                    cursor:
                        pointer;
                }

                /*
                =========================================================
                PRINT
                =========================================================
                */

                @media print{

                    @page{
                        size:
                            80mm auto;

                        margin:
                            0;
                    }

                    * {
                        background:
                            white !important;

                        color:
                            black !important;
                    }

                    .print-btn{
                        display:
                            none !important;
                    }

                    html,
                    body{
                        width:
                            80mm;

                        padding:
                            0 !important;

                        margin:
                            0 !important;
                    }

                    body{
                        display:
                            block;
                    }

                    .page{
                        width:
                            100%;

                        max-width:
                            100%;

                        margin:
                            0;

                        padding:
                            2mm;
                    }

                    .ticket{
                        border:
                            none !important;

                        border-radius:
                            0 !important;

                        box-shadow:
                            none !important;

                        background:
                            white !important;
                    }

                    .header{
                        background:
                            white !important;

                        border-bottom:
                            1px dashed black;

                        padding:
                            8px 10px;
                    }

                    .content{
                        padding:
                            8px 10px;
                    }

                    .block{
                        margin-bottom:
                            10px;
                    }

                    .footer{
                        border-top:
                            1px dashed black;

                        padding:
                            6px;

                        color:
                            black !important;
                    }

                    .title,
                    .label,
                    .value,
                    .highlight,
                    .date,
                    .copy-tag,
                    .vector-empty{
                        color:
                            black !important;
                    }

                    .os-id{
                        background:
                            black !important;

                        color:
                            white !important;
                    }

                    .vector-box{
                        background:
                            white !important;

                        border:
                            1px solid black;
                    }

                    .print-btn{
                        display:
                            none !important;
                    }

                    .copyable:hover{
                        color:
                            black !important;
                    }

                    .vector-image{
                        filter:
                            grayscale(1)
                            contrast(1.2);
                    }

                }

            </style>

        </head>

        <body>

            <div class="page">

                <div class="ticket">

                    <div class="header">

                        <div class="header-top">
                            <div class="os-id">
                                #${data.job_uid}
                            </div>

                            <div class="title">
                                ORDEM DE SERVIÇO
                            </div>

                        </div>

                        <div class="date">
                            ${data.date || ""}
                        </div>

                    </div>

                    <div class="content">

                        <div class="block">

                            <div class="label">
                                Cliente
                            </div>

                            <div
                                class="value highlight">
                                ${data.client_name || "-"}
                            </div>

                            <div
                                class="value">
                                ${data.client_phone || "-"}
                            </div>

                        </div>


                        <div class="block">

                            <div class="label">
                                Produto
                            </div>

                            <div class="value">
                                ${data.product_title || "-"}
                            </div>

                        </div>


                        <div class="block">

                            <div class="label">
                                Texto da gravação
                            </div>

                            <div class="value copyable" style="font-family: '${data.font_name || "inherit"}';" onclick="copyText('${(data.text_title || "")}')">
                                ${data.text_title || "Sem texto"}
                            </div>

                        </div>


                        <div class="block">

                            <div class="label">
                                Fonte
                            </div>

                            <div class="value">
                                ${data.font_name || "Nenhuma"}
                            </div>

                        </div>


                        <div class="block">

                            <div class="label">
                                Vetor
                            </div>
                            <div class="vector-box">
                                ${data.vector_url ? `<img id="vectorImage" src="${data.vector_url}" class="vector-image">` : `<div class="vector-empty">Nenhum vetor selecionado</div>`}
                            </div>
                            <div class="value" onclick="copyImage()">
                                ${data.vector_name || "Nenhum"}
                            </div>

                        </div>


                        <div class="block">

                            <div class="label">
                                Observações
                            </div>

                            <div class="value">
                                ${data.obs || "Nenhuma"}
                            </div>

                        </div>

                    </div>

                    <div class="footer">
                        Click Laser • Produção
                    </div>

                </div>

                <button
                    class="print-btn"
                    onclick="window.print()"
                >
                    Imprimir Via de Produção
                </button>

            </div>


            <script>

                async function copyText(text){
                    try{
                        await navigator.clipboard.writeText(text);
                    }catch(e){
                        console.error(e);
                    }
                }

                async function copyImage() {

                    try {

                        const img =
                            document.getElementById("vectorImage");

                        if (!img) return;


                        /*
                        =========================================
                        FETCH ORIGINAL FILE
                        =========================================
                        */

                        const response =
                            await fetch(img.src);

                        const blob =
                            await response.blob();


                        /*
                        =========================================
                        SVG HANDLING
                        =========================================
                        */

                        const isSvg =
                            blob.type.includes("svg") ||
                            img.src.toLowerCase().includes(".svg");


                        /*
                        =========================================
                        SVG -> PNG CONVERSION
                        =========================================
                        */

                        if (isSvg) {

                            const svgText =
                                await blob.text();


                            /*
                            =====================================
                            CREATE SVG IMAGE
                            =====================================
                            */

                            const svgBlob =
                                new Blob(
                                    [svgText],
                                    {
                                        type:
                                            "image/svg+xml"
                                    }
                                );

                            const svgUrl =
                                URL.createObjectURL(svgBlob);

                            const tempImg =
                                new Image();

                            tempImg.src =
                                svgUrl;


                            await new Promise((resolve, reject) => {

                                tempImg.onload =
                                    resolve;

                                tempImg.onerror =
                                    reject;

                            });


                            /*
                            =====================================
                            CREATE CANVAS
                            =====================================
                            */

                            const canvas =
                                document.createElement("canvas");

                            const size =
                                1200;

                            canvas.width =
                                size;

                            canvas.height =
                                size;


                            const ctx =
                                canvas.getContext("2d");


                            /*
                            =====================================
                            WHITE BACKGROUND
                            =====================================
                            */

                            ctx.fillStyle =
                                "#ffffff";

                            ctx.fillRect(
                                0,
                                0,
                                size,
                                size
                            );


                            /*
                            =====================================
                            FIT IMAGE
                            =====================================
                            */

                            const ratio =
                                Math.min(
                                    size / tempImg.width,
                                    size / tempImg.height
                                );

                            const drawWidth =
                                tempImg.width * ratio;

                            const drawHeight =
                                tempImg.height * ratio;

                            const x =
                                (size - drawWidth) / 2;

                            const y =
                                (size - drawHeight) / 2;


                            ctx.drawImage(
                                tempImg,
                                x,
                                y,
                                drawWidth,
                                drawHeight
                            );


                            /*
                            =====================================
                            CONVERT TO PNG
                            =====================================
                            */

                            const pngBlob =
                                await new Promise(resolve =>
                                    canvas.toBlob(
                                        resolve,
                                        "image/png",
                                        1
                                    )
                                );


                            /*
                            =====================================
                            COPY PNG
                            =====================================
                            */

                            await navigator.clipboard.write([
                                new ClipboardItem({
                                    "image/png":
                                        pngBlob
                                })
                            ]);


                            URL.revokeObjectURL(
                                svgUrl
                            );


                            console.log(
                                "[SVG COPIED AS PNG]"
                            );

                            return;

                        }


                        /*
                        =========================================
                        NORMAL IMAGE COPY
                        =========================================
                        */

                        await navigator.clipboard.write([
                            new ClipboardItem({
                                [blob.type]: blob
                            })
                        ]);


                        console.log(
                            "[IMAGE COPIED]"
                        );

                    } catch (error) {

                        console.error(
                            "Erro ao copiar imagem:",
                            error
                        );

                    }

                }


                const vectorImage =
                    document.getElementById("vectorImage");

                if(vectorImage){

                    vectorImage.addEventListener(
                        "click",
                        copyImage
                    );

                }

            </script>

        </body>

        </html>
    `);

    printWindow.document.close();

}

/*
=========================================================
FILTER ORDERS
=========================================================
*/

function filterOrders() {

    /*
    =========================================
    INPUT
    =========================================
    */

    const input =
        document.getElementById(
            "searchInput"
        );

    if (!input) return;


    /*
    =========================================
    FILTER VALUE
    =========================================
    */

    const filter =
        input.value
            .trim()
            .toLowerCase();


    /*
    =========================================
    ALL CARDS
    =========================================
    */

    const cards =
        document.querySelectorAll(
            ".os-card"
        );


    /*
    =========================================
    LOOP
    =========================================
    */

    cards.forEach(card => {

        /*
        =====================================
        JOB ID
        =====================================
        */

        const idElement =
            card.querySelector(
                ".os-id"
            );

        const jobId =
            idElement
                ? idElement.textContent
                    .replace("#", "")
                    .trim()
                    .toLowerCase()
                : "";


        /*
        =====================================
        SHOW / HIDE
        =====================================
        */

        if (
            !filter
            || jobId.includes(filter)
        ) {

            card.style.display =
                "flex";

        } else {

            card.style.display =
                "none";

        }

    });

}


/*
=========================================================
AUTO FILTER
=========================================================
*/

document
    .getElementById("searchInput")
    ?.addEventListener(
        "input",
        filterOrders
    );

/*
=========================================================
VIEW ORDER
=========================================================
*/

function viewOrder(uid) {

    window.open(
        `/about/os/${uid}`,
        "_blank"
    );

}


/*
=========================================================
DELETE ORDER
=========================================================
*/

function deleteOrder(uid) {

    const confirmDelete =
        confirm(
            "Deseja deletar esta OS?"
        );

    if (!confirmDelete)
        return;


    console.log(
        "DELETE:",
        uid
    );

}


/*
=========================================================
LOAD ORDER DATA
=========================================================
*/

async function loadOrderData(uid) {

    /*
    =========================================
    FIND CARD
    =========================================
    */

    const card =
        document.querySelector(
            `.os-card[data-uid="${uid}"]`
        );

    if (!card) {

        alert(
            "OS não encontrada."
        );

        return;

    }


    /*
    =========================================
    EXTRACT DATA
    =========================================
    */

    const clientName =
        card.querySelector(
            ".os-client-name"
        )?.textContent.trim() || "";

    const clientPhone =
        card.querySelector(
            ".os-client-phone"
        )?.textContent.trim() || "";

    const productTitle =
        card.querySelector(
            '.os-field[name="item"] .os-value'
        )?.textContent.trim() || "";

    const engravingText =
        card.querySelector(
            '.os-field[name="text"] .os-value'
        )?.textContent.trim() || "";

    const fontName =
        card.querySelector(
            '.os-field[name="font"] .os-value'
        )?.textContent.trim() || "";

    const vectorName =
        card.querySelector(
            '.os-value[name="vector"]'
        )?.textContent.trim() || "";

    const obs =
        card.querySelector(
            '.os-field[name="obs"] .os-value'
        )?.textContent.trim() || "";


    /*
    =========================================
    SELLER + OBS SPLIT
    =========================================
    */

    let sellerName = "";
    let finalObs = obs;

    if (
        obs.includes("Vendedor:")
    ) {

        const split =
            obs.split("\n");

        const sellerLine =
            split[0];

        sellerName =
            sellerLine
                .replace("Vendedor:", "")
                .trim();

        finalObs =
            split
                .slice(1)
                .join("\n")
                .trim();

    }


    /*
    =========================================
    FILL INPUTS
    =========================================
    */

    document.getElementById(
        "osSeller"
    ).value = sellerName;

    document.getElementById(
        "osClient"
    ).value = clientName;

    document.getElementById(
        "osContact"
    ).value = clientPhone;

    document.getElementById(
        "osProduct"
    ).value = productTitle;

    document.getElementById(
        "osText"
    ).value = engravingText;

    document.getElementById(
        "obsText"
    ).value = finalObs;


    /*
    =========================================
    SELECT FONT
    =========================================
    */

    selectedFont = null;

    document
        .querySelectorAll(".font-card")
        .forEach(card => {

            card.classList.remove(
                "active"
            );

            const cardFontName =
                (
                    card.dataset.fontName ||
                    card.querySelector(".font-name")
                        ?.textContent ||
                    ""
                )
                    .trim();

            if (
                cardFontName === fontName
            ) {

                card.classList.add(
                    "active"
                );

                selectedFont = {

                    font_uid:
                        card.dataset.fontUid || null,

                    font_name:
                        cardFontName

                };

            }

        });


    /*
    =========================================
    SELECT VECTOR
    =========================================
    */

    selectedVector = null;

    document
        .querySelectorAll(".vector-card")
        .forEach(card => {

            card.classList.remove(
                "active"
            );

            const currentVectorName =
                (
                    card.dataset.figureName ||
                    card.querySelector(".vector-title")
                        ?.textContent ||
                    ""
                )
                    .trim();

            if (
                currentVectorName === vectorName
            ) {

                card.classList.add(
                    "active"
                );

                selectedVector = {

                    figure_uid:
                        card.dataset.figureUid || null,

                    figure_name:
                        currentVectorName,

                    figure_url:
                        card.dataset.figureUrl || null

                };

                /*
                ================================
                AUTO SCROLL
                ================================
                */

                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

        });


    /*
    =========================================
    UPDATE PREVIEWS
    =========================================
    */

    updateFontPreviews();


    /*
    =========================================
    OPEN MODAL
    =========================================
    */

    openOSModal(uid);

}
