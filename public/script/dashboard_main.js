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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`,
                'X-User-Id': userId
            };
            const config = { method, headers };
            if (body) config.body = JSON.stringify(body);

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
            console.log("Jobs recebidos do servidor:", data);
            renders.reder_grid_jobs(data);
        },

        async loadSales(start, end) {
            console.log(`Buscando vendas de ${start} até ${end}`);

            // Chama o endpoint através do apiFetch para manter o padrão de segurança
            const response = await this.apiFetch(`dashboard/orders/search?start=${start}&end=${end}`, 'GET');

            if (!response || !response.ok) {
                console.error("Erro ao buscar vendas");
                return;
            }

            const data = await response.json(); // Array de strings HTML (linhas da tabela)
            renders.render_sales_table(data);
        }

        async loadProducts() {
            const response = await this.apiFetch(`dashboard/products`, 'GET');
            if (!response || !response.ok) {
                console.error("Erro ao buscar produtos");
                return;
            }
            const data = await response.json();
            console.log("Produtos recebidos do servidor:", data);
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
        }
    }

    window.renders = renders; // Expondo os renders para o escopo global


    // Busca os jobs e as vendas no carregamento da página
    await window.actions.searchJobs();
    handlePeriodChange();
});
