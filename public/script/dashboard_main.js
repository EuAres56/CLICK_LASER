// Gerencia a troca do select de período
function handlePeriodChange() {
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
    window.actions.loadSales(formatDate(start), formatDate(end));
}

// Valida e aplica datas manuais
function applyCustomDates() {
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

    window.actions.loadSales(startVal, endVal);
}


//  Auxiliar para formatar data em YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', async () => {
    const auth_token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');


    const actions = {
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

            const response = await fetch(`/api/private/${endpoint}`, config);
            if (response.status === 401) {
                window.location.href = '/dashLogin';
                return null;
            }
            return response;
        },
        async searchJobs(date_filter = null) {
            if (!date_filter) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                date_filter = `${yyyy}-${mm}-${dd}`;
            }

            const response = await this.apiFetch(`dashboard/jobs/search?date=${date_filter}`, 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao buscar jobs:", response ? await response.text() : "Sem resposta");
                return [];
            };

            const data = await response.json();
            renders.reder_grid_jobs(data);
        },

        async loadSales(start, end) {

            // Chama o endpoint através do apiFetch para manter o padrão de segurança
            const response = await this.apiFetch(`dashboard/orders/search?start=${start}&end=${end}`, 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao buscar vendas");
                return;
            }

            const data = await response.json(); // Array de strings HTML (linhas da tabela)
            renders.render_sales_table(data);
        },

        async loadProducts() {
            const response = await this.apiFetch(`dashboard/products/load`, 'GET');
            if (!response || !response.ok) {
                console.error("Erro ao buscar produtos");
                return;
            }
            const data = await response.json();
            renders.render_products_table(data);
        },

        async saveProduct() {
            try {
                const formData = new FormData();

                // Captura campos de texto
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
                    const value = document.getElementById(id).value;
                    formData.append(key, value);
                }

                // Processamento das Imagens usando seu utils
                const fileSale = document.getElementById('stock-image').files[0];
                const fileCreator = document.getElementById('stock-image-creator').files[0];

                if (fileSale && fileSale.size > 0) {
                    const processedSale = await utils.processImage(fileSale, 1); // Max 1MB
                    formData.append('image_sale', processedSale, 'product_sale.webp');
                }

                if (fileCreator && fileCreator.size > 0) {
                    const processedCreator = await utils.processImage(fileCreator, 2); // Max 2MB
                    formData.append('image_creator', processedCreator, 'product_creator.webp');
                }

                // Envio usando o padrão do seu objeto actions
                // Se houver um data-uid no modal, usamos PUT para update, senão POST para create
                const modal = document.getElementById('modal-product');
                const uid = modal.getAttribute('data-uid');
                const method = uid ? 'PUT' : 'POST';
                const endpoint = uid ? `dashboard/products/${uid}` : `dashboard/products/create`;

                const response = await this.apiFetch(endpoint, method, formData);

                if (response && response.ok) {
                    alert('Produto salvo com sucesso!');
                    closeModal(); // Certifique-se que esta função está no escopo global
                    this.loadProducts(); // Recarrega a lista
                } else {
                    const err = await response.json();
                    alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
                }

            } catch (error) {
                console.error("Erro no fluxo de salvamento:", error);
                alert(error);
            }
        },

        async getProductDetails(productUid) {
            // Usando seu apiFetch para manter o padrão de headers e auth
            const response = await this.apiFetch(`dashboard/products/get?uid=${productUid}`, 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao buscar detalhes");
                return null;
            }
            const data = await response.json();
            renders.render_modal_product_edit(data);
        },

        async updateProduct(formData) {
            try {
                const response = await fetch(`/dashboard/products/update`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData // Envia o FormData diretamente
                });
                return await response.json();
            } catch (err) {
                return { error: err.message };
            }
        }

    }
    window.actions = actions; // Expondo as ações para o escopo global, permitindo chamadas de outros scripts

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
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto encontrado.</td></tr>';
                return;
            }

            // Insere cada linha (string HTML vinda da Worker) na tabela
            data.forEach(row => {
                tbody.insertAdjacentHTML('beforeend', row);
            })
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
        }
    }
    window.renders = renders; // Expondo os renders para o escopo global


    // Busca os jobs e as vendas no carregamento da página
    await window.actions.searchJobs();
    await window.actions.loadProducts();
    handlePeriodChange();
});


