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
                seller: "Ares",
                client: "João",
                text: "Pai"
            },

            {
                uid: "2",
                seller: "Maria",
                client: "Carlos",
                text: "Família"
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

function renderOrders(orders) {

    const container =
        document.getElementById(
            "ordersContainer"
        );

    container.innerHTML = "";


    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className =
            "os-card";


        card.innerHTML = `
            <div class="os-top">

                <div class="os-client">
                    ${order.client}
                </div>

                <div class="os-actions">

                    <button
                        onclick="viewOrder('${order.uid}')"
                    >
                        Visualizar
                    </button>

                    <button
                        onclick="openOSModal('${order.uid}')"
                    >
                        Editar
                    </button>

                    <button
                        onclick="deleteOrder('${order.uid}')"
                    >
                        Deletar
                    </button>

                </div>

            </div>

            <div class="os-info">
                ${order.text || "Sem texto"}
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

    const seller =
        document
            .getElementById("sellerName")
            .value
            .trim();

    const client =
        document
            .getElementById("clientName")
            .value
            .trim();

    const contact =
        document
            .getElementById("clientContact")
            .value
            .trim();

    const text =
        document
            .getElementById("engravingText")
            .value
            .trim();


    /*
    =========================================
    VALIDATION
    =========================================
    */

    if (!seller || !client || !contact) {

        alert(
            "Preencha os campos obrigatórios."
        );

        return;

    }


    /*
    =========================================
    BODY
    =========================================
    */

    const body = {

        seller_name: seller,

        client_name: client,

        client_contact: contact,

        engraving_text: text,

        font_uid:
            selectedFont
                ? selectedFont.font_uid
                : null,

        vector_uid:
            selectedVector
                ? selectedVector.figure_uid
                : null

    };


    console.log(
        "[SAVE ORDER]",
        body
    );


    /*
    =========================================
    PRINT
    =========================================
    */

    printOrder(body);


    /*
    =========================================
    RESET
    =========================================
    */

    resetOSForm();

    closeOSModal();

    await loadOrders();

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
