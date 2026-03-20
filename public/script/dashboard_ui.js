const ui = {
    // Inicia ou finaliza o loader
    toggleLoader(mode = false, element) {
        if (element) {
            element.classList.toggle('hidden', mode);
        } else {
            document.getElementById('main_page_loader').classList.toggle('hidden', mode);
        }
    },

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
    previewImageVector(source, element, renderElement) {
        // 1. Se for um Objeto do tipo File/Blob (vinda de um input file)
        if (source instanceof File || source instanceof Blob) {
            const tempUrl = URL.createObjectURL(source);
            renderElement.src = tempUrl;

            // Opcional: Liberar memória após carregar (boa prática)
            renderElement.onload = () => {
                URL.revokeObjectURL(tempUrl);
            };
        }
        // 2. Se for uma String (URL externa ou Base64)
        else if (typeof source === 'string') {
            renderElement.src = source;
        }
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

        // Limpeza de estado
        modals.forEach(modal => {
            let i = 0;
            modal.querySelectorAll('.form-card').forEach(card => {
                card.setAttribute('data-uid', "");
                if (i > 0) card.remove();
                i++;
            })

            modal.dataset.uid = "";
            modal.dataset.originalData = "";
            modal.querySelectorAll('input [type="text"]').forEach(i => i.value = "");
            modal.querySelectorAll('input [type="checkbox"]').forEach(i => i.checked = false);
            modal.querySelectorAll('textarea').forEach(i => i.value = "");
            modal.querySelectorAll('.image-preview').forEach(img => img.src = "");
            modal.querySelectorAll('.font-preview-display').forEach(font => font.style.fontFamily = "");
            modal.querySelectorAll('.sale-font-example span').forEach(span => span.innerText = "Sem texto aplicado");
            modal.querySelectorAll('.fake-input').forEach(input => {
                input.innerText = ""
                input.setAttribute('data-value', "");
            });

        });
    },

    // Custom Alert Promise
    alert(message, type = 'warning') {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-custom-alert');
            const titleEl = document.getElementById('custom-alert-title');
            const messageEl = document.getElementById('custom-alert-message');
            const iconEl = document.getElementById('custom-alert-icon');
            const btnOk = modal.querySelector('.modal-footer button');

            // Setup cores e icones
            iconEl.className = '';
            if (type === 'success') {
                iconEl.classList.add('bi', 'bi-check-circle');
                iconEl.style.color = 'var(--color-success)';
                titleEl.innerText = 'Sucesso';
                btnOk.className = 'btn_local save bg-blue text-white';
            } else if (type === 'error') {
                iconEl.classList.add('bi', 'bi-x-circle');
                iconEl.style.color = 'var(--color-danger)';
                titleEl.innerText = 'Erro';
                btnOk.className = 'btn_local save bg-blue text-white';
            } else {
                iconEl.classList.add('bi', 'bi-exclamation-triangle');
                iconEl.style.color = 'var(--color-warning)';
                titleEl.innerText = 'Aviso';
                btnOk.className = 'btn_local save bg-blue text-white';
            }

            messageEl.innerText = message;
            modal.classList.add('show'); // Novo CSS usa show

            const handleClose = () => {
                modal.classList.remove('show');
                btnOk.removeEventListener('click', handleClose);
                resolve();
            };

            btnOk.addEventListener('click', handleClose);
        });
    },

    // Custom Confirm Promise
    confirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-custom-confirm');
            const messageEl = document.getElementById('custom-confirm-message');
            const btnCancel = document.getElementById('custom-confirm-cancel');
            const btnOk = document.getElementById('custom-confirm-ok');

            messageEl.innerText = message;
            modal.classList.add('show');

            const cleanup = () => {
                modal.classList.remove('show');
                btnCancel.removeEventListener('click', onCancel);
                btnOk.removeEventListener('click', onOk);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onOk = () => {
                cleanup();
                resolve(true);
            };

            btnCancel.addEventListener('click', onCancel);
            btnOk.addEventListener('click', onOk);
        });
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
    },


    _activeLabel: null,

    initJobCards() {
        const grid = document.getElementById('jobs-grid');
        if (!grid) return;

        // Interceptador de clique/change (Essencial para rádio botões)
        grid.addEventListener('click', e => {
            const btn = e.target.closest('.status-btn');
            if (btn && !btn.dataset.verified) {
                e.preventDefault();
                // O rádio botão volta ao que era via CSS ou lógica interna
                return false;
            }
        }, true);

        grid.addEventListener('mousedown', e => {
            const label = e.target.closest('.status-btn');
            if (!label) return;

            this.handleScopedLongPress(label);
        });
    },

    handleScopedLongPress(label) {
        let startTime = Date.now();
        let isCancelled = false;

        // Estado visual imediato
        label.classList.add('is-pressing');
        delete label.dataset.verified;

        // Captura o estado anterior para rollback
        const stepper = label.closest('.status-stepper');
        const previousInput = stepper.querySelector('input:checked');
        const targetInput = label.querySelector('input');

        // Função interna de cancelamento
        const cancel = () => {
            isCancelled = true;
            label.classList.remove('is-pressing');
            window.removeEventListener('mouseup', cancel);
            window.removeEventListener('mouseleave', cancel);
        };

        window.addEventListener('mouseup', cancel);
        window.addEventListener('mouseleave', cancel);

        // O "Loop" de verificação interno (sem variável global)
        const checkPress = async () => {
            if (isCancelled) return;

            const elapsed = Date.now() - startTime;

            if (elapsed >= 1000) {
                // SUCESSO: Bateu 1 segundo
                label.classList.remove('is-pressing');
                label.dataset.verified = "true";
                targetInput.checked = true;

                // Dispara a lógica de Backend
                const jobUid = stepper.dataset.jobUid;
                const statusMap = { 'approved': 1, 'running': 2, 'done': 3 };
                const targetStatus = statusMap[targetInput.value];

                try {
                    const response = await actions.updateJobStatus(jobUid, targetStatus);
                    this.handleBackendResponse(response.code, jobUid, label, targetInput, previousInput);
                } catch (err) {
                    this.rollbackStatus(targetInput, previousInput);
                } finally {
                    delete label.dataset.verified;
                }
            } else {
                // Continua verificando no próximo frame (não trava a tela)
                requestAnimationFrame(checkPress);
            }
        };

        requestAnimationFrame(checkPress);
    },

    async handleBackendResponse(code, jobUid, label, targetInput, previousInput) {
        if (code === 0) {
            this.triggerExplosion(label, 'success');
        }
        else if (code === 1) {
            this.triggerExplosion(label, 'success');
            const confirmFinalize = await this.confirm("Todos os itens prontos. Finalizar pedido?");

            if (confirmFinalize) {
                const ok = await actions.confirmFinalizeOrder(jobUid);
                if (ok) {
                    actions.searchJobs();
                    utils.handlePeriodChange();
                }
            } else {
                this.rollbackStatus(targetInput, previousInput);
            }
        }
        else {
            this.triggerExplosion(label, 'error');
            this.rollbackStatus(targetInput, previousInput);
        }
    },

    rollbackStatus(targetInput, previousInput) {
        if (previousInput) previousInput.checked = true;
        else targetInput.checked = false;
    },

    triggerExplosion(label, type) {
        const cls = type === 'success' ? 'anim-success' : 'anim-error';
        label.classList.remove('anim-success', 'anim-error');
        void label.offsetWidth; // Reflow
        label.classList.add(cls);
        setTimeout(() => label.classList.remove(cls), 1000);
    },


    applyFadeEffect(orderUid) {
        document.querySelectorAll(`.card-item[data-packid="${orderUid}"]`).forEach(card => {
            card.style.opacity = "0.3";
            card.style.filter = "grayscale(1)";
            card.style.pointerEvents = "none";
        });
    },

    // Dentro do objeto ui:
    initCopyHandlers() {
        const grid = document.getElementById('jobs-grid');
        if (!grid) return;

        grid.addEventListener('click', async (e) => {
            // Cópia de Texto
            if (e.target.classList.contains('copyable-text')) {
                const text = e.target.innerText;
                await ui.copyTextToClipboard(text, e.target);
            }

            // Cópia de Imagem
            if (e.target.classList.contains('copyable-image')) {
                const imageUrl = e.target.dataset.url; // Você precisará injetar a URL aqui na renderização
                if (imageUrl) {
                    await ui.copyImageToClipboard(imageUrl, e.target);
                }
            }
        });
    },

    async copyTextToClipboard(text, element) {
        try {
            await navigator.clipboard.writeText(text);
            ui.showCopyFeedback(element, "Copiado!");
        } catch (err) {
            console.error('Erro ao copiar texto:', err);
        }
    },

    async copyImageToClipboard(url, element) {
        try {
            element.style.pointerEvents = "none";
            // 1. Busca a imagem e converte para Blob
            const data = await fetch(url);
            const blob = await data.blob();

            // 2. Cria o item de área de transferência (deve ser PNG para compatibilidade máxima)
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);

            ui.showCopyFeedback(element, "Imagem Copiada!");
            element.style.pointerEvents = "";
        } catch (err) {
            console.error('Erro ao copiar imagem:', err);
            ui.showCopyFeedback(element, "Erro ao copiar", true);
        }
    },

    showCopyFeedback(element, message, isError = false) {
        const originalText = element.innerText;
        setTimeout(() => {

            element.innerText = message;
            element.style.color = isError ? "#dc3545" : "#28a745";
            element.style.fontWeight = "bold";
        }, 100);

        setTimeout(() => {
            element.innerText = originalText;
            element.style.color = "";
            element.style.fontWeight = "";
        }, 1500);
    },

    initAssetsPreview(container) {
        if (!container) return;
        // Preview automático do primeiro item da lista de gestão
        const firstRow = container.querySelector('.select-item input');
        if (firstRow) {
            firstRow.click();
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
            exampleText.style = '';
            exampleText.innerText = 'Sem texto aplicado';
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

    if (btn && btn.classList.contains('btn-refresh')) {
        const callbackStr = btn.dataset.callback;
        if (callbackStr) {
            const parts = callbackStr.split('.');
            const funcName = parts.pop();
            const parent = parts.reduce((obj, prop) => obj[prop], window);
            const fillCallback = parent[funcName];
            if (typeof fillCallback === 'function') {
                await fillCallback.call(parent);
            }
            ui.resLoading(btn, true);
        } else {
            ui.resLoading(btn, false);
        }
    }

    // Controle de fechamento dos modais
    if (btn.classList.contains('btn-printer')) {
        if (btn.getAttribute('data-print') === 'order') {
            const result = await actions.printOrder(btn.getAttribute('data-uid'));
            ui.resLoading(btn, result);
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

    if (btn.classList.contains('status-btn')) {

    }

    // if (btn.classList.contains('status-btn')) {
    //     e.preventDefault();
    // }

    // Ações de exclusão de ativos (Criador)
    const deleteBtn = btn.closest('#asset-font-action-delete') || (btn.id === 'asset-font-action-delete' ? btn : null);
    if (deleteBtn) {
        // Simula click para abrir o modal para termos acesso fácil ao uid, ou apenas chama a api diretamente
        // No dashboard_main.js a função procura o modal-font. Para facilitar sem alterar a função da main,
        // garantimos que o data-uid setado pelo change no painel vá para o modal temporariamente ou apenas
        // abrimos a função se houver um uid selecionado.
        const uid = deleteBtn.getAttribute('data-uid');
        if (uid) {
            document.getElementById('modal-font').setAttribute('data-uid', uid);
            actions.assetsDeleteFont();
        } else {
            ui.alert('Selecione uma fonte primeiro.', 'warning');
        }
    }

    const deleteFigureBtn = btn.closest('#asset-figure-action-delete') || (btn.id === 'asset-figure-action-delete' ? btn : null);
    if (deleteFigureBtn) {
        const uid = deleteFigureBtn.getAttribute('data-uid');
        if (uid) {
            document.getElementById('modal-vector').setAttribute('data-uid', uid);
            actions.assetsDeleteVector();
        } else {
            ui.alert('Selecione uma figura primeiro.', 'warning');
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

    if (element.classList.contains('input-img')) {
        const boxPreview = element.getAttribute('data-preview');
        const imgPreview = element.files[0];

        ui.previewImageVector(imgPreview, element, document.getElementById(boxPreview));
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
        if (element.value === '') {
            preview.innerText = 'Sem texto aplicado'
        } else {
            preview.innerText = element.value;
        }
    }
})


