const ui = {
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('click-laser-theme', isDark ? 'dark' : 'light');
        document.querySelectorAll('.theme-toggle').forEach(btn => btn.innerHTML = localStorage.getItem('click-laser-theme') === 'dark' ? "<i class='bi bi-moon'></i>" : "<i class='bi bi-sun'></i>");
    },

    // Inicia o tema
    init() {
        if (localStorage.getItem('click-laser-theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
    },

    toggleMenu(mode = false) {
        const boxMenu = document.querySelector('.main-sidebar');
        const menuBtn = document.querySelector('.header-toggle-menu');

        // Força a presença da classe baseado no booleano 'mode'
        boxMenu.classList.toggle('active', mode);
        menuBtn.classList.toggle('active', mode);
    },

    // Navegação entre abas
    tab(el, sectionId) {
        // Atualiza links da sidebar
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        el.classList.add('active');

        // Atualiza seções de conteúdo
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    },

    // Inicia ou finaliza o loader
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
    },

    // Controle de visualização dos dialogos de notificação e login
    alternateDialogsBox(id_dialog_box = null) {
        const dialogs_box = document.querySelectorAll('.dialog-box');
        dialogs_box.forEach(box => box.classList.remove('active'));

        if (id_dialog_box) {
            const dialog_box = document.getElementById(id_dialog_box);
            dialog_box.classList.add('active');
        }
    },

    // Função para esconder o loader
    alternateLoader(mode = false) {
        const loader = document.getElementById('page_loader');

        // Ativa loader
        if (loader && !mode) {
            loader.classList.add('hidden');
        } else if (loader) {
            loader.classList.remove('hidden');
        }
    },

    // Troca o preview da fonte
    previewFont(fontName, element, renderElement) {
        renderElement.style.fontFamily = fontName;
    },

    // Troca o preview da imagem
    previewImageVector(src, element, renderElement) {
        renderElement.src = src;
    },

    // Abertura de modais
    openModal(modalId, mode = 'create', uid = "") {
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
    },

    // Fechamento de modais
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
    },

    // Resposta do loader
    resLoading(btn = null, result = false, callback = null) {
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
    },

    // Controle de visibilidade dos resultados
    toggleEmptyResults(container, type, term) {
        let emptyMsg = container.querySelector('.no-results-found');
        const hasVisible = Array.from(container.querySelectorAll(`.${type}`))
            .some(el => !el.classList.contains('d-none'));

        if (!hasVisible && term !== "") {
            if (!emptyMsg) {
                emptyMsg = document.createElement('div');
                emptyMsg.className = 'no-results-found p-2 text-muted small text-center';
                emptyMsg.innerText = 'Nenhum resultado encontrado.';
                container.appendChild(emptyMsg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }
};

const uiCards = {
    // Clona o primeiro card da lista e limpa seus valores
    createCleanCard(parent) {
        const model = parent.querySelector('.form-card');
        const newCard = model.cloneNode(true);

        newCard.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'radio' || el.type === 'checkbox') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });
        newCard.querySelector('.image-preview').src = '';

        const exampleText = newCard.querySelector('.font-example span');
        if (exampleText) {
            exampleText.innerText = 'Sem texto aplicado';
            exampleText.style.display = 'none';
        }

        return newCard;
    },

    // Gerencia a inserção no DOM, animação e foco
    insertAndPresent(reference, newElement) {
        const container = document.querySelector('.form-box-list');
        newElement.classList.add('card-anim-in');
        reference.after(newElement);

        // Re-sincroniza todos os índices (importante se inserir no meio da lista)
        this.updateIndices(container);

        requestAnimationFrame(() => {
            newElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

            setTimeout(() => {
                const firstInput = newElement.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus({ preventScroll: true });
                }
            }, 50);
        });

        setTimeout(() => newElement.classList.remove('card-anim-in'), 400);
    },

    // Remove o card com animação e atualiza os índices restantes
    removeWithAnimation(card, parent) {
        const totalCards = parent.querySelectorAll('.form-card').length;
        if (totalCards <= 1) return;

        const cardAbove = card.previousElementSibling;
        card.classList.add('card-anim-out');

        card.addEventListener('animationend', () => {
            card.remove();
            this.updateIndices(parent);

            if (cardAbove) {
                cardAbove.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const inputAbove = cardAbove.querySelector('input');
                if (inputAbove) inputAbove.focus();
            }
        }, { once: true });
    },

    //Atualiza dinamicamente IDs, Names e Labels baseados no sufixo _XX
    updateIndices(target, forcedIndex = null) {
        const cards = target.classList.contains('form-card') ? [target] : target.querySelectorAll('.form-card');

        cards.forEach((card, index) => {
            const idx = forcedIndex !== null ? forcedIndex : (index + 1);
            const newIndexSuffix = idx.toString().padStart(2, '0');

            const numberDisplay = card.querySelector('.cad-header-left span:nth-child(2) strong');
            if (numberDisplay) numberDisplay.innerText = newIndexSuffix;

            card.querySelectorAll('label[for], input[id], input[name]').forEach(el => {
                ['id', 'for'].forEach(attr => {
                    const oldValue = el.getAttribute(attr);
                    if (oldValue && oldValue.includes('_')) {
                        const parts = oldValue.split('_');
                        parts[parts.length - 1] = newIndexSuffix;
                        el.setAttribute(attr, parts.join('_'));
                    }
                });

                if (el.tagName === 'INPUT' && el.name && el.name.includes('_')) {
                    const nameParts = el.name.split('_');
                    nameParts[nameParts.length - 1] = newIndexSuffix;
                    el.name = nameParts.join('_');
                }
            });
        });
    }
}

window.ui = ui;
window.uiCards = uiCards;

// ================================================================================
// ================================================================================
// ================================================================================
// ================================================================================
//                          UINIFICAÇÃO DOS LISTENERS
// ================================================================================
// ================================================================================
// ================================================================================
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    ui.init();
    document.querySelectorAll('.theme-toggle').forEach(btn => btn.innerHTML = localStorage.getItem('click-laser-theme') === 'dark' ? "<i class='bi bi-moon'></i>" : "<i class='bi bi-sun'></i>");
})

document.addEventListener('click', async e => {
    const btn = e.target;
    if (!btn) return;

    if (btn.id === "btn-toggle-menu" && !btn.classList.contains('active')) {
        ui.toggleMenu(true)
    } else { ui.toggleMenu(false) }

    // Inicialização de loader e desabilitação de botões
    if (btn.classList.contains('btn-req')) {
        btn.classList.add('loading');
        document.querySelectorAll(['button', 'a', 'input', 'select', '.btn-local', '.btn-req']).forEach(bt => bt.classList.add('disabled'));
    }

    // Controle de abertura dos modais
    if (btn && btn.classList.contains('btn-for-modal')) {
        const uid = btn.dataset.uid;
        const modalId = btn.dataset.modal;
        const callbackStr = btn.dataset.callback;

        if (callbackStr && modalId) {
            let strParams = null;
            let strFunc = null;
            if (callbackStr.includes('(')) {
                strFunc = callbackStr.split('(')[0];
                strParams = callbackStr.split('(')[1].replace(')', '');
            } else {
                strFunc = callbackStr;
                strParams = null;
            }

            const parts = strFunc.split('.'); // ['actions', 'getProductDetails']
            const funcName = parts.pop(); // Remove e guarda o último (a função)
            const parent = parts.reduce((obj, prop) => obj[prop], window); // O que sobrou é o pai
            const fillCallback = parent[funcName];

            if (typeof fillCallback === 'function') {
                if (strParams) {
                    await fillCallback.call(strParams);
                    ui.resLoading(btn, true);
                    ui.openModal(modalId, 'create');

                } else {
                    if (uid) {
                        await fillCallback.call(parent, uid);
                        ui.resLoading(btn, true);
                        ui.openModal(modalId, 'update', uid);
                    } else {
                        await fillCallback.call(parent);
                        ui.resLoading(btn, true);
                        ui.openModal(modalId, 'create');
                    }
                }
            }
        }
        else if (modalId) {
            ui.resLoading(btn, true);
            ui.openModal(modalId, 'create');
        } else {
            ui.resLoading(btn, false);
        }
    }

    // Controle de abertura e fechamento de dialogs(notificações e area de usuário)
    if (!btn.classList.contains('btn-dialog-show')) {
        ui.alternateDialogsBox();
    }

    // Controle card de itens no modal de venda
    if (btn.classList.contains('card-sale')) {
        const container = document.querySelector('.form-box-list');

        const currentCard = btn.closest('.form-card');
        const icon = btn.querySelector('i');
        const totalCards = container.querySelectorAll('.form-card').length;

        // AÇÃO: Adicionar novo card limpo
        if (icon.classList.contains('bi-plus')) {
            const newCard = uiCards.createCleanCard(container);
            uiCards.updateIndices(newCard, totalCards + 1);
            uiCards.insertAndPresent(currentCard, newCard);
        }
        // AÇÃO: Copiar card existente (Cópia fiel)
        else if (icon.classList.contains('bi-copy')) {
            const copy = currentCard.cloneNode(true);

            // 1. Identifica quais rádios estavam marcados no original
            const checkedIndices = Array.from(currentCard.querySelectorAll('input[type="radio"]'))
                .map((radio, index) => radio.checked ? index : null)
                .filter(index => index !== null);

            // 2. Atualiza os IDs/Names da cópia ANTES de inserir no DOM
            uiCards.updateIndices(copy, totalCards + 1);

            // 3. Restaura a seleção na cópia usando os mesmos índices
            const copyRadios = copy.querySelectorAll('input[type="radio"]');
            checkedIndices.forEach(index => {
                if (copyRadios[index]) copyRadios[index].checked = true;
            });

            uiCards.insertAndPresent(currentCard, copy);
        }
        // AÇÃO: Remover card
        else if (icon.classList.contains('bi-dash')) {
            uiCards.removeWithAnimation(currentCard, container);
        }
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        ui.closeModal();
    }
});

document.addEventListener('change', e => {
    const element = e.target;

    if (element.classList.contains('input-creator_assets_font')) {
        const preview = document.getElementById('font-preview-display');
        ui.previewFont(e.target.getAttribute('data-font_name'), e.target, preview);

        document.getElementById('asset-font-action-edit').setAttribute('data-uid', e.target.getAttribute('data-font_uid'));
        document.getElementById('asset-font-action-delete').setAttribute('data-uid', e.target.getAttribute('data-font_uid'));
    }
    if (element.classList.contains('input-creator_assets_figure')) {
        const preview = document.getElementById('figure-preview-display');
        ui.previewImageVector(e.target.getAttribute('data-figure_url'), e.target, preview);

        document.getElementById('asset-figure-action-edit').setAttribute('data-uid', e.target.getAttribute('data-figure_uid'));
        document.getElementById('asset-figure-action-delete').setAttribute('data-uid', e.target.getAttribute('data-figure_uid'));
    }


    if (element.classList.contains('input-sale_assets_font')) {
        const card = e.target.closest('.form-card');
        const preview = card.querySelector('.font-preview-display');
        ui.previewFont(e.target.getAttribute('data-font_name'), e.target, preview);
    }
    if (element.classList.contains('input-sale_assets_figure')) {
        const card = e.target.closest('.form-card');
        const preview = card.querySelector('.figure-preview-display');
        ui.previewImageVector(e.target.getAttribute('data-figure_url'), e.target, preview);
    }
})

document.addEventListener('input', e => {
    const element = e.target;
    // Identifica se é um campo de busca
    if (element.classList.contains('search-box')) {

        const searchTerm = element.value.toLowerCase().trim();
        const card = element.closest('.form-card');

        // Define qual container de lista filtrar baseado na classe do input
        const targetSelector = element.getAttribute('data-list_class');
        const typeSelector = element.getAttribute('data-list_type');

        const container = card
            ? card.querySelector(`.${targetSelector}`)
            : document.querySelector(`.${targetSelector}`);

        if (!container) return;

        // Seleciona todos os itens (labels) daquela lista específica
        const items = container.querySelectorAll(`.${typeSelector}`);

        items.forEach(item => {
            let text = "";

            if (typeSelector === 'select-item') {
                text = item.querySelector('.item-content')?.innerText || "";
            }
            else if (typeSelector === 'row-item') {
                text = item.getAttribute('data-search') || "";
            }
            else if (typeSelector === 'card-item') {
                text = item.querySelector('.ids-group')?.getAttribute('data-search') || "";
            }

            item.classList.toggle('d-none', !text.toLowerCase().includes(searchTerm));
        });

        // Opcional: Feedback visual se nada for encontrado
        ui.toggleEmptyResults(container, typeSelector, searchTerm);
    }

    if (element.classList.contains('sale-text-input')) {
        const card = element.closest('.form-card');
        const preview = card.querySelector('.font-preview-display');
        preview.innerText = element.value;
    }
})



