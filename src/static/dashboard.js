function constructHome(data) {
    return `
        <section id="s-home" class="content-section active">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Painel de Controle</h2>
                    <p class="text-muted">Fluxo de produção e vendas</p>
                </div>
                <div id="display-date" class="text-muted"></div>
            </div>

            <div class="dashboard-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon bg-warning-light"><i class="bi bi- megaphone"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Pedidos Pendentes</span>
                        <span class="stat-value">${data?.pending_orders || 0}</span>
                        <small>Aguardando validação</small>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-blue-light"><i class="bi bi-play-circle"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Em Gravação</span>
                        <span class="stat-value">${data?.active_jobs || 0}</span>
                        <small>Jobs ativos na linha</small>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon bg-success-light"><i class="bi bi-truck"></i></div>
                    <div class="stat-info">
                        <span class="stat-label">Concluídos</span>
                        <span class="stat-value">${data?.completed_jobs || 0}</span>
                        <small>Prontos/Despachados hoje</small>
                    </div>
                </div>
            </div>

            <div class="dashboard-lower-grid" style="grid-template-columns: 1fr;">
                <div class="dash-card">
                    <p>Sem gravações pendentes</p>
                </div>
            </div>
        </section>
    `
}
function constuctOrders(data) {
    return `
        <section id="s-sales" class="content-section">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Gestão de Vendas e Pedidos</h2>
                    <p class="text-muted">Controle o fluxo desde o contato inicial até o envio</p>
                </div>
                <div class="import-buttons box-h">
                    <button class="btn-req retangle btn-import btn-for-modal" data-modal="modal-sale"
                        data-callback="utils.loadCardSales">
                        <i class="bi bi-cart-plus"></i> Novo Pedido
                    </button>
                </div>
            </div>

            <div class="filter-bar-inventory">
                <div class="search-container">
                    <i class="bi bi-search"></i>
                    <input class="search-box" type="text" id="filter-sale-search"
                        placeholder="Buscar por Cliente ou ID..." data-list_class="table-sales"
                        data-list_type="row-item">
                </div>

                <div class="filter-group">
                    <select id="filter-sale-period" onchange="utils.handlePeriodChange()">
                        <option value="this-month">Este Mês</option>
                        <option value="last-month">Mês Passado</option>
                        <option value="custom">Selecionar Intervalo...</option>
                    </select>

                    <div id="custom-date-container" style="display: none; align-items: center; gap: 5px;">
                        <input type="date" id="date-start">
                        <span>até</span>
                        <input type="date" id="date-end">
                        <button class="btn-local retangle btn-import btn-blue" style="padding: 5px 10px;"
                            onclick="applyCustomDates()">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
                <div class="filter-group">
                    <select id="filter-sale-status" onchange="filterSales()">
                        <option value="all">Todos os Status</option>
                        <option value="Aguardando">Aguardando Confirmação</option>
                        <option value="Produção">Em Produção</option>
                        <option value="Pronto">Pronto para Entrega</option>
                        <option value="Concluído">Concluído</option>
                    </select>

                    <select id="filter-sale-origin" onchange="filterSales()">
                        <option value="all">Todas as Origens</option>
                        <option value="Instagram">Instagram</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Site">Site</option>
                    </select>
                </div>
            </div>

            <div class="card-inventory-container">
                <table class="table-custom table-sales">
                    <thead>
                        <tr>
                            <th>Nº</th>
                            <th>Cliente</th>
                            <th>Qtd. Itens</th>
                            <th>Origem</th>
                            <th>Data</th>
                            <th>Status</th>
                            <th class="actions-col">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="sales-table-body">
                    ${data?.html || "Nenhuma venda encontrada"}
                    </tbody>
                </table>
            </div>
        </section>
    `
}
function constructProduction(data) {
    return `
        <section id="s-jobs" class="content-section">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Fila de Produção (Laser)</h2>
                    <p class="text-muted">Acompanhe e execute as gravações pendentes</p>
                </div>
                <div class="status-counters box-h">
                    <div class="counter-card">
                        <span class="label">Pendentes:</span>
                        <span class="value">12</span>
                    </div>
                    <div class="counter-card highlight">
                        <span class="label">Produzindo:</span>
                        <span class="value">01</span>
                    </div>
                </div>
            </div>

            <div class="filter-bar-inventory">
                <div class="search-container">
                    <i class="bi bi-search"></i>
                    <input class="search-box" type="text" id="filter-job-search" placeholder="Buscar pedido ou item..."
                        data-list_class="card-grid-jobs" data-list_type="card-item">
                </div>

                <div class="filter-group">
                    <select id="filter-machine" onchange="filterJobs()">
                        <option value="all">Todas as Máquinas</option>
                        <option value="Laser 01">Laser Fiber 01</option>
                        <option value="Laser 02">Laser CO2 01</option>
                    </select>

                    <select id="filter-priority" onchange="filterJobs()">
                        <option value="all">Todas as Prioridades</option>
                        <option value="Alta">Urgente</option>
                        <option value="Normal">Normal</option>
                    </select>
                </div>
            </div>

            <div id="jobs-grid" class="card-grid card-grid-jobs">
                ${data?.html || '<div class="card-empty"><i class="bi bi-clipboard-x"></i><span class="text-muted">Nenhuma gravação pendente</span></div>'}
            </div>
        </section>
    `
}
function constuctStock(data) {
    return `
            <section id="s-stock" class="content-section">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Controle de Estoque</h2>
                    <p class="text-muted">Gestão de insumos e produtos para gravação</p>
                </div>
                <div class="import-buttons box-h">
                    <button class="btn-local retangle btn-import btn-blue" onclick="exportarRelatorio()">
                        <i class="bi bi-download"></i> Exportar Planilha
                    </button>
                    <button class="btn-local retangle btn-import btn-for-modal" data-modal="modal-product">
                        <i class="bi bi-plus-circle"></i> Novo Produto
                    </button>
                </div>
            </div>

            <div class="filter-bar-inventory">
                <div class="search-container">
                    <i class="bi bi-search"></i>
                    <input class="search-box" type="text" id="filter-stock-title" placeholder="Buscar por produto..."
                        data-list_class="table-inventory" data-list_type="row-item">
                </div>

                <div class="filter-group">
                    <select id="filter-stock-type">
                        <option value="all">Todos os Tipos</option>
                        <option value="Copo">Copos</option>
                        <option value="Garrafa">Garrafas</option>
                        <option value="Caneca">Canecas</option>
                        <option value="Acessório">Acessórios</option>
                    </select>

                    <select id="filter-stock-color">
                        <option value="all">Todas as Cores</option>
                        <option value="Preto">Preto</option>
                        <option value="Branco">Branco</option>
                        <option value="Azul">Azul</option>
                        <option value="Rosa">Rosa</option>
                        <option value="Verde">Verde</option>
                    </select>
                </div>
            </div>

            <div class="card-inventory-container">
                <table class="table-custom table-inventory">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Produto</th>
                            <th>Tipo</th>
                            <th>Cor</th>
                            <th>Qtd. Atual</th>
                            <th>Qtd. Mínima</th>
                            <th>Status</th>
                            <th class="actions-col">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="stock-table-body">
                        ${data?.html || '<tr><td colspan="8"><div class="card-empty"><i class="bi bi-clipboard-x"></i><span class="text-muted">Nenhum produto cadastrado</span></div></td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
    `
}
function constructCreator(data) {
    return `
        <section id="s-creator" class="content-section">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Biblioteca de Ativos</h2>
                    <p class="text-muted">Gerencie suas fontes e vetores para gravação</p>
                </div>
                <div class="import-buttons box-h">
                    <button class="btn-local retangle btn-import btn-blue btn-for-modal" data-modal="modal-vector">
                        <i class="bi bi-vector-pen"></i> Importar Vetor/Imagem
                    </button>
                    <button class="btn-local retangle btn-import btn-for-modal" data-modal="modal-font">
                        <i class="bi bi-file-earmark-font"></i> Importar Fonte
                    </button>

                </div>
            </div>

            <div class="creator-container">

                <div class="asset-group">
                    <div class="group-header">
                        <h3><i class="bi bi-fonts"></i> Fontes Disponíveis</h3>
                        <div class="filter-controls">
                            <div class="search-container">
                                <i class="bi bi-search"></i>
                                <input class="search-box" type="text" id="filter-font" placeholder="Buscar fonte..."
                                    data-list_class="assets-list-fonts" data-list_type="select-item">
                            </div>
                        </div>
                    </div>

                    <div class="asset-layout">
                        <div class="asset-container">
                            <div class="asset-controls">
                                <button id="asset-font-action-edit" class="btn-req square btn-for-modal"
                                    data-modal="modal-font" data-uid="00" data-callback="utils.loder_modal_font_edit"><i
                                        class="bi bi-pencil"></i></button>
                                <button id="asset-font-action-delete" class="btn-local square"><i
                                        class="bi bi-trash"></i></button>
                            </div>
                            <div class="asset-list assets-list-fonts" id="font-list">
                                ${data.fonts || '<div class="card-empty"></i><span class="text-muted">Nenhuma fonte cadastrada</span></div>'}
                            </div>

                        </div>

                        <div class="asset-viewer">
                            <div id="font-preview-display" style="font-family: 'Poppins';">
                                SIMULAÇÃO COMPLETA DE FONTE AQUI <br>
                                simulação completa de fonte aqui <br>
                                0123456789
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="divider">

                <div class="asset-group">
                    <div class="group-header">
                        <h3><i class="bi bi-images"></i> Vetores e Imagens (PNG/SVG)</h3>
                        <div class="filter-controls">
                            <div class="search-container">
                                <i class="bi bi-search"></i>
                                <input class="search-box" type="text" id="filter-vector-name"
                                    placeholder="Nome do arquivo..." data-list_class="assets-list-figures"
                                    data-list_type="select-item">
                            </div>
                            <select id="filter-vector-category" onchange="filterAssets('vector')">
                                <option value="all">Todas Categorias</option>
                                <option value="Logos">Logos</option>
                                <option value="Brasões">Brasões</option>
                                <option value="Datas">Datas</option>
                                <option value="Desenhos">Desenhos</option>
                            </select>
                        </div>
                    </div>

                    <div class="asset-layout">
                        <div class="asset-container">
                            <div class="asset-controls">
                                <button id="asset-figure-action-edit" class="btn-local square btn-for-modal"
                                    data-modal="modal-vector" data-uid="00"
                                    data-callback="utils.loder_modal_figure_edit"><i class="bi bi-pencil"></i></button>
                                <button id="asset-figure-action-delete" class="btn-local square"><i
                                        class="bi bi-trash"></i></button>
                            </div>
                            <div class="asset-list assets-list-figures" id="vector-list">
                            ${data.figures || '<div class="card-empty"><span class="text-muted">Nenhuma arte cadastrada</span></div>'}
                            </div>
                        </div>

                        <div class="container-image-preview asset-viewer image-checkered">
                            <img class="image-preview" id="figure-preview-display" src="" alt="Preview">
                        </div>
                    </div>
                </div>

            </div>
        </section>
    `
}

function constructStaff(data = {}) {
    return `
        <section id="s-team" class="content-section">
            <div class="section-header-actions">
                <div class="brand-title">
                    <h2>Gerenciamento da Equipe</h2>
                    <p class="text-muted">Controle de acessos e operadores de produção</p>
                </div>
                <div class="import-buttons box-h">
                    <button class="btn-local retangle btn-import" onclick="openModalNovoFuncionario()">
                        <i class="bi bi-person-plus"></i> Adicionar Membro
                    </button>
                </div>
            </div>

            <div class="filter-bar-inventory">
                <div class="search-container">
                    <i class="bi bi-search"></i>
                    <input type="text" id="filter-staff-name" placeholder="Buscar por nome ou e-mail...">
                </div>

                <div class="filter-group">
                    <select id="filter-staff-role" onchange="filterStaff()">
                        <option value="all">Todos os Cargos</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Operador Laser">Operador Laser</option>
                        <option value="Vendedor">Vendedor</option>
                        <option value="Designer">Designer</option>
                    </select>

                    <select id="filter-staff-status" onchange="filterStaff()">
                        <option value="all">Todos os Status</option>
                        <option value="Ativo">Ativos</option>
                        <option value="Inativo">Inativos</option>
                    </select>
                </div>
            </div>

            <div class="card-inventory-container">
                <table class="table-custom">
                    <thead>
                        <tr>
                            <th>Colaborador</th>
                            <th>Cargo</th>
                            <th>Nível de Acesso</th>
                            <th>Última Atividade</th>
                            <th>Status</th>
                            <th class="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="staff-table-body">
                        ${data || '<div class="card-empty"><span class="text-muted">Nenhum colaborador cadastrado</span></div>'}
                    </tbody>
                </table>
            </div>
        </section>
    `
}

export { constructHome, constuctOrders, constructProduction, constuctStock, constructCreator, constructStaff }
