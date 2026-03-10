
function switchForm(type) {
    document.querySelectorAll('.auth_form').forEach(f => f.classList.remove('active'));
    if (type === 'login') document.getElementById('staff_login').classList.add('active');
    else document.getElementById('staff_activate').classList.add('active');
}


const loader = document.getElementById('page_loader');
function hideLoader() {
    if (loader) {
        loader.classList.toggle('hidden');
    }
}

function uiAlert(message, title = 'Atenção') {
    const modal = document.getElementById('modal-custom-alert');
    const titleEl = document.getElementById('custom-alert-title');
    const messageEl = document.getElementById('custom-alert-message');

    if (!modal) return alert(message); // Fallback

    titleEl.innerText = title;
    messageEl.innerText = message;

    modal.classList.add('show');
}

function closeCustomAlert() {
    const modal = document.getElementById('modal-custom-alert');
    if (modal) {
        modal.classList.remove('show');
    }
}


// =========================
// LOGIN
async function login() {
    hideLoader();

    const email = document.getElementById("user_email").value.trim();
    const password = document.getElementById("user_pass").value;

    if (!email || !password) {
        uiAlert("Preencha email e senha");
        return;
    }

    try {
        const res = await fetch("/api/private/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });


        // 1. Captura o Token do HEADER
        const authHeader = res.headers.get("Authorization");
        let token = null;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1]; // Pega apenas o código após "Bearer "
        }

        const data = await res.json();
        hideLoader();

        if (!res.ok) {
            console.error("LOGIN ERROR:", data);
            uiAlert(data?.error || "Erro ao autenticar", "Erro");
            return;
        }

        // 2. Valida e salva no localStorage
        if (token && data.user_info && data.user_info.uid) {
            localStorage.setItem("auth_token", token);
            localStorage.setItem("user_id", data.user_info.uid); // Salvando o user_id que veio no body
            localStorage.setItem("user_name", data.user_info.name);
            localStorage.setItem("user_level", data.user_info.level);
            localStorage.setItem("map_permissions", JSON.stringify(data.user_info.permissions));

            const user_type = data.user_info?.state_account;

            if (!user_type) {
                switchForm('activate');
                return;
            } else {
                window.location.href = "/dashboard";
            }

        } else {
            console.error("Erro: Token ou User_ID ausentes.", { token, user_id: data.user_info.user_id });
            uiAlert("Erro ao processar login. Verifique o console.", "Aviso");
        }

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        uiAlert("Erro de conexão com o servidor", "Erro");
    }
}

async function updatePassword() {
    const newPass = document.getElementById("act_new_pass").value;
    const newPassConfirm = document.getElementById("act_new_pass_confirm").value;

    if (!newPass || !newPassConfirm) {
        uiAlert("Preencha ambos os campos de senha");
        return;
    }

    if (newPass !== newPassConfirm) {
        uiAlert("As senhas não coincidem");
        return;
    }

    try {
        hideLoader();
        const res = await fetch("/api/private/auth/update-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                'X-User-Id': localStorage.getItem("user_id")
            },
            body: JSON.stringify({ newPassword: newPass })
        });

        const data = await res.json();
        if (!res.ok) {
            console.error("UPDATE PASSWORD ERROR:", data);
            uiAlert(data?.error || "Erro ao atualizar senha", "Erro");
            return;
        }

        uiAlert("Senha atualizada com sucesso! Faça login novamente.", "Sucesso");

        localStorage.clear();

        document.getElementById("act_new_pass").value = "";
        document.getElementById("act_new_pass_confirm").value = "";
        switchForm('login');

    } catch (err) {
        console.error("UPDATE PASSWORD ERROR:", err);
        uiAlert("Erro de conexão com o servidor", "Erro");
    } finally {

        hideLoader();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("staff_login");
    formLogin?.addEventListener("submit", async (e) => {
        e.preventDefault();

        login();
    });

    const formActivate = document.getElementById("staff_activate");
    formActivate?.addEventListener("submit", async (e) => {
        e.preventDefault();
        updatePassword();
    });

});
