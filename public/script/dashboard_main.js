function logout() {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/dashLogin';
}

const actions = {
    // Fetch wrapper
    async apiFetch(endpoint, method, body = null) {
        const headers = {
            'Authorization': `Bearer ${auth_token}`,
            'X-User-Id': userId
        };

        // Só adiciona JSON se não for FormData
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config = { method, headers };

        if (body) config.body = (body instanceof FormData) ? body : JSON.stringify(body);

        const response = await fetch(`/api/private/dashboard/${endpoint}`, config);

        if (response.status >= 400) {
            ui.alert('Erro: ' + response.statusText, 'error');
        }
        if (response.status === 401) {
            console.warn("Sessão expirada, efetuando logout...");
            logout();
            return null;
        }
        ui.toggleLoader(true)
        return response;
    },

    // =========================================================
    // Home
    async fetchHomeStats() {
        try {
            const response = await this.apiFetch(`stats`, 'GET');
            const data = await response.json();
            if (!data) return;
            renders.renderHomeStats(data);
        } catch (e) {
            console.error("Erro ao carregar stats da home", e);
        }
    },
    // =========================================================
    // Jobs
    async searchJobs(date_filter = null) {
        if (!date_filter) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            date_filter = `${yyyy}-${mm}-${dd}`;
        }

        const response = await this.apiFetch(`jobs/search?date=${date_filter}`, 'GET');

        if (!response || response.status !== 200) {
            console.error("Erro ao buscar jobs:", response ? await response.text() : "Sem resposta");
            return [];
        };
        const data = await response.json();
        renders.reder_grid_jobs(data);
        ui.initJobCards();
        ui.initCopyHandlers();
    },

    // =========================================================
    // Sales
    async loadSales(start, end) {

        // Chama o endpoint através do apiFetch para manter o padrão de segurança
        const response = await this.apiFetch(`orders/search?start=${start}&end=${end}`, 'GET');

        if (!response || !response.ok) {
            console.error("Erro ao buscar vendas");
            return;
        }

        const data = await response.json(); // Array de strings HTML (linhas da tabela)
        renders.render_sales_table(data);
    },

    async saveSale() {
        // 1. Coleta os dados (incluindo imagens processadas como Blobs)
        const rawData = await utils.dataColectorSale();

        // Interrompe se a validação do coletor retornar null
        if (!rawData) return;


        const sale_uid = rawData.uid;
        const formData = new FormData();

        // 2. Mapeia os itens (jobs) para separar arquivos do objeto JSON
        const sanitizedJobs = rawData.jobs.map((job, index) => {
            // Se houver uma imagem de referência em formato Blob
            if (job.reference_image instanceof Blob) {
                formData.append(`file_job_${index}`, job.reference_image, `reference_${index}.webp`);
            }

            const { reference_image, ...textData } = job;

            // Se o status da Ordem for '1' (Aprovado/Reaberto), resetamos todos os jobs para 1
            if (rawData.order_status === '1' || rawData.order_status === 1) {
                textData.job_status = 1;
            }

            return textData;
        });

        // 3. Estrutura o payload textual final
        const payload = {
            client_uid: rawData.client_uid,
            client_name: rawData.client_name,
            client_address: rawData.client_address,
            client_phone: rawData.client_phone,
            order_origin: rawData.order_origin,
            order_status: rawData.order_status,
            order_priority: rawData.order_priority,
            order_delivery_date: rawData.order_delivery_date,
            jobs: sanitizedJobs
        };

        // 4. Adiciona o payload JSON ao FormData
        formData.append('payload', JSON.stringify(payload));

        try {
            if (sale_uid) formData.append('uid', sale_uid);
            const method = sale_uid ? 'PATCH' : 'POST';
            const endPoint = sale_uid ? `orders/update` : `orders/create`;

            // 5. Envia os dados através do fetch global preparado para FormData
            const response = await this.apiFetch(endPoint, method, formData);

            if (response && response.ok) {
                const result = await response.json();
                ui.alert(`Pedido #${result.id_num} registrado com sucesso!`, 'success');
                utils.handlePeriodChange();
                actions.searchJobs();
                ui.closeModal();
            } else {
                const errorResponse = await response?.json();
                console.error("Save Error:", errorResponse);
                ui.alert(`Erro ao salvar: ${errorResponse?.error || 'Erro desconhecido'}`, 'error');
            }
        } catch (error) {
            console.error("Network/Runtime Error:", error);
            ui.alert("Falha crítica ao tentar salvar o pedido.", 'error');
        }
    },

    async searchSale(oder_uid) {
        const response = await this.apiFetch(`orders/search-sale?uid=${oder_uid}`, 'GET');

        if (!response || !response.ok) {
            console.error("Erro ao buscar jobs:", response ? await response.text() : "Sem resposta");
            return [];
        };
        await utils.loadCardSales();
        const data = await response.json();
        renders.render_modal_order_edit(data);
    },

    // Rota 1: Atualização Simples (Pode retornar 0, 1 ou 99)
    async updateJobStatus(jobUid, status) {
        const res = await this.apiFetch('jobs/update-status', 'PATCH', { uid: jobUid, status: status });
        const result = await res.json();
        return result; // Retorna { code: 0 | 1 | 99 }

    },

    // Rota 2: Finalização Forçada (Job + Order)
    async confirmFinalizeOrder(jobUid) {
        const res = await this.apiFetch('orders/finalize-with-job', 'PATCH', { job_uid: jobUid });
        return res.ok;
    },

    // =========================================================
    // Products
    async loadProducts() {
        const response = await this.apiFetch(`products/load`, 'GET');
        if (!response || !response.ok) {
            console.error("Erro ao buscar produtos");
            return;
        }
        const data = await response.json();
        renders.render_products_table(data);
    },
    async loadProductsOptions() {
        const response = await this.apiFetch(`products/selection-list`, 'GET');
        if (!response || !response.ok) {
            console.error("Erro ao buscar produtos");
            return;
        }
        const data = await response.json();
        renders.render_products_selection_list(data);
    },

    async deleteProduct() {
        const modal = document.getElementById('modal-product');
        const uid = modal.getAttribute('data-uid');

        if (!uid) return;
        if (!(await ui.confirm("Tem certeza que deseja excluir este produto permanentemente?"))) return;

        try {
            const response = await this.apiFetch(`products/delete?uid=${uid}`, 'DELETE');

            if (response && response.ok) {
                ui.alert('Produto excluído com sucesso!', 'success');
                if (typeof ui.closeModal === 'function') ui.closeModal();
                this.loadProducts();
            } else {
                const err = await response.json();
                ui.alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'), 'error');
            }
        } catch (error) {
            console.error("Erro ao deletar produto:", error);
        }
    },

    async saveProduct() {
        try {
            const formData = new FormData();
            const modal = document.getElementById('modal-product');
            const uid = modal.getAttribute('data-uid');

            // 1. Captura campos de texto
            const fields = {
                'name': 'stock-name',
                'type': 'stock-type',
                'color': 'stock-color',
                'description': 'stock-description',
                'amount': 'stock-amount',
                'amount_min': 'stock-amount-min',
                'price_buy': 'stock-price-buy',
                'price_sell': 'stock-price-sell'
            };

            for (const [key, id] of Object.entries(fields)) {
                const input = document.getElementById(id);
                formData.append(key, input ? input.value : "");
            }

            if (uid) formData.append('uid', uid);

            // 2. Processamento das Imagens (Usando o processImage para garantir WebP)
            const inputSale = document.getElementById('stock-image');
            const inputCreator = document.getElementById('stock-image-creator');

            if (inputSale.files[0]) {
                // Processamos para WebP antes de anexar ao FormData
                const processedSale = await utils.processImage(inputSale.files[0], 1);
                formData.append('image_sale', processedSale, 'product_sale.webp');
            }

            if (inputCreator.files[0]) {
                const processedCreator = await utils.processImage(inputCreator.files[0], 2);
                formData.append('image_creator', processedCreator, 'product_creator.webp');
            }

            const method = uid ? 'PATCH' : 'POST';
            const endpoint = uid ? `products/update` : `products/create`;

            const response = await this.apiFetch(endpoint, method, formData);

            if (response && response.ok) {
                ui.alert(uid ? 'Produto atualizado!' : 'Produto criado com sucesso!', 'success');
                if (typeof ui.closeModal === 'function') ui.closeModal();
                this.loadProducts(); // Recarrega a tabela
            } else {
                const err = await response.json().catch(() => ({ error: 'Erro na resposta do servidor' }));
                ui.alert('Erro: ' + (err.error || 'Falha ao salvar'), 'error');
            }

        } catch (error) {
            console.error("Erro no salvamento do produto:", error);
            ui.alert("Falha técnica ao processar o produto.", 'error');
        }
    },

    async getProductDetails(productUid) {
        // Usando seu apiFetch para manter o padrão de headers e auth
        const response = await this.apiFetch(`products/get?uid=${productUid}`, 'GET');

        if (!response || !response.ok) {
            console.error("Erro ao buscar detalhes");
            return null;
        }
        const data = await response.json();
        renders.render_modal_product_edit(data);
    },

    async updateUnitStock(productUid, action) {
        try {
            if (!productUid || !action) throw new Error('Erro ao atualizar estoque');

            const response = await this.apiFetch(`products/stock-adjust`, 'POST', { uid: productUid, action });

            const btn = document.getElementById(`productRow_${productUid}`).querySelector(`.${action}`)

            if (!response || !response.ok) throw new Error('Erro ao atualizar estoque');
            const data = await response.json();
            renders.render_update_row_product(data.new_row_html, `productRow_${productUid}`, btn, response.ok);
        } catch (err) {
            console.error(err);
        }

    },

    // =========================================================
    // =========================================================
    // Assets
    async assetsSaveFont() {
        try {
            const formData = new FormData();
            const modal = document.getElementById('modal-font');
            const uid = modal.getAttribute('data-uid');

            const fileInput = document.getElementById('asset-font-file');
            const nameInput = document.getElementById('asset-font-name');
            const typeSelect = document.getElementById('asset-font-type');
            const typeInput = typeSelect ? typeSelect.options[typeSelect.selectedIndex] : null;

            // VALIDAÇÃO: Arquivo é obrigatório apenas no CREATE (POST)
            if (!uid && (!fileInput || !fileInput.files[0])) {
                ui.alert("Selecione um arquivo de fonte para criar o novo registro.", 'warning');
                return;
            }

            if (uid) formData.append('uid', uid);

            // Só adiciona o arquivo se o usuário selecionou um novo
            if (fileInput.files[0]) {
                formData.append('file', fileInput.files[0]);
            }

            formData.append('name', nameInput ? nameInput.value : '');
            // Ajustado para 'classification' para bater com o que a rota PATCH espera
            formData.append('classification', typeInput ? typeInput.value : '');

            const method = uid ? 'PATCH' : 'POST';
            const endpoint = uid ? `assets/fonts/update` : `assets/fonts/create`;

            const response = await this.apiFetch(endpoint, method, formData);

            if (response && response.ok) {
                await this.assetsLoadFonts();
                if (typeof ui.closeModal === 'function') ui.closeModal();
                ui.alert(uid ? 'Fonte atualizada!' : 'Fonte criada com sucesso!', 'success');
            } else {
                const err = await response.json().catch(() => ({ error: 'Erro ao processar fonte' }));
                ui.alert('Erro: ' + (err.error || 'Falha no servidor'), 'error');
            }
        } catch (error) {
            console.error("Erro ao salvar fonte:", error);
            ui.alert("Falha crítica ao subir fonte.", 'error');
        }
    },

    async assetsDeleteFont() {
        const modal = document.getElementById('modal-font');
        const uid = modal.getAttribute('data-uid');

        if (!uid) return;
        if (!(await ui.confirm("Excluir esta fonte removerá o acesso a ela em artes futuras. Confirmar?"))) return;

        try {
            // Passando o UID via Query String conforme a rota da API espera
            const response = await this.apiFetch(`assets/fonts/delete?uid=${uid}`, 'DELETE');

            if (response && response.ok) {
                ui.alert('Fonte removida com sucesso!', 'success');
                this.assetsLoadFonts();
                ui.closeModal(); // Limpa o data-uid e os campos
            } else {
                const err = await response.json().catch(() => ({ error: 'Erro ao deletar fonte' }));
                ui.alert('Erro: ' + (err.error || 'Não foi possível excluir'), 'error');
            }
        } catch (error) {
            console.error("Erro no delete de fonte:", error);
        }
    },

    async assetsLoadFonts() {
        try {
            // Chama o endpoint de listagem de fontes
            const response = await this.apiFetch('assets/fonts/load', 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao carregar fontes");
                return;
            }

            const data = await response.json();

            // 1. Injeção Dinâmica de CSS (para que o navegador renderize as fontes)
            utils._injectFontsToDocument(data);

            // 2. Chama o render (passando os dados para construir o HTML dos seletores)
            if (typeof renders.render_creator_fonts === 'function') {
                renders.render_creator_fonts(data);
            }

        } catch (error) {
            console.error("Erro no load de fontes:", error);
        }
    },

    async getFontDetails(fontUid) {
        const response = await this.apiFetch(`assets/fonts/get?uid=${fontUid}`, 'GET');

        if (!response || !response.ok) {
            console.error("Erro ao buscar detalhes da fonte");
            return;
        }
        const data = await response.json();
        renders.render_modal_font_edit(data);
    },

    async getFigureDetails(figureUid) {
        const response = await this.apiFetch(`assets/vectors/get?uid=${figureUid}`, 'GET');

        if (!response || !response.ok) {
            console.error("Erro ao buscar detalhes da fonte");
            return;
        }
        const data = await response.json();
        renders.render_modal_figure_edit(data);
    },

    async loadFontsOptions() {
        const response = await this.apiFetch(`assets/fonts/selection-list`, 'GET');
        if (!response || !response.ok) {
            console.error("Erro ao buscar lista de fontes");
            return;
        }
        const data = await response.json();
        // Certifique-se de que este renderizador existe para injetar o HTML no local correto
        renders.render_fonts_selection_list(data);
    },

    async assetsSaveVector() {
        try {
            const formData = new FormData();
            const modal = document.getElementById('modal-vector');
            const uid = modal.getAttribute('data-uid');

            const fileInput = document.getElementById('asset-vector-file');
            const nameInput = document.getElementById('asset-vector-name');
            const catInput = document.getElementById('asset-vector-category');

            // VALIDAÇÃO: Arquivo obrigatório apenas no CREATE
            if (!uid && (!fileInput || !fileInput.files[0])) {
                ui.alert("Selecione um arquivo de imagem (PNG/SVG)", 'warning');
                return;
            }

            if (uid) formData.append('uid', uid);

            if (fileInput.files[0]) {
                formData.append('file', fileInput.files[0]);
            }

            formData.append('name', nameInput ? nameInput.value : 'Sem nome');
            formData.append('classification', catInput ? catInput.value : 'geral');

            const method = uid ? 'PATCH' : 'POST';
            // Corrigido erro de sintaxe na URL (faltava uma barra e tinha chaves sobrando)
            const endpoint = uid ? `assets/vectors/update` : `assets/vectors/create`;

            const response = await this.apiFetch(endpoint, method, formData);

            if (response && response.ok) {
                await this.assetsLoadVectors();
                ui.alert(uid ? 'Vetor atualizado!' : 'Ativo salvo na biblioteca!', 'success');
                if (typeof ui.closeModal === 'function') ui.closeModal();
            } else {
                const err = await response.json().catch(() => ({ error: 'Erro ao processar ativo' }));
                ui.alert('Erro: ' + (err.error || 'Falha no upload'), 'error');
            }
        } catch (error) {
            console.error("Erro ao salvar vetor/figura:", error);
            ui.alert("Falha crítica ao subir ativo.", 'error');
        }
    },

    async assetsDeleteVector() {
        const modal = document.getElementById('modal-vector');
        const uid = modal.getAttribute('data-uid');

        if (!uid) return;
        if (!(await ui.confirm("Deseja remover esta figura da biblioteca permanentemente?"))) return;

        try {
            const response = await this.apiFetch(`assets/vectors/delete?uid=${uid}`, 'DELETE');

            if (response && response.ok) {
                ui.alert('Figura removida!', 'success');
                this.assetsLoadVectors();
                ui.closeModal();
            } else {
                const err = await response.json().catch(() => ({ error: 'Erro ao deletar ativo' }));
                ui.alert('Erro: ' + (err.error || 'Falha na exclusão'), 'error');
            }
        } catch (error) {
            console.error("Erro no delete de vetor:", error);
        }
    },

    async assetsLoadVectors() {
        try {
            const response = await this.apiFetch('assets/vectors/load', 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao carregar vetores");
                return;
            }

            const data = await response.json();

            // Chama o render para exibir a galeria de figuras/PNGs
            if (typeof renders.render_creator_vectors === 'function') {
                renders.render_creator_vectors(data);
            }

        } catch (error) {
            console.error("Erro no load de vetores:", error);
        }
    },

    async loadVectorsOptions() {
        const response = await this.apiFetch(`assets/vectors/selection-list`, 'GET');
        if (!response || !response.ok) {
            console.error("Erro ao buscar lista de figuras");
            return;
        }
        const data = await response.json();
        // Injeta a lista de figuras no seletor do editor/pedido
        renders.render_vectors_selection_list(data);
    },

    // Ação para Visualização (Read-only)
    async viewOrder(order_uid) {
        try {
            const response = await this.apiFetch(`orders/search-sale?uid=${order_uid}`, 'GET');
            if (!response || !response.ok) return console.error("Erro ao buscar dados");

            const data = await response.json();

            // 1. Abre o modal físico via UI
            ui.openModal('modal-view-order', 'view', order_uid);

            // 2. Manda o Renderizador inserir os dados no DOM
            renders.renderOrderStaticView(data);

        } catch (error) {
            console.error("Erro na action viewOrder:", error);
        }
    },

    // Ação para Impressão
    async printOrder(order_uid) {
        try {
            const response = await this.apiFetch(`orders/search-sale?uid=${order_uid}`, 'GET');
            if (!response || !response.ok) return console.error("Falha na API");

            const data = await response.json();

            // Passa os dados para o Utils processar o Canvas
            await utils.executePrint(data);
            if (data.order && data.jobs) {
                return true
            } else {
                return false
            }
        } catch (error) {
            console.error("Erro ao imprimir pedido:", error);
            return false
        }
    },

    // Ação para Edição de Funcionarios
    async getStaffDetails(uid) {
        // O uid vem do botão da tabela (data-callback)
        const response = await this.apiFetch(`staff/get?uid=${uid}`, 'GET');


        if (!response) {
            return
        } // apiFetch já cuida do erro/logout

        const data = await response.json();
        renders.render_modal_staff_edit(data);
    },

    async saveStaff() {
        const modal = document.querySelector('#modal-staff');
        const uid = modal.getAttribute('data-uid');
        const isUpdate = !!uid;

        const staffData = {
            email: modal.querySelector('#staff-email').value,
            name: modal.querySelector('#staff-name').value,
            phone: modal.querySelector('#staff-phone').value,
            job_position: modal.querySelector('#staff-job-position').value,
            permissions_level: parseInt(modal.querySelector('#staff-level').value),
            date_of_birth: modal.querySelector('#staff-date-of-birth').value,
            enabled_account: modal.querySelector('#staff-status').value
        };

        const password = modal.querySelector('.password-generated').getAttribute("data-value");

        if (!isUpdate && !!password) {
            ui.alert("A senha do colaborador deve ser informada!", "error");
            return;
        }
        if (password) staffData.password = password;
        // Define endpoint e método baseado na existência do UID
        const endpoint = isUpdate ? `staff/update?uid=${uid}` : `staff/create`;
        const method = isUpdate ? 'PATCH' : 'POST';

        const response = await this.apiFetch(endpoint, method, staffData);

        if (!response && !response.ok) {
            ui.alert("Erro ao salvar colaborador", "error");
            return;
        }
        // Função que você deve ter para dar refresh na lista da tabela
        this.loadStaffTable();
        ui.alert(isUpdate ? "Colaborador atualizado!" : "Colaborador criado!", "success");
        ui.closeModal();

    },

    async getPermissionsDetails(uid) {
        const response = await actions.apiFetch(`staff/permissions?uid=${uid}`, 'GET');

        if (response && response.ok) {
            const permissions = await response.json();
            const modal = document.querySelector('#modal-permissions');

            // Iteramos sobre o JSON de permissões (ex: { home: "edit", orders: "view", ... })
            Object.entries(permissions).forEach(([section, value]) => {
                const radio = modal.querySelector(`input[name="perm-${section}"][value="${value}"]`);
                if (radio) radio.checked = true;
            });

        }
    },

    async updatePermissions() {
        const modal = document.querySelector('#modal-permissions');
        const uid = modal.getAttribute('data-uid');

        // Mapeamos as seções para reconstruir o JSON
        const sections = ['home', 'orders', 'production', 'creator', 'stock', 'staff'];
        const newPermissions = {};

        sections.forEach(s => {
            const selected = modal.querySelector(`input[name="perm-${s}"]:checked`);
            newPermissions[s] = selected ? selected.value : 'blocked';
        });
        const response = await actions.apiFetch(`staff/permissions/update?uid=${uid}`, 'PATCH', {
            permissions_sections: JSON.stringify(newPermissions)
        });

        if (response && response.ok) {
            ui.alert("Permissões atualizadas com sucesso!", "success");
            ui.closeModal();
            actions.loadStaffTable(); // Recarrega para atualizar os badges na tabela
        }
    },

    async loadStaffTable() {
        // 2. Busca os dados na rota que criamos anteriormente
        // O apiFetch já cuida do Token, UserId e do logout em caso de 401/403
        const response = await actions.apiFetch('staff/load', 'GET');

        if (response && response.ok) {
            const staffRowsHtml = await response.json();

            // 3. Seleciona o corpo da tabela de equipe
            const tableBody = document.getElementById('staff-table-body');

            if (tableBody) {
                // Se a lista vier vazia, podemos colocar um aviso ou apenas limpar
                if (staffRowsHtml.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum colaborador encontrado.</td></tr>`;
                    return;
                }
                // staffRowsHtml já vem como um array de strings (HTML das linhas)
                // vindas do Worker através do create_staff_row
                tableBody.innerHTML = "";
                staffRowsHtml.forEach(row => {
                    tableBody.insertAdjacentHTML('beforeend', row);
                });
            }
        }
    }
}

const renders = {
    renderHomeStats(data) {
        const section = document.getElementById('s-home');
        if (!section) return;

        // Atualiza os valores nos cards de estatística
        const labels = section.querySelectorAll('.stat-value');
        if (labels.length >= 3) {
            labels[0].innerText = String(data.pending).padStart(2, '0');
            labels[1].innerText = String(data.activeJobs).padStart(2, '0');
            labels[2].innerText = String(data.completedToday).padStart(2, '0');
        }

        // Atualiza a data no topo
        document.getElementById('display-date').innerText = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    },


    reder_grid_jobs(data) {
        const grid = document.getElementById('jobs-grid');
        grid.innerHTML = ''; // Limpa o grid antes de renderizar os novos cards

        data.forEach(card => {
            grid.insertAdjacentHTML('beforeend', card);
        });

    },
    render_sales_table(data) {
        const tbody = document.getElementById('sales-table-body');
        if (!tbody) return;

        // Limpa as linhas de exemplo/antigas antes de renderizar os novos dados
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum pedido encontrado no período.</td></tr>';
            return;
        }

        // Insere cada linha (string HTML vinda da Worker) na tabela
        data.forEach(row => {
            tbody.insertAdjacentHTML('beforeend', row);
        });
    },

    render_products_table(data) {
        const tbody = document.getElementById('stock-table-body');
        if (!tbody) return;

        // Limpa as linhas de exemplo/antigas antes de renderizar os novos dados
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum produto encontrado.</td></tr>';
            return;
        }

        // Insere cada linha (string HTML vinda da Worker) na tabela
        data.forEach(row => {
            tbody.insertAdjacentHTML('beforeend', row);
        })
    },

    render_products_selection_list(htmlItems) {
        // 1. Localiza o modal de vendas
        const modal = document.getElementById('modal-sale');
        if (!modal) return;

        // 2. Localiza o contêiner de produtos APENAS do primeiro card
        const container = modal.querySelector('.form-card .sale-list-products');

        if (container) {
            // 3. Insere os itens e limpa qualquer conteúdo pré-existente
            container.innerHTML = htmlItems.join('');
        } else {
            console.error("Contêiner .sale-list-products não encontrado no primeiro card.");
        }
    },

    render_fonts_selection_list(htmlItems) {
        const modal = document.getElementById('modal-sale');
        if (!modal) return;

        // Seleciona o contêiner no primeiro card (ou no contexto de clonagem)
        const container = modal.querySelector('.form-card .sale-list-fonts');
        if (container) {
            container.innerHTML = htmlItems.join('');
        }
    },

    async render_modal_font_edit(data) {
        const modal = document.getElementById('modal-font');
        modal.setAttribute('data-uid', data.font_uid);

        document.getElementById('asset-font-name').value = data.font_name;
        document.getElementById('asset-font-type').value = data.font_type;

        // Resetamos o input de arquivo (sempre limpo ao abrir)
        const fileInput = document.getElementById('asset-font-file');
        fileInput.value = '';

        // Mostramos o caminho atual da fonte para o usuário saber que já existe um arquivo
        const currentPathContainer = document.getElementById('current-font-path');
        const filenameSpan = document.getElementById('font-filename');

        if (data.font_url) {
            currentPathContainer.classList.remove('d-none');
            // Extrai apenas o nome do arquivo se for um path completo
            const filename = data.font_url.split('/').pop();
            filenameSpan.textContent = (filename).split('?')[0];
        } else {
            currentPathContainer.classList.add('d-none');
        }
    },

    async render_modal_figure_edit(data) {
        const modal = document.getElementById('modal-vector');
        modal.setAttribute('data-uid', data.figure_uid);

        document.getElementById('asset-vector-name').value = data.figure_name;
        document.getElementById('asset-vector-category').value = data.figure_type;

        // Resetamos o input de arquivo (sempre limpo ao abrir)
        const fileInput = document.getElementById('asset-vector-file');
        fileInput.value = '';

        // Mostramos o caminho atual da figura para o usuário saber que já existe um arquivo
        const currentPathContainer = document.getElementById('current-figure-path');
        const filenameSpan = document.getElementById('figure-filename');
        const previewImage = document.getElementById('preview-vector-import');

        if (data.figure_url) {
            previewImage.src = data.figure_url;
            currentPathContainer.classList.remove('d-none');
            // Extrai apenas o nome do arquivo se for um path completo
            const filename = data.figure_url.split('/').pop();
            filenameSpan.textContent = (filename).split('?')[0];
        } else {
            currentPathContainer.classList.add('d-none');
        }
    },

    render_modal_order_edit(data) {

        const { order, jobs } = data;
        const modal = document.getElementById('modal-sale');
        const container = modal.querySelector('.form-box-list');
        // 1. Preenche o cabeçalho da Ordem (Igual ao anterior)
        modal.setAttribute('data-uid', order.uid);
        document.getElementById('sale-client-name').value = order.client_name || '';
        document.getElementById('sale-origin').value = `${order.order_origin}` || '';
        document.getElementById('sale-client-phone').value = order.client_phone || '';
        document.getElementById('sale-client-address').value = order.client_address || '';
        document.getElementById('sale-status').value = `${order.order_status}` || '';
        document.getElementById('sale-priority').value = `${order.order_priority}` || '';
        document.getElementById('sale-delivery-date').value = order.order_delivery_date ? order.order_delivery_date.split('T')[0] : '';

        // Agora temos exatamente 1 card (o original). Vamos limpá-lo.
        const firstCard = container.querySelector('.form-card');
        // 3. Loop de Jobs
        let index = 0;
        jobs.forEach((job, index) => {
            let currentCard;

            if (index + 1 === 1) {
                // No primeiro Job, usamos o card que já está lá
                currentCard = firstCard;
            } else {
                // Nos demais, clonamos a partir do primeiro
                currentCard = uiCards.createCleanCard(container);
                container.appendChild(currentCard);
            }

            // Atualiza os índices (importante para IDs e Names não colidirem)
            uiCards.updateIndices(container);

            // Preenche os dados
            utils.fillJobData(currentCard, job);
            index++;
        });

    },

    render_vectors_selection_list(htmlItems) {
        const modal = document.getElementById('modal-sale');
        if (!modal) return;

        const container = modal.querySelector('.form-card .sale-list-figures');
        if (container) {
            container.innerHTML = htmlItems.join('');
        }
    },

    render_modal_product_edit(data) {
        // 1. Busca os dados usando a action
        if (!data) return ui.alert("Erro ao carregar dados do produto.", 'error');
        const modal = document.getElementById('modal-product');

        // 2. Armazena os dados originais em formato JSON para comparar depois
        modal.dataset.originalData = JSON.stringify({
            name: data.product_title,
            type: data.product_type,
            color: data.product_color,
            description: data.product_desc,
            amount: String(data.product_stock_now),
            amount_min: String(data.product_stock_min),
            price_buy: String(data.product_price_buy),
            price_sell: String(data.product_price_sell)
        });

        // 3. Preenchimento dos campos do modal (Setor de Produtos)
        document.getElementById('stock-name').value = data.product_title || "";
        document.getElementById('stock-type').value = data.product_type || "";
        document.getElementById('stock-color').value = data.product_color || "";
        document.getElementById('stock-description').value = data.product_desc || "";
        document.getElementById('stock-amount').value = data.product_stock_now || 0;
        document.getElementById('stock-amount-min').value = data.product_stock_min || 0;
        document.getElementById('stock-price-buy').value = data.product_price_buy || 0;
        document.getElementById('stock-price-sell').value = data.product_price_sell || 0;

        // 3. Renderiza os Previews das imagens (URLs assinadas vindas do Worker)
        const pSale = document.getElementById('preview-sale');
        const pCreator = document.getElementById('preview-creator');

        if (data.url_sale_preview) {
            pSale.src = data.url_sale_preview;
            pSale.style.display = 'block';
        } else {
            pSale.style.display = 'none';
        }

        if (data.url_creator_preview) {
            pCreator.src = data.url_creator_preview;
            pCreator.style.display = 'block';
        } else {
            pCreator.style.display = 'none';
        }
    },

    async render_update_row_product(data, row_id, btn, result = false) {
        const row = document.getElementById(row_id);
        if (!row) return;

        window.ui.resLoading(btn, result, function () { row.outerHTML = data });
    },
    // Injeta as rows de fontes na lista da biblioteca (Gestão)
    render_creator_fonts(htmlRows) {
        const container = document.getElementById('font-list');
        if (!container) return;

        container.innerHTML = '';
        htmlRows.forEach(row => container.insertAdjacentHTML('beforeend', row));
        ui.initAssetsPreview(container);
    },

    // Injeta as rows de figuras na lista da biblioteca (Gestão)
    render_creator_vectors(htmlRows) {
        const container = document.getElementById('vector-list');
        if (!container) return;

        container.innerHTML = '';
        htmlRows.forEach(row => container.insertAdjacentHTML('beforeend', row));

        ui.initAssetsPreview(container);
    },

    renderOrderStaticView(data) {
        const { order, jobs } = data;
        const modal = document.getElementById('modal-view-order');
        if (!modal) return;

        // Inserção direta no cabeçalho do modal
        modal.querySelector('.view-id').textContent = order.uid.slice(0, 8).toUpperCase();
        modal.querySelector('.view-client').textContent = order.client_name || 'N/A';
        modal.querySelector('.view-phone').textContent = order.client_phone || '-';
        modal.querySelector('.view-address').textContent = order.client_address || 'Não informado';
        modal.querySelector('.view-delivery').textContent = order.order_delivery_date
            ? new Date(order.order_delivery_date).toLocaleDateString()
            : 'A combinar';

        // Inserção da lista de Jobs - baseada na estilização do ticket
        const listContainer = modal.querySelector('.view-jobs-list');
        const displayID = order.id_num || order.uid.substring(0, 8).toUpperCase();

        listContainer.innerHTML = jobs.map((job, index) => {
            // Prepara JSON seguro para o botão de impressão individual
            // Convertemos as aspas duplas em single quotes escapadas ou usamos encodeURIComponent
            const orderJson = encodeURIComponent(JSON.stringify(order));
            const jobJson = encodeURIComponent(JSON.stringify(job));

            return `
            <div class="view-job-item" style="padding: 15px; margin-bottom: 15px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary);">

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); margin-bottom: 10px; padding-bottom: 8px;">
                    <h4 style="margin: 0;">ITEM ${index + 1} DE ${jobs.length}</h4>
                    <button class="btn_local save bg-blue text-white" style="padding: 5px 15px; border-radius: 4px; font-size: 0.85rem; cursor: pointer; border: none;" onclick="window.utils.executePrintSingleJob('${orderJson}', '${jobJson}', ${index + 1}, ${jobs.length})">
                        <i class="bi bi-printer"></i> Imprimir Este Item
                    </button>
                </div>

                <div style="background: var(--bg-tertiary); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    <div style="font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 8px;">
                        ${job.product_title || ''} ${job.product_color || ''}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95rem;">
                        <div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">TEXTO:</div>
                            <strong>${job.job_text_title || '-'}</strong>
                        </div>
                        <div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">FONTE:</div>
                            <span>${job.job_text_font || '-'}</span>
                        </div>
                        <div style="grid-column: span 2; border-top: 1px dashed var(--border-color); padding-top: 5px;">
                            <div style="color: var(--text-muted); font-size: 0.8rem;">IMAGEM/VETOR:</div>
                            <strong>${job.job_figure_name || '-'}</strong>
                        </div>
                    </div>
                </div>

                <div style="font-size: 0.9rem; border-top: 1px dotted var(--border-color); padding-top: 10px;">
                    <strong style="color: var(--text-muted);">OBS:</strong> ${job.job_observ || 'SEM OBSERVAÇÕES.'}
                </div>
            </div>
        `}).join('');
    },

    render_modal_staff_edit(data) {
        const modal = document.querySelector('#modal-staff');

        // Populando o modal com os dados retornados
        modal.querySelector('#staff-name').value = data.name || '';
        modal.querySelector('#staff-email').value = data.email || '';
        modal.querySelector('#staff-phone').value = data.phone || '';
        modal.querySelector('#staff-date-of-birth').value = data.date_of_birth || '';
        modal.querySelector('#staff-level').value = data.permissions_level || '';
        modal.querySelector('#staff-job-position').value = data.job_position || '';
        modal.querySelector('#staff-status').value = data.status || 'active';

        modal.querySelector('.password-generated').innerText = '********';

        // Atribuímos o UID ao modal para o saveStaff saber que é edição
        modal.dataset.uid = data.uid;
    }
}

const utils = {
    async processImage(file, maxSizeMB) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const maxResolution = 1920;
                    if (width > maxResolution || height > maxResolution) {
                        const ratio = Math.min(maxResolution / width, maxResolution / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Função interna para tentar compressão progressiva
                    const attemptCompression = (q) => {
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject("Erro ao gerar Blob da imagem.");
                                return;
                            }

                            // Se o tamanho estiver ok OU a qualidade atingir o mínimo (0.1)
                            if (blob.size <= maxSizeBytes) {
                                resolve(blob);
                            } else if (q > 0.1) {
                                // Tenta novamente com qualidade menor
                                attemptCompression(Number((q - 0.1).toFixed(2)));
                            } else {
                                // Se chegou no mínimo de qualidade e ainda é grande
                                reject(`A imagem excedeu ${maxSizeMB}MB mesmo com compressão máxima.`);
                            }
                        }, 'image/webp', q);
                    };

                    attemptCompression(0.8);
                };

                img.onerror = () => reject("Erro ao carregar imagem no elemento Image.");
            };

            reader.onerror = (err) => reject("Erro ao ler o arquivo.");
        });
    },

    async dataColectorSale() { // Certifique-se de que é async
        const modal = document.getElementById('modal-sale');
        const uid = modal.getAttribute('data-uid');

        // 1. Dados Globais do Pedido
        const clientNameInput = modal.querySelector('#sale-client-name');
        const client_uid = clientNameInput.dataset.uid || "";
        const client_name = clientNameInput.value;
        const order_origin = modal.querySelector('#sale-origin').value;
        const client_phone = modal.querySelector('#sale-client-phone').value;
        const client_address = modal.querySelector('#sale-client-address').value;
        const order_status = modal.querySelector('#sale-status').value || "0";
        const order_priority = modal.querySelector('#sale-priority').value || "1";
        const order_delivery_date = modal.querySelector('#sale-delivery-date').value;

        // Validações Globais
        if (!client_name || !order_origin || !order_delivery_date) {
            ui.alert("Preencha os campos obrigatórios: Nome, Origem e Data de Entrega!", 'warning');
            return null;
        }

        let items = [];
        const cards = modal.querySelectorAll('.form-card');

        // 2. Leitura Síncrona/Sequencial de cada Card
        // Usamos for...of para que o await processImage funcione corretamente
        for (const [index, card] of cards.entries()) {

            const itemNumber = card.querySelector('.item-number strong')?.innerText || (index + 1);

            // Dados dos seletores costumizados
            const product = card.querySelector('.sale-list-products input:checked');
            const font = card.querySelector('.sale-list-fonts input:checked');
            const figure = card.querySelector('.sale-list-figures input:checked');

            if (!product) {
                ui.alert(`Selecione um produto para o Item ${itemNumber}`, 'warning');
                return null; // Interrompe tudo e retorna null
            }

            const product_uid = product.getAttribute('data-product_uid') || "";
            const product_title = product.getAttribute('data-product_title') || "";
            const product_color = product.getAttribute('data-product_color') || "";

            // Inicializa variáveis
            let uid = card.getAttribute('data-uid') || "";
            let text_title = card.querySelector('.sale-text-input')?.value || "";
            let text_font = font ? font.getAttribute('data-font_name') : "";
            let font_uid = font ? font.getAttribute('data-font_uid') : "";
            let figure_name = figure ? figure.getAttribute('data-figure_name') : "";
            let figure_url = figure ? figure.getAttribute('data-figure_url') : "";
            let figure_uid = figure ? figure.getAttribute('data-figure_uid') : "";
            let reference_image = null; // Iniciamos como null
            let art_json = "";
            let observation = "";

            const isCreatorMode = card.querySelector('.toggle-creator-mode').checked;

            if (isCreatorMode) {
                art_json = card.querySelector('.json-end-art')?.value;
                if (!art_json) {
                    ui.alert(`A arte customizada do item ${itemNumber} não foi finalizada!`, 'warning');
                    return null;
                }
                figure_name = "";
                figure_url = "";
                figure_uid = "";

            } else {
                if (!text_title && !figure_uid) {
                    ui.alert(`O item ${itemNumber} precisa de um texto ou figura definida!`, 'warning');
                    return null;
                }

                // PROCESSAMENTO DE IMAGEM (Aqui o await é vital)
                const fileField = card.querySelector('.sale-image-reference');
                if (fileField && fileField.files[0]) {
                    try {
                        // Espera converter a imagem para WebP antes de prosseguir para o próximo card
                        reference_image = await utils.processImage(fileField.files[0], 2);
                    } catch (err) {
                        ui.alert(`Erro na imagem do item ${itemNumber}: ${err}`, 'error');
                        return null;
                    }
                }
                observation = card.querySelector('.sale-observation')?.value || "";
            }

            items.push({
                uid,
                product_uid,
                product_title,
                product_color,
                text_title,
                text_font,
                font_uid,
                figure_name,
                figure_url,
                figure_uid,
                reference_image, // Agora é um Blob ou null
                art_json,
                observation
            });
        }

        // 3. Retorno do objeto completo
        return {
            uid,
            client_uid,
            client_name,
            client_address,
            client_phone,
            order_origin,
            order_status,
            order_priority,
            order_delivery_date,
            jobs: items
        };
    },

    async loadCardSales() {
        // Chamadas para carregamento da pagina em paralelo
        try {
            await Promise.all([
                window.actions.loadProductsOptions(),
                window.actions.loadFontsOptions(),
                window.actions.loadVectorsOptions()
            ]);


        } catch (error) {
            console.error("Erro no carregamento do formulário de venda:", error);
        }
    },

    fillJobData(card, job) {
        if (!job) return;

        card.setAttribute('data-uid', job.uid);

        // 1. Inserções diretas
        const textInput = card.querySelector('.sale-text-input');
        const preview = card.querySelector('.font-preview-display');
        const previewImage = card.querySelector('.image-preview');

        if (textInput) {
            textInput.value = job.job_text_title || '';
        }
        if (preview) {
            preview.innerText = job.job_text_title || '';
        }


        // 2. Seletores costumizados
        card.querySelectorAll(`.sale-list-products input`).forEach(radio => {
            if (radio.getAttribute('data-product_uid') === job.product_uid) {
                radio.checked = true;
            }
        })
        if (job.job_font_uid) {
            card.querySelectorAll(`.sale-list-fonts input`).forEach(radio => {
                if (radio.getAttribute('data-font_uid') === job.job_font_uid) {
                    radio.checked = true;

                    ui.previewFont(radio.getAttribute('data-font_name'), radio, preview);
                }
            })
        }
        if (job.job_figure_url) {
            card.querySelectorAll(`.sale-list-figures input`).forEach(radio => {
                if (radio.getAttribute('data-figure_uid') === job.job_figure_uid) {
                    radio.checked = true;

                    ui.previewImageVector(radio.getAttribute('data-figure_url'), radio, previewImage);
                }
            })
        }

        // 3. Imagem de Referência (Upload antigo)
        const imgRefPreview = card.querySelector('.preview-img-reference');
        if (imgRefPreview) {
            if (job.job_image_reference) {
                // Caminho para sua rota de proxy que busca no bucket 'jobs'
                imgRefPreview.src = `${job.job_image_reference}`;
                imgRefPreview.style.display = 'block';
            }
        }

        // 6. Observação
        const obsInput = card.querySelector('.sale-observation');
        if (obsInput) obsInput.value = job.job_observation || '';
        // // 7. Modo Criador Profissional (Logica de Alternância e JSON)
        // const creatorToggle = card.querySelector('.toggle-creator-mode');
        // const jsonInput = card.querySelector('.json-end-art');

        // if (job.job_art_json && job.job_art_json !== "null") {
        //     // Ativa o switch
        //     if (creatorToggle) {
        //         creatorToggle.checked = true;
        //         // Chama sua função global para trocar a visibilidade das divs (mode-default vs mode-creator)
        //         alternarModoCriador(creatorToggle);
        //     }
        // } else {
        //     // Se não houver arte JSON, garante que o modo criador esteja desligado
        //     if (creatorToggle) {
        //         creatorToggle.checked = false;
        //         // Força a volta para os campos padrão (texto, fonte, figura)
        //         alternarModoCriador(creatorToggle);
        //     }
        // }
    },

    applyFontPreview(input) {
        const card = input.closest('.form-card');
        const fontName = input.getAttribute('data-font_name');
        const previewSpan = card.querySelector('.sale-font-example span');
        const textInput = card.querySelector('.sale-text-input');

        if (previewSpan) {
            // Aplica a fonte visualmente
            previewSpan.style.fontFamily = fontName;
            // previewSpan.textContent = textInput.value || "Exemplo da Fonte";
        }
    },

    applyVectorPreview(input) {
        const card = input.closest('.form-card');
        const url = input.getAttribute('data-figure_url');
        const previewImg = card.querySelector('.preview-img-reference');

        if (previewImg && url) {
            previewImg.src = url;
        }
    },

    // Gerencia a troca do select de período
    handlePeriodChange() {
        const period = document.getElementById('filter-sale-period').value;
        const customContainer = document.getElementById('custom-date-container');
        const now = new Date();

        if (period === 'custom') {
            customContainer.style.display = 'flex';
            return; // Espera o usuário clicar no botão de busca
        } else {
            customContainer.style.display = 'none';
        }

        let start, end;

        if (period === 'this-month') {
            // Primeiro dia do mês atual
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            // Ultimo dia do mês atual
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === 'last-month') {
            // Primeiro dia do mês passado
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            // Último dia do mês passado
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        // Chama a função da API que você já tem, formatando para YYYY-MM-DD
        actions.loadSales(utils.formatDate(start), utils.formatDate(end));
    },

    // Valida e aplica datas manuais
    applyCustomDates() {
        const startVal = document.getElementById('date-start').value;
        const endVal = document.getElementById('date-end').value;

        if (!startVal || !endVal) {
            ui.alert("Por favor, selecione ambas as datas.", 'warning');
            return;
        }

        const dStart = new Date(startVal);
        const dEnd = new Date(endVal);

        if (dEnd < dStart) {
            ui.alert("A data final não pode ser menor que a data inicial.", 'warning');
            return;
        }

        // Validação de 6 meses (Regra da sua API)
        const diffTime = Math.abs(dEnd - dStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 180) {
            ui.alert("O intervalo máximo permitido é de 6 meses.", 'warning');
            return;
        }

        actions.loadSales(startVal, endVal);
    },

    //  Auxiliar para formatar data em YYYY-MM-DD
    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    async loder_modal_font_edit() {
        const uid = document.getElementById('asset-font-action-edit').getAttribute('data-uid');
        if (!uid || uid === '00') return;
        await actions.getFontDetails(uid);
    },

    async loder_modal_figure_edit() {
        const uid = document.getElementById('asset-figure-action-edit').getAttribute('data-uid');
        await actions.getFigureDetails(uid);
    },

    async executePrint(data) {
        const { order, jobs } = data;

        // 1. Gera o conteúdo HTML
        const htmlContent = this.generateOrderHTML(order, jobs);

        // 2. Abre a janela e imprime diretamente
        this.openPrintWindow(htmlContent);
    },

    async executePrintSingleJob(orderStr, jobStr, index, totalJobs) {
        try {
            // Parse os dados vindos codificados
            const order = JSON.parse(decodeURIComponent(orderStr));
            const job = JSON.parse(decodeURIComponent(jobStr));
            const displayID = order.id_num || order.uid.substring(0, 8).toUpperCase();

            // Gera HTML apenas desse Job
            const htmlContent = `
            <div class="print-container">
                <div class="ticket">
                    <div class="header-ticket">
                        <div class="order-title">PEDIDO #${displayID}</div>
                        <div class="order-title">ORDEM DE SERVIÇO</div>
                        <div style="font-size: 12px;">ITEM ${index} DE ${totalJobs}</div>
                    </div>

                    <div class="customer-section">
                        <div class="info-line"><span>CLIENTE:</span> <strong>${order.client_name || 'N/A'}</strong></div>
                        <div class="info-line"><span>CONTATO:</span> <strong>${order.client_phone || 'SEM CONTATO'}</strong></div>
                        <div class="info-line"><span>ENTREGA:</span> <strong>${order.order_delivery_date ? new Date(order.order_delivery_date).toLocaleDateString() : 'A COMBINAR'}</strong></div>
                        <div class="info-line"><span>ENDEREÇO:</div>
                        </span> <strong>${order.client_address || 'NÃO INFORMADO'}</strong>
                    </div>

                    <div class="job-focus">
                        <div class="job-main-title">${job.product_title || ''} ${job.product_color || ''}</div>
                        <div class="spec-item">TEXTO: <strong>${job.job_text_title || '-'}</strong></div>
                        <div class="spec-item">FONTE: ${job.job_text_font || '-'}</div>
                        <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
                        <div class="spec-item">IMAGEM: <strong>${job.job_figure_name || '-'}</strong></div>
                    </div>

                    <div class="obs-box">
                        <strong>OBS:</strong> ${job.job_observ || 'SEM OBSERVAÇÕES.'}
                    </div>

                    <div class="footer-mini">
                        ID: ${order.uid}<br>
                        ${new Date().toLocaleString()}
                    </div>
                </div>
            </div>`;

            // Abre a janela de impressão
            this.openPrintWindow(htmlContent);
        } catch (e) {
            console.error("Erro na impressão individual", e);
            ui.alert("Falha ao gerar impressão individual", 'error');
        }
    },

    generateOrderHTML(order, jobs) {
        const displayID = order.id_num || order.uid.substring(0, 8).toUpperCase();

        return `
<div class="print-container">
    ${jobs.map((job, index) => `
        <div class="ticket">
            <div class="header-ticket">
                <div class="order-title">PEDIDO #${displayID}</div>
                <div class="order-title">ORDEM DE SERVIÇO</div>
                <div style="font-size: 12px;">ITEM ${index + 1} DE ${jobs.length}</div>
            </div>

            <div class="customer-section">
                <div class="info-line"><span>CLIENTE:</span> <strong>${order.client_name || 'N/A'}</strong></div>
                <div class="info-line"><span>CONTATO:</span> <strong>${order.client_phone || 'SEM CONTATO'}</strong></div>
                <div class="info-line"><span>ENTREGA:</span> <strong>${order.order_delivery_date ? new Date(order.order_delivery_date).toLocaleDateString() : 'A COMBINAR'}</strong></div>
                <div class="info-line"><span>ENDEREÇO:</div>
                </span> <strong>${order.client_address || 'NÃO INFORMADO'}</strong>
            </div>

            <div class="job-focus">
                <div class="job-main-title">${job.product_title || ''} ${job.product_color || ''}</div>
                <div class="spec-item">TEXTO: <strong>${job.job_text_title || '-'}</strong></div>
                <div class="spec-item">FONTE: ${job.job_text_font || '-'}</div>
                <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
                <div class="spec-item">IMAGEM: <strong>${job.job_figure_name || '-'}</strong></div>
            </div>

            <div class="obs-box">
                <strong>OBS:</strong> ${job.job_observ || 'SEM OBSERVAÇÕES.'}
            </div>

            <div class="footer-mini">
                ID: ${order.uid}<br>
                ${new Date().toLocaleString()}
            </div>
        </div>
    `).join('')}
</div>`;
    },

    openPrintWindow(htmlContent) {
        const win = window.open('', '_blank');
        if (!win) return;

        win.document.write(`
    <html>
        <head>
            <title>Impressão de Tickets</title>
            <style>
                /* Configurações de página para térmica */
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: "Courier New", Courier, monospace;
                }

                .print-container { width: 72mm; margin: 0 auto; }

                /* Cada ticket é uma 'página' para a impressora cortar */
                .ticket {
                    page-break-after: always;
                    padding: 10px;
                    border-bottom: 1px dashed #000;
                    box-sizing: border-box;
                }

                .header-ticket { text-align: center; border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 5px; }
                .order-title { font-size: 18px; font-weight: bold; }

                .customer-section { border: 1px solid #000; padding: 5px; margin-bottom: 10px; font-size: 13px; }
                .info-line { display: flex; justify-content: space-between; }

                .job-focus { border: 2px solid #000; padding: 8px; margin: 10px 0; background: #eee; }
                .job-main-title { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 8px; display: block; }
                .spec-item { font-size: 13px; margin-bottom: 3px; }

                .obs-box { font-size: 12px; border-top: 1px dotted #000; padding-top: 5px; }
                .footer-mini { text-align: center; font-size: 10px; margin-top: 10px; }

                @media print {
                    .ticket:last-child { page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            ${htmlContent}
            <script>
                window.onload = () => {
                    window.print();
                    window.close();
                };
            </script>
        </body>
    </html>
`);
        win.document.close();
    },

    // Geração no Front-end com qualidade criptográfica
    generatePassword() {
        const modal = document.getElementById('modal-staff');
        if (modal && modal.getAttribute('data-uid')) {
            const confirm = ui.confirm('Gerar uma nova senha para este funcionário?');
            if (!confirm) return;
        }
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
        // Usamos crypto.getRandomValues para uma entropia de nível militar no navegador
        const array = new Uint32Array(12);
        window.crypto.getRandomValues(array);

        const pass = Array.from(array)
            .map((x) => chars[x % chars.length])
            .join('');

        const display = modal.querySelector('.password-generated');
        display.innerText = pass;
        display.setAttribute('data-value', pass);

        // Efeito visual tech: copiar para o clipboard automaticamente
        navigator.clipboard.writeText(pass);
        ui.alert("Senha gerada e copiada basta enviar para o colaborador!", "success");
    },

    _injectFontsToDocument(fontsArray) {
        const styleId = "dynamic-library-fonts";
        let styleTag = document.getElementById(styleId);

        if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        // Criamos as regras @font-face para cada fonte na biblioteca
        let css = "";
        fontsArray.forEach(f => {
            // Assume que f.font_url já é a URL pública absoluta vinda do Worker
            if (f.font_url && f.font_name) {
                css += `
                    @font-face {
                        font-family: '${f.font_name}';
                        src: url('${f.font_url}');
                        font-display: swap;
                    }
                `;
            }
        });
        styleTag.innerHTML = css;
    }
}

// Expondo as funções para o escopo global, permitindo chamadas de outros scripts
window.actions = actions;
window.renders = renders;
window.utils = utils;
