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

        console.log(fonts);

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

                fontFace.load().then(f => {
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

            card.innerHTML = `
                <div
                    class="font-preview"
                    style="font-family:'${font.font_name}'"
                >
                    ABC
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

        const response =
            await fetch(
                "/api/public/dialog/vectors/load"
            );

        const categories =
            await response.json();

        const tabs =
            document.getElementById(
                "catalogTabs"
            );

        const grid =
            document.getElementById(
                "vectorsGrid"
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

            categories[category].forEach(fig => {

                const card =
                    document.createElement("div");

                card.className =
                    "vector-card";

                card.innerHTML = `
                    <img src="${fig.figure_url}">

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
        TABS
        =========================================
        */

        categoryNames.forEach(
            (category, index) => {

                const tab =
                    document.createElement("div");

                tab.className =
                    "catalog-tab";

                if (index === 0) {
                    tab.classList.add("active");
                }

                tab.innerText = category;

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

            }
        );


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

    if (index === 5) {
        updateResume();
    }

}


function nextStep() {

    /*
    =========================================
    SKIP FONT STEP
    =========================================
    */

    if (currentStep === 2) {

        const text =
            document
                .getElementById(
                    "engravingText"
                )
                .value
                .trim();

        if (text === "") {

            currentStep = 4;

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

    if (currentStep === 4) {

        const text =
            document
                .getElementById(
                    "engravingText"
                )
                .value
                .trim();

        if (text === "") {

            currentStep = 2;

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


    document.getElementById(
        "resumeFigure"
    ).innerText =
        selectedVector
            ? selectedVector.figure_name
            : "Nenhuma";

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


    const now = new Date();

    const formattedDate =
        now.toLocaleDateString("pt-BR")
        + " - "
        + now.toLocaleTimeString("pt-BR");


    const message =
        `*Dados da Gravação*
Cliente: "${client}"
Contato: "${contact}"

Texto: "${text}"
Fonte: "${font}"
Figura: "${figure}"

Data: ${formattedDate}`;


    /*
    =========================================
    WHATSAPP NUMBER
    =========================================
    */

    const phone =
        "5587999999999";


    const url =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;


    window.open(
        url,
        "_blank"
    );

}
