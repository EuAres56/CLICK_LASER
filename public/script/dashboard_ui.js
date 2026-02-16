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
function previewImageVector(src, element) {
    // Remove active das outras linhas da lista de vetores
    document.querySelectorAll('#vector-list .asset-row').forEach(row => row.classList.remove('active'));
    element.classList.add('active');

    const img = document.getElementById('image-preview-display');
    img.src = src;
}

function handleFileImport(input, type) {
    const file = input.files[0];
    if (!file) return;

    if (type === 'font') {
        // Aqui você dispararia o upload para o servidor ou
        // a lógica para ler a fonte e aplicar no preview localmente
        alert(`Fonte "${file.name}" selecionada para importação.`);
    } else {
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
    const nameSearch = document.getElementById('filter-stock-title').value.toLowerCase();
    const typeFilter = document.getElementById('filter-stock-type').value.toLowerCase();
    const colorFilter = document.getElementById('filter-stock-color').value.toLowerCase();

    const rows = document.querySelectorAll('#stock-table-body tr');

    rows.forEach(row => {
        const productName = row.getAttribute('data-search').toLowerCase();
        const productType = row.getAttribute('data-type').toLowerCase();
        const productColor = row.getAttribute('data-color').toLowerCase();

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
        // Aqui, ao mudar para "Produção", o backend faria ele aparecer na aba "Gravações"
        alert(`Pedido ${pedidoId} agora está ${novoStatus}!`);
    }
}


// Delegue o evento para o document ou use um loop corrigido
document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-for-modal');
    if (!btn) return;

    const uid = btn.dataset.uid;
    const modalId = btn.dataset.modal;
    const callbackStr = btn.dataset.callback;

    if (uid && callbackStr) {
        const parts = callbackStr.split('.'); // ['actions', 'getProductDetails']
        const funcName = parts.pop(); // Remove e guarda o último (a função)
        const parent = parts.reduce((obj, prop) => obj[prop], window); // O que sobrou é o pai
        const fillCallback = parent[funcName];

        if (typeof fillCallback === 'function') {
            // .call(parent, ...) força o 'this' a ser o objeto 'actions'
            await fillCallback.call(parent, uid, { currentTarget: btn });
            openModal(modalId, 'update', uid);
        }
    } else if (modalId) {
        openModal(modalId, 'create');
    }
});

function openModal(modalId, mode = 'create', uid = "") {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const footer_modal = modal.querySelector('.modal-footer');

    // Limpeza de estado
    modal.dataset.uid = uid;
    footer_modal.classList.remove('create', 'update');

    if (mode === 'create') {
        modal.dataset.originalData = "";
        modal.querySelectorAll('input').forEach(i => i.value = "");
        modal.querySelectorAll('textarea').forEach(i => i.value = "");
        modal.querySelectorAll('.img-preview').forEach(img => img.style.display = 'none');
        footer_modal.classList.add('create');
    } else {
        footer_modal.classList.add('update');
    }

    modal.classList.add('active');
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


function previewImage(source, targetId) {
    const preview = document.getElementById(targetId);

    if (typeof source === 'string') {
        if (source && source.trim() !== "") {
            preview.src = source;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        return;
    }

    const file = source.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

// ESTA LINHA É A CHAVE: Torna a função visível para o HTML
window.previewImage = previewImage;

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



const ui = {
    toggleLoader: (btn, state = 'start') => {
        if (!btn) return;

        if (state === 'start') {
            btn.dataset.oldHtml = btn.innerHTML; // Salva o ícone original (o pincel)
            btn.classList.add("active");
            btn.disabled = true; // Evita múltiplos cliques
        }
        else if (state === 'success' || state === 'fail') {
            btn.classList.add(state);
            btn.innerHTML = state === 'success'
                ? `<i class="text_success bi bi-check"></i>`
                : `<i class="text_fail bi bi-exclamation-circle"></i>`;

            // Retorna ao normal após um tempo
            setTimeout(() => {
                btn.classList.remove("active", "success", "fail");
                btn.innerHTML = btn.dataset.oldHtml;
                btn.disabled = false;
            }, 1500);
        }
    }
};
