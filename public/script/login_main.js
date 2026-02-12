document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('page_access');
    const registerForm = document.getElementById('page_register');
    const loader = document.getElementById('page_loader');

    // 1. Verificar "Manter Conectado" ao carregar a página
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
        // Opcional: Validar token com a API aqui
        console.log("Usuário já autenticado via localStorage");
        // window.location.href = "dashboard.html";
    }

    // 2. Lógica de Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('log_email').value;
        const password = document.getElementById('log_pass').value;
        const remember = document.querySelector('input[name="remember"]').checked;

        toggleLoader(true);

        try {
            // Simulando a chamada que você enviou do Worker
            const response = await fetch('/api/login', { // Altere para seu endpoint real
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                // FUNÇÃO MANTER CONECTADO
                if (remember) {
                    localStorage.setItem('auth_token', result.token || 'dummy_token');
                } else {
                    sessionStorage.setItem('auth_token', result.token || 'dummy_token');
                }

                window.location.href = "dashboard.html";
            } else {
                alert(result.error || "Erro ao acessar");
            }
        } catch (err) {
            console.error("Erro:", err);
            alert("Falha na conexão com o servidor.");
        } finally {
            toggleLoader(false);
        }
    });

    // 3. Lógica de Registro (Placeholder)
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Integração de cadastro pendente...");
    });

    function toggleLoader(show) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
});
