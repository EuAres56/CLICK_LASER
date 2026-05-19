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
                    observation: `Vendedor: ${seller}:\n${obs}`.trim()
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
            job_uid: result.job_uid,
            date: result.order_created_at,
            client_name: client,
            product_title: product,
            text_title: text,
            font_name: selectedFont ? selectedFont.font_name : "Nenhuma",
            vector_name: selectedVector ? selectedVector.figure_name : "Nenhuma",
            obs: `Vendedor: ${seller}:\n${obs}`.trim()
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
        product_title: card.querySelector(".os-field[name='item'] .os-value")?.textContent || "Nenhum",
        text_title: card.querySelector(".os-field[name='text'] .os-value")?.textContent || "Nenhuma",
        font_name: card.querySelector(".os-field[name='font'] .os-value")?.textContent || "Nenhuma",
        vector_name: card.querySelector(".os-value[name='vector']")?.textContent || "Nenhuma",
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
                        "Segoe UI",
                        sans-serif;

                    background:
                        #111;

                    padding:
                        30px;

                    display:
                        flex;

                    justify-content:
                        center;

                    color:
                        #fff;
                }

                .page{
                    width:
                        100%;

                    max-width:
                        420px;
                }

                .ticket{
                    background:
                        #181818;

                    border:
                        1px solid #2a2a2a;

                    border-radius:
                        20px;

                    overflow:
                        hidden;

                    box-shadow:
                        0 20px 50px rgba(0,0,0,.45);
                }

                .header{
                    padding:
                        24px;

                    border-bottom:
                        1px solid #262626;

                    background:
                        linear-gradient(
                            180deg,
                            #1e1e1e,
                            #141414
                        );
                }

                .header-top{
                    display:
                        flex;

                    justify-content:
                        space-between;

                    align-items:
                        center;

                    margin-bottom:
                        10px;
                }

                .title{
                    font-size:
                        24px;

                    font-weight:
                        700;

                    letter-spacing:
                        1px;
                }

                .os-id{
                    background:
                        #ff3b3b;

                    color:
                        #fff;

                    padding:
                        6px 12px;

                    border-radius:
                        999px;

                    font-size:
                        13px;

                    font-weight:
                        700;
                }

                .date{
                    color:
                        #9a9a9a;

                    font-size:
                        13px;
                }

                .content{
                    padding:
                        24px;
                }

                .block{
                    margin-bottom:
                        24px;
                }

                .label{
                    font-size:
                        11px;

                    letter-spacing:
                        1px;

                    text-transform:
                        uppercase;

                    color:
                        #777;

                    margin-bottom:
                        8px;
                }

                .value{
                    font-size:
                        16px;

                    color:
                        #fff;

                    line-height:
                        1.5;
                }

                .highlight{
                    font-size:
                        28px;

                    font-weight:
                        700;
                }

                .copyable{
                    cursor:
                        pointer;

                    position:
                        relative;

                    transition:
                        .2s;
                }

                .copyable:hover{
                    color:
                        #ff4d4d;
                }

                .copyable::after{
                    content:
                        "Clique para copiar";

                    position:
                        absolute;

                    top:
                        -18px;

                    left:
                        0;

                    font-size:
                        11px;

                    color:
                        #888;

                    opacity:
                        0;

                    transition:
                        .2s;
                }

                .copyable:hover::after{
                    opacity:
                        1;
                }

                .vector-box{
                    background:
                        #101010;

                    border:
                        1px solid #2b2b2b;

                    border-radius:
                        16px;

                    padding:
                        16px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    position:
                        relative;

                    min-height:
                        180px;

                    overflow:
                        hidden;
                }

                .copy-tag{
                    position:
                        absolute;

                    top:
                        12px;

                    right:
                        12px;

                    background:
                        rgba(255,255,255,.08);

                    border:
                        1px solid rgba(255,255,255,.08);

                    padding:
                        5px 10px;

                    border-radius:
                        999px;

                    font-size:
                        11px;

                    color:
                        #aaa;
                }

                .vector-image{
                    max-width:
                        100%;

                    max-height:
                        150px;

                    object-fit:
                        contain;

                    cursor:
                        pointer;

                    transition:
                        .25s;
                }

                .vector-image:hover{
                    transform:
                        scale(1.04);
                }

                .vector-empty{
                    border:
                        1px dashed #444;

                    border-radius:
                        14px;

                    padding:
                        30px;

                    text-align:
                        center;

                    color:
                        #777;
                }

                .footer{
                    padding:
                        20px;

                    border-top:
                        1px solid #262626;

                    text-align:
                        center;

                    color:
                        #666;

                    font-size:
                        11px;
                }

                .print-btn{
                    width:
                        100%;

                    margin-top:
                        20px;

                    border:
                        none;

                    background:
                        #ff3b3b;

                    color:
                        white;

                    padding:
                        14px;

                    border-radius:
                        14px;

                    font-size:
                        15px;

                    font-weight:
                        700;

                    cursor:
                        pointer;

                    transition:
                        .2s;
                }

                .print-btn:hover{
                    transform:
                        translateY(-2px);

                    filter:
                        brightness(1.05);
                }

                @media print {

                    body{
                        background:
                            white;

                        padding:
                            0;

                        color:
                            black;
                    }

                    .ticket{
                        box-shadow:
                            none;

                        border:
                            1px solid #000;

                        background:
                            white;
                    }

                    .header{
                        background:
                            white;

                        border-color:
                            #000;
                    }

                    .title,
                    .value,
                    .highlight,
                    .label,
                    .date,
                    .footer,
                    .copy-tag,
                    .vector-empty{
                        color:
                            black !important;
                    }

                    .vector-box{
                        border:
                            1px solid #000;

                        background:
                            white;
                    }

                    .os-id{
                        background:
                            black;

                        color:
                            white;
                    }

                    .print-btn{
                        display:
                            none;
                    }

                    .copyable::after{
                        display:
                            none;
                    }
                }

            </style>

        </head>

        <body>

            <div class="page">

                <div class="ticket">

                    <div class="header">

                        <div class="header-top">

                            <div class="title">
                                ORDEM DE SERVIÇO
                            </div>

                            <div class="os-id">
                                #${data.job_uid}
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

                            <div class="value copyable" style="font-family: '${data.font_name || "inherit"}';"
                                onclick="copyText('${(data.text_title || "")}')"
                            >
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

                            ${data.vector_url ? `<img src="${data.vector_url}" class="vector-image">` : `<div class="vector-empty">Nenhum vetor selecionado</div>`}

                            <div
                                class="value"
                                style="
                                    margin-top:12px;
                                    text-align:center;
                                "
                            >
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

                async function copyImage(){

                    try{

                        const img =
                            document.getElementById("vectorImage");

                        if(!img) return;

                        const response =
                            await fetch(img.src);

                        const blob =
                            await response.blob();

                        await navigator.clipboard.write([
                            new ClipboardItem({
                                [blob.type]: blob
                            })
                        ]);

                    }catch(error){

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
    MOCK
    =========================================
    */

    const mock = {

        seller_name: "Ares",

        client_name: "João",

        client_contact: "74999999999",

        engraving_text: "Pai",

        font_uid: null,

        vector_uid: null

    };


    /*
    =========================================
    FILL INPUTS
    =========================================
    */

    document
        .getElementById("sellerName")
        .value =
        mock.seller_name;

    document
        .getElementById("clientName")
        .value =
        mock.client_name;

    document
        .getElementById("clientContact")
        .value =
        mock.client_contact;

    document
        .getElementById("engravingText")
        .value =
        mock.engraving_text;


    updateFontPreviews();

}
