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
WHATSAPP
=========================================================
*/

function sendWhatsApp() {

    const client =
        document.getElementById(
            "clientName"
        ).value;

    const contact =
        document.getElementById(
            "clientContact"
        ).value;

    const text =
        document.getElementById(
            "engravingText"
        ).value || "Nenhum";


    const font =
        selectedFont
            ? selectedFont.font_name
            : "Nenhuma";


    const figure =
        selectedVector
            ? selectedVector.figure_name
            : "Nenhuma";


    /*
    =========================================
    IMAGE URL
    =========================================
    */

    let figureUrl = null;

    if (selectedVector?.figure_url) {

        /*
        =========================================
        URL ABSOLUTA
        =========================================
        */

        if (
            selectedVector.figure_url.startsWith("/api/")
        ) {

            figureUrl =
                window.location.origin +
                selectedVector.figure_url;

        } else {

            figureUrl =
                selectedVector.figure_url;

        }

    }


    /*
    =========================================
    DATE
    =========================================
    */

    const now = new Date();

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
        `*Dados da Gravação*
Cliente: "${client}"
Contato: "${contact}"

Texto: "${text}"
Fonte: "${font}"
Figura: "${figure}"

Data: ${formattedDate}`;


    /*
    =========================================
    ADD IMAGE LINK
    =========================================
    */

    if (figureUrl) {

        message +=

            `\n\n*Imagem Selecionada:*
${figureUrl}`;

    }


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
