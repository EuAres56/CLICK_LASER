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


document.addEventListener('click', async e => {
    const btn = e.target;
    if (!btn) return;
    if (!btn.classList.contains('btn-req')) return;
    console.log(btn);
    btn.classList.add('loading');
    document.querySelectorAll(['button', 'a', 'input', 'select', '.btn-local', '.btn-req']).forEach(bt => bt.classList.add('disabled'));

});


function resLoading(btn = null, result = false, callback = null) {
    if (!btn) return;

    const last_html = btn.innerHTML; // Nota: Veja a observação abaixo sobre o escopo
    btn.classList.add(result ? 'success' : 'fail');
    btn.innerHTML = result ? `<i class="bi bi-check"></i>` : `<i class="bi bi-x"></i>`;

    document.querySelectorAll(['button', 'a', 'input', 'select', '.btn-local', '.btn-req']).forEach(bt => bt.classList.remove('disabled'));

    setTimeout(() => {
        btn.classList.remove('loading', 'success', 'fail'); // Adicionei 'fail' para limpar tudo
        btn.innerHTML = last_html;

        setTimeout(() => {
            // Executa o callback se ele existir e for uma função
            if (callback && typeof callback === 'function') {
                callback();
            }
        }, 300);
    }, 1200);
}

// Delegue o evento para o document ou use um loop corrigido
document.addEventListener('click', async e => {
    const btn = e.target;
    if (!btn || !btn.classList.contains('btn-for-modal')) return;

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
            resLoading(btn, true);
            openModal(modalId, 'update', uid);
        }
    } else if (modalId) {
        resLoading(btn, true);
        openModal(modalId, 'create');
    } else {
        resLoading(btn, false);
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


document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.form-box-list');

    container.addEventListener('click', (e) => {
        const btn = e.target;

        // Filtra apenas cliques nos botões de ação
        if (!btn.classList.contains('btn-local')) return;

        const cardAtual = btn.closest('.form-card');
        const icone = btn.querySelector('i');

        if (icone.classList.contains('bi-plus')) {
            const novo = criarCardLimpo(container);
            inserirEPresentar(cardAtual, novo);
        }
        else if (icone.classList.contains('bi-copy')) {
            const copia = cardAtual.cloneNode(true);
            inserirEPresentar(cardAtual, copia);
        }
        else if (icone.classList.contains('bi-dash')) {
            removerComAnimacao(cardAtual, container);
        }
    });

    // Função para clonar o primeiro card e limpar seus valores
    function criarCardLimpo(pai) {
        const modelo = pai.querySelector('.form-card');
        const novo = modelo.cloneNode(true);

        novo.querySelectorAll('input, select').forEach(el => el.value = '');
        novo.querySelectorAll('.img-preview').forEach(img => img.src = '');

        const exampleText = novo.querySelector('.font-example span');
        if (exampleText) exampleText.innerText = 'Sem texto aplicado';

        return novo;
    }

    // Gerencia a inserção, animação, scroll e foco
    function inserirEPresentar(referencia, novo) {
        novo.classList.add('card-anim-in');
        referencia.after(novo);

        atualizarIndices(container);

        // O segredo está aqui: request + timeout para forçar a troca de foco
        requestAnimationFrame(() => {
            novo.scrollIntoView({ behavior: 'smooth', block: 'start' });

            setTimeout(() => {
                const primeiroInput = novo.querySelector('input, select, textarea');
                if (primeiroInput) {
                    primeiroInput.focus({ preventScroll: true });
                    // preventScroll evita que o focus dê um "salto" conflitando com o scroll suave
                }
            }, 50); // Pequeno delay para garantir que o navegador soltou o foco anterior
        });

        setTimeout(() => novo.classList.remove('card-anim-in'), 400);
    }

    function removerComAnimacao(card, pai) {
        const totalCards = pai.querySelectorAll('.form-card').length;
        if (totalCards <= 1) return;

        const cardAcima = card.previousElementSibling;
        card.classList.add('card-anim-out');

        card.addEventListener('animationend', () => {
            card.remove();
            atualizarIndices(pai);

            if (cardAcima) {
                cardAcima.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const inputAcima = cardAcima.querySelector('input');
                if (inputAcima) inputAcima.focus();
            }
        }, { once: true });
    }

    function atualizarIndices(pai) {
        const cards = pai.querySelectorAll('.form-card');
        cards.forEach((card, index) => {
            const spanNumero = card.querySelector('.cad-header-left span:nth-child(2) strong');
            if (spanNumero) {
                const num = (index + 1).toString().padStart(2, '0');
                spanNumero.innerText = num;
            }
        });
    }
});


function alternarModoCriador(toggle) {
    const card = toggle.closest('.form-card');
    const modoPadrao = card.querySelector('.mode-default-fields');
    const modoCriador = card.querySelector('.mode-creator-fields');

    if (toggle.checked) {
        modoPadrao.classList.add('d-none');
        modoCriador.classList.remove('d-none');
    } else {
        // Se o usuário desativar o modo criador, limpamos a arte customizada por segurança
        excluirArteCustom(card.querySelector('.btn-delete-art'));
        modoPadrao.classList.remove('d-none');
        modoCriador.classList.add('d-none');
    }
}

function abrirCriadorStaff(btn) {
    const card = btn.closest('.form-card');
    const inputJson = card.querySelector('.json-arte-final');
    const jsonExistente = inputJson.value;

    // Aqui você chama a função do seu criador passando o JSON existente (se houver)
    // Exemplo: CriadorProfissional.abrir({
    //    data: jsonExistente,
    //    onSave: (novoJson) => salvarRetornoCriador(card, novoJson)
    // });

    // Simulação de retorno de arte:
    const mockJson = '{"layers": [...]}';
    salvarRetornoCriador(card, mockJson);
}

function salvarRetornoCriador(card, json) {
    const inputJson = card.querySelector('.json-end-art');
    const emptyState = card.querySelector('.art-empty-state');
    const activeState = card.querySelector('.art-active-state');

    inputJson.value = json;
    emptyState.classList.add('d-none');
    activeState.classList.remove('d-none');
}

function excluirArteCustom(btn) {
    const card = btn.closest('.form-card');
    const inputJson = card.querySelector('.json-end-art');
    const emptyState = card.querySelector('.art-empty-state');
    const activeState = card.querySelector('.art-active-state');

    inputJson.value = "";
    emptyState.classList.remove('d-none');
    activeState.classList.add('d-none');
}
