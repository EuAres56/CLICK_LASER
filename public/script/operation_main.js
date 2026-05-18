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
        TEMP MOCK
        =========================================
        */

        const mock = [

            {
                uid: "1",
                client_name: "Ares",
                client_phone: "(11) 99999-9999",
                text: "Pai",
                font_uid: "ft_1",
                font_name: "Arial",
                figure_uid: "fig_1",
                figure_name: "Estrela",
                figure_url: "/assets/serve/estrela.svg?b=lib"
            },

            {
                uid: "2",
                client_name: "Zeus",
                client_phone: "(21) 98888-8888",
                text: "Rei dos Deuses",
                font_uid: "ft_2",
                font_name: "Times New Roman",
                figure_uid: "fig_2",
                figure_name: "Sol",
                figure_url: "/assets/serve/sol.svg?b=lib"
            }

        ];


        renderOrders(mock);

    } catch (error) {

        console.error(
            "Erro ao carregar OS:",
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


        card.innerHTML = `
            <div class="os-header">
                <div class="os-client-area">
                    <div class="os-client-name">
                        ${order.client_name || "Sem nome"}
                    </div>
                    <div class="os-client-phone">
                        ${order.client_phone || "-"}
                    </div>
                </div>
                <div class="os-id">
                    #${order.id_num || "--"}
                </div>

            </div>


            <div class="os-body">
                <div class="os-content">
                    <div class="os-field">
                        <div class="os-label">Texto</div>
                        <div class="os-value">${order.text || "Sem texto"}</div>
                    </div>
                    <div class="os-row">
                        <div class="os-field">
                            <div class="os-label">Fonte</div>
                            <div class="os-value">${order.font_name || "Nenhuma"}</div>
                        </div>
                    </div>
                </div>
                <div class="os-container">
                    <div class="os-preview">
                        ${order.figure_url ? `<img src="${order.figure_url}" class="os-preview-image">` : `<div class="os-preview-placeholder">Sem Figura</div>`}
                    </div>
                    <div class="os-value">${order.figure_name || "Nenhum"}</div>
                </div>
            </div>
            <div class="os-actions">
                <button class="os-btn view-btn" onclick="viewOrder('${order.uid}')">Visualizar</button>
                <button class="os-btn edit-btn" onclick="openOSModal('${order.uid}')">Editar</button>
                <button class="os-btn delete-btn" onclick="deleteOrder('${order.uid}')">Deletar</button>
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

            client_name:
                client,

            client_phone:
                contact,

            jobs: [

                {

                    product_title:
                        "Gravação Personalizada",

                    text_title:
                        text || null,

                    text_font:
                        selectedFont
                            ? selectedFont.font_name
                            : null,

                    font_uid:
                        selectedFont
                            ? selectedFont.font_uid
                            : null,

                    figure_name:
                        selectedVector
                            ? selectedVector.figure_name
                            : null,

                    figure_url:
                        selectedVector
                            ? selectedVector.figure_url
                            : null,

                    observation:
                        `
Vendedor: ${seller}

${obs}
                        `.trim()

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

        const formData =
            new FormData();

        formData.append(
            "payload",
            JSON.stringify(payload)
        );


        /*
        =========================================
        REQUEST
        =========================================
        */

        const response =
            await fetch(
                "/api/public/operation/orders/create",
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

        const result =
            await response.json();


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

            seller_name:
                seller,

            client_name:
                client,

            client_contact:
                contact,

            engraving_text:
                text,

            font_name:
                selectedFont
                    ? selectedFont.font_name
                    : null,

            vector_name:
                selectedVector
                    ? selectedVector.figure_name
                    : null,

            vector_url:
                selectedVector
                    ? selectedVector.figure_url
                    : null,

            obs:
                obs,

            order_id:
                result.order_id

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
PRINT ORDER
=========================================================
*/

function printOrder(data) {

    const printWindow =
        window.open("", "_blank");

    printWindow.document.write(`
        <html>

        <head>
            <title>OS</title>

            <style>

                body{
                    font-family:Arial;
                    padding:20px;
                }

                h2{
                    margin-bottom:20px;
                }

                p{
                    margin-bottom:10px;
                }

            </style>

        </head>

        <body>

            <h2>ORDEM DE SERVIÇO</h2>

            <p><b>Vendedor:</b> ${data.seller_name}</p>

            <p><b>Cliente:</b> ${data.client_name}</p>

            <p><b>Contato:</b> ${data.client_contact}</p>

            <p><b>Texto:</b> ${data.engraving_text || "-"}</p>

            <p><b>Fonte:</b> ${selectedFont
            ? selectedFont.font_name
            : "-"
        }</p>

            <p><b>Vetor:</b> ${selectedVector
            ? selectedVector.figure_name
            : "-"
        }</p>

            ${selectedVector
            ? `
                    <img
                        src="${selectedVector.figure_url}"
                        style="
                            width:180px;
                            margin-top:20px;
                        "
                    >
                `
            : ""
        }

            <script>
                window.print();
                window.close();
            <\/script>

        </body>

        </html>
    `);

}


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
