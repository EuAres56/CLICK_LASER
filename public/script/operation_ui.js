/*
=========================================
MENU
=========================================
*/

const items =
    document.querySelectorAll(".menu-item");

const pages =
    document.querySelectorAll(".page");

const activeBg =
    document.querySelector(".active-bg");

function moveActive(item) {

    activeBg.style.top =
        item.offsetTop + "px";
}

items.forEach(item => {

    item.addEventListener("click", e => {

        e.preventDefault();

        /*
        =========================
        ACTIVE MENU
        =========================
        */

        items.forEach(el => {

            el.classList.remove("active");
        });

        item.classList.add("active");

        moveActive(item);

        /*
        =========================
        ACTIVE PAGE
        =========================
        */

        const page =
            item.dataset.page;

        pages.forEach(pg => {

            pg.classList.remove("active");
        });

        document
            .getElementById(page)
            .classList.add("active");
    });

});

/*
=========================================
INITIAL POSITION
=========================================
*/

window.addEventListener("load", () => {

    const active =
        document.querySelector(".menu-item.active");

    moveActive(active);
});

/*
=========================================
THEME SWITCH
=========================================
*/

const themeSwitch =
    document.getElementById("themeSwitch");

themeSwitch.addEventListener("click", () => {

    document.body.classList.toggle("dark");
});

/*
=========================================================
STATUS DROPDOWN
=========================================================
*/

document.querySelectorAll(".os-status").forEach(status => {

    status.addEventListener("click", e => {

        e.stopPropagation();

        const wrapper =
            status.closest(".os-status-wrapper");

        /* CLOSE OTHERS */

        document
            .querySelectorAll(".os-status-wrapper")
            .forEach(item => {

                if (item !== wrapper) {

                    item.classList.remove("open");
                }
            });

        wrapper.classList.toggle("open");
    });

});

/*
=========================================================
CLOSE CLICK OUTSIDE
=========================================================
*/

document.addEventListener("click", () => {

    document
        .querySelectorAll(".os-status-wrapper")
        .forEach(item => {

            item.classList.remove("open");
        });

});

