/*
=========================================================
DIALOG SYSTEM
=========================================================
*/

let currentStep = 0;

const steps =
    document.querySelectorAll(".step");

const progressBar =
    document.getElementById("progressBar");

let selectedFont = null;
let selectedVector = null;


/*
=========================================================
INIT
=========================================================
*/

window.addEventListener("DOMContentLoaded", async () => {

    await loadFonts();

    await loadVectors();

});

/*
=========================================================
UPDATE FONT PREVIEWS
=========================================================
*/

function updateFontPreviews() {

    const text =
        document
            .getElementById("engravingText")
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

        const fonts = await response.json();

        const container =
            document.getElementById(
                "fontsContainer"
            );

        container.innerHTML = "";

        fonts.forEach(font => {

            /*
            =========================================
            LOAD FONT
            =========================================
            */

            if (font.font_url) {

                const fontFace = new FontFace(
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

            card.className = "font-card";


            const previewText =
                document
                    .getElementById("engravingText")
                    ?.value
                    ?.trim() || "ABC";


            card.innerHTML = `
                <div
                    class="font-preview"
                    style="font-family:'${font.font_name}'"
                >
                    ${previewText}
                </div>

                <div>
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

        /*
        =========================================================
        FETCH
        =========================================================
        */

        const response =
            await fetch(
                "/api/public/dialog/vectors/load"
            );


        /*
        =========================================================
        RESPONSE VALIDATION
        =========================================================
        */

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        /*
        =========================================================
        RAW RESPONSE
        =========================================================
        */

        const text =
            await response.text();

        console.log(
            "[RAW VECTORS RESPONSE]",
            text
        );


        /*
        =========================================================
        PARSE JSON
        =========================================================
        */

        const categories =
            JSON.parse(text);

        console.log(
            "[PARSED CATEGORIES]",
            categories
        );


        /*
        =========================================================
        ELEMENTS
        =========================================================
        */

        const tabs =
            document.getElementById(
                "catalogTabs"
            );

        const grid =
            document.getElementById(
                "vectorsGrid"
            );

        tabs.innerHTML = "";
        grid.innerHTML = "";


        /*
        =========================================================
        CATEGORY NAMES
        =========================================================
        */

        const categoryNames =
            Object.keys(categories);

        console.log(
            "[CATEGORY NAMES]",
            categoryNames
        );


        /*
        =========================================================
        EMPTY
        =========================================================
        */

        if (categoryNames.length === 0) {

            grid.innerHTML =
                `<div style="color:#999;">
                    Nenhum vetor encontrado
                </div>`;

            return;

        }


        /*
        =========================================================
        RENDER CATEGORY
        =========================================================
        */

        function renderCategory(category) {

            grid.innerHTML = "";


            /*
            =========================================
            INVALID CATEGORY
            =========================================
            */

            if (
                !Array.isArray(
                    categories[category]
                )
            ) {

                console.warn(
                    "Categoria inválida:",
                    category
                );

                return;

            }


            /*
            =========================================
            RENDER ITEMS
            =========================================
            */

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
                            loading="lazy"
                        >

                        <div class="vector-name">
                            ${fig.figure_name}
                        </div>
                    `;


                    /*
                    =====================================
                    SELECT
                    =====================================
                    */

                    card.onclick = () => {

                        document
                            .querySelectorAll(".vector-card")
                            .forEach(el => {

                                el.classList.remove(
                                    "active"
                                );

                            });

                        card.classList.add(
                            "active"
                        );

                        selectedVector = fig;

                    };


                    grid.appendChild(card);

                });

        }


        /*
        =========================================================
        CREATE TABS
        =========================================================
        */

        categoryNames.forEach(
            (category, index) => {

                const tab =
                    document.createElement("div");

                tab.className =
                    "catalog-tab";


                if (index === 0) {

                    tab.classList.add(
                        "active"
                    );

                }


                tab.innerText =
                    category;


                tab.onclick = () => {

                    document
                        .querySelectorAll(".catalog-tab")
                        .forEach(el => {

                            el.classList.remove(
                                "active"
                            );

                        });

                    tab.classList.add(
                        "active"
                    );

                    renderCategory(category);

                };


                tabs.appendChild(tab);

            }
        );


        /*
        =========================================================
        FIRST CATEGORY
        =========================================================
        */

        renderCategory(
            categoryNames[0]
        );

    } catch (error) {

        console.error(
            "[LOAD VECTORS ERROR]",
            error
        );

    }

}


/*
=========================================================
STEPS
=========================================================
*/

function showStep(index) {

    steps.forEach(step => {

        step.classList.remove("active");

    });

    steps[index].classList.add("active");

    progressBar.style.width =
        ((index + 1) / steps.length) * 100 + "%";


    /*
    =========================================
    UPDATE RESUME
    =========================================
    */

    if (index === 4) {

        updateResume();

    }


    /*
    =========================================
    SCROLL TOP
    =========================================
    */

    scrollToTopStep();

}


function nextStep() {

    /*
    =========================================
    SKIP FONT STEP
    =========================================
    */

    if (currentStep === 1) {

        const text =
            document
                .getElementById(
                    "engravingText"
                )
                .value
                .trim();

        if (text === "") {

            currentStep = 3;

            showStep(currentStep);

            return;

        }

    }


    /*
    =========================================
    NORMAL
    =========================================
    */

    if (currentStep < steps.length - 1) {

        currentStep++;

        showStep(currentStep);

    }

}


function prevStep() {

    /*
    =========================================
    RETURN SKIPPING FONT
    =========================================
    */

    if (currentStep === 3) {

        const text =
            document
                .getElementById(
                    "engravingText"
                )
                .value
                .trim();

        if (text === "") {

            currentStep = 1;

            showStep(currentStep);

            return;

        }

    }


    /*
    =========================================
    NORMAL
    =========================================
    */

    if (currentStep > 0) {

        currentStep--;

        showStep(currentStep);

    }

}

/*
=========================================================
SCROLL TOP
=========================================================
*/

function scrollToTopStep() {

    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}

/*
=========================================================
RESUME
=========================================================
*/

function updateResume() {

    document.getElementById(
        "resumeName"
    ).innerText =
        document.getElementById(
            "clientName"
        ).value || "-";


    document.getElementById(
        "resumeContact"
    ).innerText =
        document.getElementById(
            "clientContact"
        ).value || "-";


    document.getElementById(
        "resumeText"
    ).innerText =
        document.getElementById(
            "engravingText"
        ).value || "Nenhum";


    document.getElementById(
        "resumeFont"
    ).innerText =
        selectedFont
            ? selectedFont.font_name
            : "Nenhuma";


    const resumeFigure =
        document.getElementById(
            "resumeFigure"
        );

    const resumeFigureImage =
        document.getElementById(
            "resumeFigureImage"
        );


    if (selectedVector) {

        resumeFigure.innerText =
            selectedVector.figure_name;

        resumeFigureImage.src =
            selectedVector.figure_url;

        resumeFigureImage.style.display =
            "block";

    } else {

        resumeFigure.innerText =
            "Nenhuma";

        resumeFigureImage.style.display =
            "none";

    }

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

        const obs =
            document
                .getElementById("resumeObs")
                .value
                .trim();


        /*
        =========================================
        VALIDATION
        =========================================
        */

        if (!client || !contact) {

            alert(
                "Preencha cliente e contato."
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
                        "Não definido",

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
                        obs || null

                }

            ]

        };


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
                "/api/public/dialog/orders/create",
                {
                    method: "POST",
                    body: formData
                }
            );


        /*
        =========================================
        RAW RESPONSE
        =========================================
        */

        const rawText =
            await response.text();

        console.log(
            "[SAVE ORDER RAW]",
            rawText
        );


        /*
        =========================================
        PARSE RESPONSE
        =========================================
        */

        let result = null;

        try {

            result =
                JSON.parse(rawText);

        } catch {

            throw new Error(
                "Resposta inválida do servidor."
            );

        }


        /*
        =========================================
        ERROR RESPONSE
        =========================================
        */

        if (!response.ok) {

            console.error(result);

            alert(
                result.error ||
                "Erro ao salvar OS."
            );

            return;

        }


        /*
        =========================================
        SUCCESS
        =========================================
        */

        console.log(
            "[ORDER CREATED]",
            result
        );


        /*
        =========================================
        SEND WHATSAPP
        =========================================
        */

        sendWhatsApp(result);


        /*
        =========================================
        FINISH SCREEN
        =========================================
        */

        showFinishScreen(
            true,
            result
        );


    } catch (error) {

        showFinishScreen(
            false,
            {
                error:
                    error.message ||
                    "Erro inesperado."
            }
        );

    }

}


/*
=========================================================
WHATSAPP
=========================================================
*/

function sendWhatsApp(orderData) {

    /*
    =========================================
    SAFE DATA
    =========================================
    */

    const order =
        orderData.order || {};

    const job =
        orderData.job || {};


    /*
    =========================================
    ORDER DATA
    =========================================
    */

    const client =
        order.client_name || "Não informado";

    const contact =
        order.client_phone || "Não informado";

    const orderId =
        order.id_num || "N/A";


    /*
    =========================================
    JOB DATA
    =========================================
    */

    const jobUid =
        job.uid || "N/A";

    const text =
        job.job_text_title || "Nenhum";

    const font =
        job.job_text_font || "Nenhuma";

    const figure =
        job.job_figure_name || "Nenhuma";

    const obs =
        job.job_observ || "Nenhuma";


    /*
    =========================================
    IMAGE URL
    =========================================
    */

    let figureUrl = null;

    if (job.job_figure_url) {

        if (
            job.job_figure_url.startsWith("/api/")
        ) {

            figureUrl =
                window.location.origin +
                job.job_figure_url;

        } else {

            figureUrl =
                job.job_figure_url;

        }

    }


    /*
    =========================================
    DATE
    =========================================
    */

    const now =
        new Date();

    const formattedDate =
        now.toLocaleDateString("pt-BR")
        + " - "
        + now.toLocaleTimeString("pt-BR");


    /*
    =========================================
    MESSAGE
    =========================================
    */

    let message =
        `
ID da OS: ${jobUid}

Cliente: ${client}
Contato: ${contact}

Acabei de escolher minha gravação no sistema da Click Phone.

Data: ${formattedDate}`;

    /*
    =========================================
    WHATSAPP NUMBER
    =========================================
    */

    const phone =
        "5574998005640";


    /*
    =========================================
    OPEN WHATSAPP
    =========================================
    */

    const url =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;


    window.open(
        url,
        "_blank"
    );

}

/*
=========================================================
VALIDATE STEP 1
=========================================================
*/

function validateStep1() {

    const name =
        document
            .getElementById("clientName")
            .value
            .trim();

    const contact =
        document
            .getElementById("clientContact")
            .value
            .trim();

    const error =
        document
            .getElementById("step1Error");


    /*
    =========================================
    VALIDATION
    =========================================
    */

    if (!name || !contact) {

        error.style.display = "block";

        return;
    }


    /*
    =========================================
    SUCCESS
    =========================================
    */

    error.style.display = "none";

    nextStep();

}

/*
=========================================================
FINISH SCREEN
=========================================================
*/

function showFinishScreen(success, data = {}) {

    const icon =
        document.getElementById(
            "finishIcon"
        );

    const title =
        document.getElementById(
            "finishTitle"
        );

    const text =
        document.getElementById(
            "finishText"
        );


    /*
    =========================================
    SUCCESS
    =========================================
    */

    if (success) {

        icon.classList.remove("error");

        icon.innerHTML = "✓";

        title.innerText =
            "Ordem criada com sucesso";

        text.innerHTML =
            `
            OS Nº <b>${data.order?.id_num || "-"}</b><br>
            Job UID: <b>${data.job?.uid || "-"}</b><br><br>
            A mensagem foi aberta no WhatsApp.
            `;

    }

    /*
    =========================================
    ERROR
    =========================================
    */

    else {

        icon.classList.add("error");

        icon.innerHTML = "!";

        title.innerText =
            "Erro ao criar ordem";

        text.innerHTML =
            data.error ||
            "Não foi possível concluir a operação.";

    }


    /*
    =========================================
    SHOW STEP
    =========================================
    */

    currentStep = 5;

    showStep(currentStep);

}


/*
=========================================================
RESTART
=========================================================
*/

function restartDialog() {

    /*
    =========================================
    RESET FORM
    =========================================
    */

    document
        .querySelectorAll("input, textarea")
        .forEach(el => {

            el.value = "";

        });


    /*
    =========================================
    RESET SELECTS
    =========================================
    */

    selectedFont = null;
    selectedVector = null;


    /*
    =========================================
    REMOVE ACTIVE
    =========================================
    */

    document
        .querySelectorAll(".font-card, .vector-card")
        .forEach(el => {

            el.classList.remove("active");

        });


    /*
    =========================================
    RETURN STEP 0
    =========================================
    */

    currentStep = 0;

    showStep(currentStep);

}
