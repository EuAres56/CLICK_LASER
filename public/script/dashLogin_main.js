
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


// =========================
// LOGIN
async function login() {
    hideLoader();

    const email = document.getElementById("user_email").value.trim();
    const password = document.getElementById("user_pass").value;

    if (!email || !password) {
        alert("Preencha email e senha");
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
            alert(data?.error || "Erro ao autenticar");
            return;
        }

        // 2. Valida e salva no localStorage
        if (token && data.user_id) {
            localStorage.setItem("token", token);
            localStorage.setItem("user_id", data.user_id); // Salvando o user_id que veio no body

            const user_type = data?.state_account;

            if (!user_type) {
                switchForm('activate');
                return;
            } else {
                window.location.href = "/dashboard";
            }

        } else {
            console.error("Erro: Token ou User_ID ausentes.", { token, user_id: data.user_id });
            alert("Erro ao processar login. Verifique o console.");
        }

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        alert("Erro de conexão com o servidor");
    }
}

async function updatePassword() {
    const newPass = document.getElementById("act_new_pass").value;
    const newPassConfirm = document.getElementById("act_new_pass_confirm").value;

    if (!newPass || !newPassConfirm) {
        alert("Preencha ambos os campos de senha");
        return;
    }

    if (newPass !== newPassConfirm) {
        alert("As senhas não coincidem");
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
            alert(data?.error || "Erro ao atualizar senha");
            return;
        }

        alert("Senha atualizada com sucesso! Faça login novamente.");

        localStorage.clear();

        document.getElementById("act_new_pass").value = "";
        document.getElementById("act_new_pass_confirm").value = "";
        switchForm('login');

    } catch (err) {
        console.error("UPDATE PASSWORD ERROR:", err);
        alert("Erro de conexão com o servidor");
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
