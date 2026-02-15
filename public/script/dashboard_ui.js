// Controle de visualização dos dialogos de notificação e login
function alternateDialogsBox(id_dialog_box = null) {
    const dialogs_box = document.querySelectorAll('.dialog-box');
    dialogs_box.forEach(box => box.classList.remove('active'));

    if (id_dialog_box) {
        const dialog_box = document.getElementById(id_dialog_box);
        dialog_box.classList.add('active');
    }
};


// Função para esconder o loader
function alternateLoader(mode = false) {
    const loader = document.getElementById('page_loader');

    // Ativa loader
    if (loader && !mode) {
        loader.classList.add('hidden');
    } else if (loader) {
        loader.classList.remove('hidden');
    }
}



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
    document.querySelectorAll('.theme-toggle').forEach(btn => btn.innerHTML = localStorage.getItem('click-laser-theme') === 'dark' ? "<i class='bi bi-moon'></i>" : "<i class='bi bi-sun'></i>");
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


// Troca o preview da fonte
function previewFont(fontName, element) {
    // Remove active das outras linhas da lista de fontes
    document.querySelectorAll('#font-list .asset-row').forEach(row => row.classList.remove('active'));
    element.classList.add('active');

    const display = document.getElementById('font-preview-display');
    display.style.fontFamily = fontName;
}

// Troca o preview da imagem
function previewImage(src, element) {
    // Remove active das outras linhas da lista de vetores
    document.querySelectorAll('#vector-list .asset-row').forEach(row => row.classList.remove('active'));
    element.classList.add('active');

    const img = document.getElementById('image-preview-display');
    img.src = src;
}

function openModalNovoAtivo() {
    alert("Aqui abriria o upload de arquivo ou input de nova fonte.");
}


function handleFileImport(input, type) {
    const file = input.files[0];
    if (!file) return;

    if (type === 'font') {
        console.log("Importando fonte:", file.name);
        // Aqui você dispararia o upload para o servidor ou
        // a lógica para ler a fonte e aplicar no preview localmente
        alert(`Fonte "${file.name}" selecionada para importação.`);
    } else {
        console.log("Importando vetor/imagem:", file.name);
        // Lógica de leitura de imagem (FileReader) para preview imediato
        const reader = new FileReader();
        reader.onload = function (e) {
            // Exemplo: Atualiza o preview da imagem imediatamente com o que foi selecionado
            document.getElementById('image-preview-display').src = e.target.result;
        };
        reader.readAsDataURL(file);
        alert(`Arquivo de imagem "${file.name}" carregado.`);
    }

    // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
    input.value = '';
}

function filterAssets(type) {
    if (type === 'font') {
        const searchTerm = document.getElementById('filter-font').value.toLowerCase();
        const items = document.querySelectorAll('#font-list .asset-row');

        items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            item.classList.toggle('hidden', !name.includes(searchTerm));
        });
    }

    else if (type === 'vector') {
        const searchTerm = document.getElementById('filter-vector-name').value.toLowerCase();
        const categoryFilter = document.getElementById('filter-vector-category').value;
        const items = document.querySelectorAll('#vector-list .asset-row');

        items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            const category = item.getAttribute('data-category');

            const matchesSearch = name.includes(searchTerm);
            const matchesCategory = (categoryFilter === 'all' || category === categoryFilter);

            item.classList.toggle('hidden', !(matchesSearch && matchesCategory));
        });
    }
}

function filterStock() {
    const nameSearch = document.getElementById('filter-stock-name').value.toLowerCase();
    const typeFilter = document.getElementById('filter-stock-type').value;
    const colorFilter = document.getElementById('filter-stock-color').value;

    const rows = document.querySelectorAll('#stock-table-body tr');

    rows.forEach(row => {
        const productName = row.getAttribute('data-name').toLowerCase();
        const productType = row.getAttribute('data-type');
        const productColor = row.getAttribute('data-color');

        const matchesName = productName.includes(nameSearch);
        const matchesType = typeFilter === 'all' || productType === typeFilter;
        const matchesColor = colorFilter === 'all' || productColor === colorFilter;

        if (matchesName && matchesType && matchesColor) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function filterStaff() {
    const nameSearch = document.getElementById('filter-staff-name').value.toLowerCase();
    const roleFilter = document.getElementById('filter-staff-role').value;
    const statusFilter = document.getElementById('filter-staff-status').value;

    const rows = document.querySelectorAll('#staff-table-body tr');

    rows.forEach(row => {
        const staffName = row.getAttribute('data-name').toLowerCase();
        const staffRole = row.getAttribute('data-role');
        const staffStatus = row.getAttribute('data-status');

        const matchesName = staffName.includes(nameSearch);
        const matchesRole = roleFilter === 'all' || staffRole === roleFilter;
        const matchesStatus = statusFilter === 'all' || staffStatus === statusFilter;

        row.style.display = (matchesName && matchesRole && matchesStatus) ? "" : "none";
    });
}

function filterSales() {
    const searchTerm = document.getElementById('filter-sale-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-sale-status').value;
    const originFilter = document.getElementById('filter-sale-origin').value;

    const rows = document.querySelectorAll('#sales-table-body tr');

    rows.forEach(row => {
        const searchContent = row.getAttribute('data-search').toLowerCase();
        const status = row.getAttribute('data-status');
        const origin = row.getAttribute('data-origin');

        const matchesSearch = searchContent.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesOrigin = originFilter === 'all' || origin === originFilter;

        row.style.display = (matchesSearch && matchesStatus && matchesOrigin) ? "" : "none";
    });
}

function changeStatus(pedidoId, novoStatus) {
    const confirmacao = confirm(`Mudar pedido ${pedidoId} para status: ${novoStatus}?`);
    if (confirmacao) {
        console.log(`API: Atualizando pedido ${pedidoId} para ${novoStatus}`);
        // Aqui, ao mudar para "Produção", o backend faria ele aparecer na aba "Gravações"
        alert(`Pedido ${pedidoId} agora está ${novoStatus}!`);
    }
}
function openModal(modalId, orderId = null) {
    const modal = document.getElementById(modalId);
    const footer_modal = modal.querySelector('.modal-footer');
    if (!orderId) {
        // Abre o modal de criação
        modal.classList.add('active');
        footer_modal.classList.add('create');
    } else {
        // Abre o modal de edição
        modal.classList.add('active');
        footer_modal.classList.add('update');
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
}
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // ABRE E FECHA O MENU
    const boxMenu = document.querySelector('.main-sidebar');
    const menuBtn = document.querySelector('.header-toggle-menu');
    const menuBtns = document.querySelectorAll('.btn-nav');
    function toggleMenu(mode = false) {

        if (!mode) {
            boxMenu.classList.remove('active');
            menuBtn.classList.remove('active');
            return;
        }
        if (mode) {
            boxMenu.classList.add('active');
            menuBtn.classList.add('active');
            return;
        }
    }

    document.addEventListener('click', e => {
        if (!boxMenu.contains(e.target) && !menuBtn.contains(e.target)) {
            toggleMenu(false);
        }
    })
    menuBtn.addEventListener('click', () => {
        if (menuBtn.classList.contains('active')) {
            toggleMenu(false);
        } else {
            toggleMenu(true);
        }
    });

    menuBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleMenu(false);
        });
    });



    document.addEventListener('click', e => {
        if (!e.target.classList.contains('btn-dialog-show')) {
            alternateDialogsBox();
        }
    })

    document.querySelectorAll('.theme-toggle').forEach(btn => btn.innerHTML = localStorage.getItem('click-laser-theme') === 'dark' ? "<i class='bi bi-moon'></i>" : "<i class='bi bi-sun'></i>");

});
