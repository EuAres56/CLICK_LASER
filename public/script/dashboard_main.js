document.addEventListener('DOMContentLoaded', async () => {
    const auth_token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');


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
            if (response.status === 401) {
                window.location.href = '/dashLogin';
                return null;
            }
            return response;
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

            if (!response || !response.ok) {
                console.error("Erro ao buscar jobs:", response ? await response.text() : "Sem resposta");
                return [];
            };

            const data = await response.json();
            renders.reder_grid_jobs(data);
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

            const formData = new FormData();

            // 2. Mapeia os itens (jobs) para separar arquivos do objeto JSON
            const sanitizedJobs = rawData.jobs.map((job, index) => {
                // Se houver uma imagem de referência em formato Blob
                if (job.reference_image instanceof Blob) {
                    // Anexa o binário ao FormData com uma chave única
                    // O servidor buscará por 'file_job_0', 'file_job_1', etc.
                    formData.append(`file_job_${index}`, job.reference_image, `reference_${index}.webp`);
                }

                // Removemos o campo 'reference_image' do objeto que irá para o JSON
                // para evitar erros de serialização de objetos binários
                const { reference_image, ...textData } = job;
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
                // 5. Envia os dados através do fetch global preparado para FormData
                const response = await this.apiFetch('orders/create', 'POST', formData);

                if (response && response.ok) {
                    const result = await response.json();
                    alert(`Pedido #${result.order_id} registrado com sucesso!`);

                    // Sugestão: Recarregar página ou fechar modal aqui
                    // window.location.reload();
                } else {
                    const errorResponse = await response?.json();
                    console.error("Save Error:", errorResponse);
                    alert(`Erro ao salvar: ${errorResponse?.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error("Network/Runtime Error:", error);
                alert("Falha crítica ao tentar salvar o pedido.");
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
            if (!confirm("Tem certeza que deseja excluir este produto permanentemente?")) return;

            try {
                const response = await this.apiFetch(`products/delete?uid=${uid}`, 'DELETE');

                if (response && response.ok) {
                    alert('Produto excluído com sucesso!');
                    if (typeof closeModal === 'function') ui.closeModal();
                    this.loadProducts();
                } else {
                    const err = await response.json();
                    alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
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
                    name: 'stock-name',
                    type: 'stock-type',
                    color: 'stock-color',
                    description: 'stock-description',
                    amount: 'stock-amount',
                    amount_min: 'stock-amount-min',
                    price_buy: 'stock-price-buy',
                    price_sell: 'stock-price-sell'
                };

                for (const [key, id] of Object.entries(fields)) {
                    const input = document.getElementById(id);
                    formData.append(key, input ? input.value : "");
                }
                if (uid) formData.append('uid', uid);

                // 2. Processamento das Imagens
                const inputSale = document.getElementById('stock-image');
                const inputCreator = document.getElementById('stock-image-creator');

                if (inputSale?.files?.[0]) {
                    const processedSale = await utils.processImage(inputSale.files[0], 1);
                    formData.append('image_sale', processedSale, 'product_sale.webp');
                }

                if (inputCreator?.files?.[0]) {
                    const processedCreator = await utils.processImage(inputCreator.files[0], 2);
                    formData.append('image_creator', processedCreator, 'product_creator.webp');
                }

                // 3. Definição Dinâmica de Método e Endpoint
                // Se tem UID, é UPDATE (PATCH), se não, é CREATE (POST)
                const method = uid ? 'PATCH' : 'POST';
                const endpoint = uid ? `products/update` : `products/create`;


                // 4. Envio
                const response = await this.apiFetch(endpoint, method, formData);

                if (response && response.ok) {
                    alert(uid ? 'Produto atualizado!' : 'Produto criado!');
                    if (typeof closeModal === 'function') ui.closeModal();
                    this.loadProducts();
                    this.loadProductsOptions();
                } else {
                    const err = await response.json().catch(() => ({ error: 'Erro na resposta da API' }));
                    alert('Erro: ' + (err.error || 'Não foi possível salvar'));
                }

            } catch (error) {
                console.error("Erro no salvamento:", error);
                alert("Falha técnica ao processar o produto.");
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
                    alert("Selecione um arquivo de fonte para criar o novo registro.");
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
                    alert(uid ? 'Fonte atualizada!' : 'Fonte criada com sucesso!');
                } else {
                    const err = await response.json().catch(() => ({ error: 'Erro ao processar fonte' }));
                    alert('Erro: ' + (err.error || 'Falha no servidor'));
                }
            } catch (error) {
                console.error("Erro ao salvar fonte:", error);
                alert("Falha crítica ao subir fonte.");
            }
        },

        async assetsDeleteFont() {
            const modal = document.getElementById('modal-font');
            const uid = modal.getAttribute('data-uid');

            if (!uid) return;
            if (!confirm("Excluir esta fonte removerá o acesso a ela em artes futuras. Confirmar?")) return;

            try {
                // Passando o UID via Query String conforme a rota da API espera
                const response = await this.apiFetch(`assets/fonts/delete?uid=${uid}`, 'DELETE');

                if (response && response.ok) {
                    alert('Fonte removida com sucesso!');
                    this.assetsLoadFonts();
                    ui.closeModal(); // Limpa o data-uid e os campos
                } else {
                    const err = await response.json().catch(() => ({ error: 'Erro ao deletar fonte' }));
                    alert('Erro: ' + (err.error || 'Não foi possível excluir'));
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
                // data deve ser o array de objetos vindo do banco (com a URL pública montada no Worker)

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
                    alert("Selecione um arquivo de imagem (PNG/SVG)");
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
                    alert(uid ? 'Vetor atualizado!' : 'Ativo salvo na biblioteca!');
                    if (typeof closeModal === 'function') ui.closeModal();
                } else {
                    const err = await response.json().catch(() => ({ error: 'Erro ao processar ativo' }));
                    alert('Erro: ' + (err.error || 'Falha no upload'));
                }
            } catch (error) {
                console.error("Erro ao salvar vetor/figura:", error);
                alert("Falha crítica ao subir ativo.");
            }
        },

        async assetsDeleteVector() {
            const modal = document.getElementById('modal-vector');
            const uid = modal.getAttribute('data-uid');

            if (!uid) return;
            if (!confirm("Deseja remover esta figura da biblioteca permanentemente?")) return;

            try {
                const response = await this.apiFetch(`assets/vectors/delete?uid=${uid}`, 'DELETE');

                if (response && response.ok) {
                    alert('Figura removida!');
                    this.assetsLoadVectors();
                    ui.closeModal();
                } else {
                    const err = await response.json().catch(() => ({ error: 'Erro ao deletar ativo' }));
                    alert('Erro: ' + (err.error || 'Falha na exclusão'));
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
        }


    }

    const renders = {
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

            // Altera o texto do botão para indicar edição
            modal.querySelector('.btn_modal.create').textContent = "Atualizar Fonte";
        },

        render_modal_order_edit(data) {

            const { order, jobs } = data;
            const modal = document.getElementById('modal-sale');
            const container = modal.querySelector('.form-box-list');
            console.log("order:", order);
            console.log("jobs:", jobs);
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

            // 4. Interface
            modal.querySelectorAll('.btn_modal.create').forEach(b => b.classList.add('d-none'));
            modal.querySelectorAll('.btn_modal.update').forEach(b => b.classList.remove('d-none'));
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
            if (!data) return alert("Erro ao carregar dados do produto.");
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

            window.resLoading(btn, result, function () { row.outerHTML = data });
        },
        // Injeta as rows de fontes na lista da biblioteca (Gestão)
        render_creator_fonts(htmlRows) {
            const container = document.getElementById('font-list');
            if (!container) return;

            container.innerHTML = '';
            htmlRows.forEach(row => container.insertAdjacentHTML('beforeend', row));

            // Preview automático do primeiro item da lista de gestão
            const firstRow = container.querySelector('.asset-row');
            if (firstRow) {
                const fontName = firstRow.getAttribute('data-name');
                previewFont(fontName, firstRow);
            }
        },

        // Injeta as rows de figuras na lista da biblioteca (Gestão)
        render_creator_vectors(htmlRows) {
            const container = document.getElementById('vector-list');
            if (!container) return;

            container.innerHTML = '';
            htmlRows.forEach(row => container.insertAdjacentHTML('beforeend', row));

            // Preview automático do primeiro vetor da lista de gestão
            const firstRow = container.querySelector('.asset-row');
            if (firstRow) {
                // O Worker já envia o onclick="previewImage('url', this)" pronto
                firstRow.click();
            }
        }
    }

    const utils = {
        async processImage(file, maxSizeMB) {
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

                        // Opcional: Redimensionar se for muito grande (ex: max 1920px)
                        const maxResolution = 1920;
                        if (width > maxResolution || height > maxResolution) {
                            if (width > height) {
                                height *= maxResolution / width;
                                width = maxResolution;
                            } else {
                                width *= maxResolution / height;
                                height = maxResolution;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Tentativa inicial de conversão com qualidade 0.8
                        let quality = 0.8;

                        const convert = (q) => {
                            canvas.toBlob((blob) => {
                                if (blob.size > maxSizeMB * 1024 * 1024 && q > 0.1) {
                                    // Se ainda for grande, tenta com qualidade menor
                                    convert(q - 0.1);
                                } else if (blob.size > maxSizeMB * 1024 * 1024) {
                                    reject(`A imagem é muito grande. Mesmo comprimida, excedeu ${maxSizeMB}MB.`);
                                } else {
                                    resolve(blob);
                                }
                            }, 'image/webp', q);
                        };

                        convert(quality);
                    };
                };
                reader.onerror = (err) => reject(err);
            });
        },

        async dataColectorSale() { // Certifique-se de que é async
            const modal = document.getElementById('modal-sale');

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
                alert("Preencha os campos obrigatórios: Nome, Origem e Data de Entrega!");
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

                console.log(figure);

                if (!product) {
                    alert(`Selecione um produto para o Item ${itemNumber}`);
                    return null; // Interrompe tudo e retorna null
                }

                const product_uid = product.getAttribute('data-product_uid') || "";
                const product_title = product.getAttribute('data-product_title') || "";
                const product_color = product.getAttribute('data-product_color') || "";

                // Inicializa variáveis
                let text_title = card.querySelector('.sale-text-input')?.value || "";
                let text_font = font ? font.getAttribute('data-font_name') : "";
                let figure_name = figure ? figure.getAttribute('data-figure_name') : "";
                let figure_url = figure ? figure.getAttribute('data-figure_url') : "";
                let reference_image = null; // Iniciamos como null
                let art_json = "";
                let observation = "";

                const isCreatorMode = card.querySelector('.toggle-creator-mode').checked;

                if (isCreatorMode) {
                    art_json = card.querySelector('.json-end-art')?.value;
                    if (!art_json) {
                        alert(`A arte customizada do item ${itemNumber} não foi finalizada!`);
                        return null;
                    }
                    figure_name = "";
                    figure_url = "";
                } else {
                    if (!text_title && !figure_url) {
                        alert(`O item ${itemNumber} precisa de um texto ou figura definida!`);
                        return null;
                    }

                    // PROCESSAMENTO DE IMAGEM (Aqui o await é vital)
                    const fileField = card.querySelector('.sale-image-reference');
                    if (fileField && fileField.files[0]) {
                        try {
                            // Espera converter a imagem para WebP antes de prosseguir para o próximo card
                            reference_image = await utils.processImage(fileField.files[0], 2);
                        } catch (err) {
                            alert(`Erro na imagem do item ${itemNumber}: ${err}`);
                            return null;
                        }
                    }
                    observation = card.querySelector('.sale-observation')?.value || "";
                }

                items.push({
                    product_uid,
                    product_title,
                    product_color,
                    text_title,
                    text_font,
                    figure_name,
                    figure_url,
                    reference_image, // Agora é um Blob ou null
                    art_json,
                    observation
                });
                console.log(items);
            }

            // 3. Retorno do objeto completo
            return {
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

            // 1. Inserções diretas
            const textInput = card.querySelector('.sale-text-input');
            const preview = card.querySelector('.font-preview-display');

            if (textInput) {
                textInput.value = job.job_text_title || '';
            }
            if (preview) {
                preview.innerText = job.job_text_title || '';
            }


            // 2. Seletores costumizados
            if (job.job_font_uid) {
                card.querySelectorAll(`.sale-list-fonts input`).forEach(radio => {
                    if (radio.getAttribute('data-font_uid') === job.job_font_uid) {
                        radio.checked = true;

                        ui.previewFont(radio.getAttribute('data-font_name'), radio, preview);
                    }
                })
            }
            card.querySelectorAll(`.sale-list-products input`).forEach(radio => {
                if (radio.getAttribute('data-product_uid') === job.product_uid) {
                    radio.checked = true;
                }
            })
            if (job.job_figure_url) {
                card.querySelectorAll(`.sale-list-figures input`).forEach(radio => {
                    if (radio.getAttribute('data-figure_url') === job.job_figure_url) {
                        radio.checked = true;
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
                alert("Por favor, selecione ambas as datas.");
                return;
            }

            const dStart = new Date(startVal);
            const dEnd = new Date(endVal);

            if (dEnd < dStart) {
                alert("A data final não pode ser menor que a data inicial.");
                return;
            }

            // Validação de 6 meses (Regra da sua API)
            const diffTime = Math.abs(dEnd - dStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 180) {
                alert("O intervalo máximo permitido é de 6 meses.");
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
            await actions.getFontDetails(uid);
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

    // Chamadas para carregamento da pagina em paralelo
    try {
        await Promise.all([
            window.actions.searchJobs(),
            window.actions.loadProducts(),
            window.actions.assetsLoadFonts(),
            window.actions.assetsLoadVectors(),
            window.utils.handlePeriodChange()
        ]);

    } catch (error) {
        console.error("Erro no carregamento inicial:", error);
    }
});


