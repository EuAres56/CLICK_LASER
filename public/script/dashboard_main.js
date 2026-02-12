// 1. Navegação entre abas
function tab(el, sectionId) {
    // Atualiza links da sidebar
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');

    // Atualiza seções de conteúdo
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// 2. Sistema de Tema (Dark Mode)
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('click-laser-theme', isDark ? 'dark' : 'light');
}

// Persistência do tema
if (localStorage.getItem('click-laser-theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// 3. Logout
function logout() {
    if (confirm("Deseja realmente sair?")) {
        // Lógica de limpeza de token aqui
        window.location.href = "login.html";
    }
}
