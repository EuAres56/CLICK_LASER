
/*
=====================================================
STATE
=====================================================
*/

let selectedFont = null;

let selectedVector = null;

let editingUid = null;

let deleteUid = null;


/*
=====================================================
MOCK
=====================================================
*/

const osList = [

    {
        uid: "1",
        client: "João Pedro",
        contact: "(74)99999-0000",
        seller: "Carlos",
        text: "Família",
        font: "Script",
        vector: "Águia",
        vector_url: "https://dummyimage.com/300x300/fff/000",
        date: "2026-01-01"
    }

];


/*
=====================================================
RENDER
=====================================================
*/

function renderOS() {

    const grid =
        document.getElementById("osGrid");

    grid.innerHTML = "";

    osList.forEach(os => {

        grid.innerHTML += `

                    <div class="os-card">

                        <div class="os-top">

                            <div class="os-client">

                                <div class="os-name">
                                    ${os.client}
                                </div>

                                <div class="os-contact">
                                    ${os.contact}
                                </div>

                            </div>

                            <div class="os-actions">

                                <button
                                    class="icon-btn view-btn"
                                    onclick="viewOS('${os.uid}')"
                                >
                                    <i class="fa-solid fa-eye"></i>
                                </button>

                                <button
                                    class="icon-btn edit-btn"
                                    onclick="editOS('${os.uid}')"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>

                                <button
                                    class="icon-btn delete-btn"
                                    onclick="openDeleteModal('${os.uid}')"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>

                            </div>

                        </div>

                        <div class="os-info">

                            <div class="info-block">

                                <div class="info-label">
                                    Texto
                                </div>

                                <div class="info-value">
                                    ${os.text || "Nenhum"}
                                </div>

                            </div>

                            <div class="info-block">

                                <div class="info-label">
                                    Fonte
                                </div>

                                <div class="info-value">
                                    ${os.font || "Nenhuma"}
                                </div>

                            </div>

                        </div>

                        ${os.vector_url

                ?

                `
                                <img
                                    class="os-vector"
                                    src="${os.vector_url}"
                                >
                            `

                :

                ""
            }

                    </div>

                `;

    });

}


/*
=====================================================
MODAL
=====================================================
*/

function openCreateModal() {

    editingUid = null;

    document
        .getElementById("modalTitle")
        .innerText =
        "Nova Ordem de Serviço";

    document
        .getElementById("osModal")
        .classList
        .add("active");

}

function closeModal() {

    document
        .getElementById("osModal")
        .classList
        .remove("active");

    clearForm();

}


/*
=====================================================
CLEAR FORM
=====================================================
*/

function clearForm() {

    selectedFont = null;

    selectedVector = null;

    editingUid = null;

    document
        .querySelectorAll("input, textarea")
        .forEach(el => {
            el.value = "";
        });

    document
        .querySelectorAll(".active")
        .forEach(el => {
            el.classList.remove("active");
        });

}


/*
=====================================================
DELETE
=====================================================
*/

function openDeleteModal(uid) {

    deleteUid = uid;

    document
        .getElementById("deleteModal")
        .classList
        .add("active");

}

function closeDeleteModal() {

    document
        .getElementById("deleteModal")
        .classList
        .remove("active");

}

function confirmDelete() {

    console.log(
        "DELETAR:",
        deleteUid
    );

    closeDeleteModal();

}


/*
=====================================================
EDIT
=====================================================
*/

function editOS(uid) {

    editingUid = uid;

    document
        .getElementById("modalTitle")
        .innerText =
        "Editar Ordem de Serviço";

    openCreateModal();

}


/*
=====================================================
VIEW
=====================================================
*/

function viewOS(uid) {

    window.open(
        `/about/os/${uid}`,
        "_blank"
    );

}


/*
=====================================================
SAVE
=====================================================
*/

function saveOS() {

    const payload = {

        seller:
            document
                .getElementById("sellerName")
                .value,

        client:
            document
                .getElementById("clientName")
                .value,

        contact:
            document
                .getElementById("clientContact")
                .value,

        text:
            document
                .getElementById("engravingText")
                .value,

        font:
            selectedFont,

        vector:
            selectedVector,

        editingUid

    };

    console.log(payload);


    /*
    =====================================================
    PRINT THERMAL
    =====================================================
    */

    printTicket(payload);


    /*
    =====================================================
    CLEAR
    =====================================================
    */

    clearForm();

    closeModal();

}


/*
=====================================================
THERMAL PRINT
=====================================================
*/

function printTicket(data) {

    console.log(
        "PRINT CUPOM:",
        data
    );

}


/*
=====================================================
UPDATE PREVIEW
=====================================================
*/

function updateFontPreviews() {

    const text =
        document
            .getElementById("engravingText")
            .value
            .trim() || "ABC";

    document
        .querySelectorAll(".font-preview")
        .forEach(el => {

            el.innerText = text;

        });

}


/*
=====================================================
INIT
=====================================================
*/

renderOS();
