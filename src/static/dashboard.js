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

function constructStaff(data = null) {
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

function constructPageNav(section, name) {
    return `
    <li class="btn-local retangle btn-nav nav-item" id="btn-nav-${section}"
    onclick="ui.tab(this, 's-${section}')">${name} </li>
    `
}

function constructModalBase(modal_name, modal_header, modal_body, modal_footer) {
    return `
<div class="modal" id="modal-${modal_name}" data-uid="">
    <div class="modal-container">
        <div class="modal-header">
            ${modal_header}
        </div>
        <div class="modal-body">
            ${modal_body}
        </div>
        <div class="modal-footer">
            ${modal_footer}
        </div>
    </div>
</div>
    `

}

function constructModalProduct() {
    const modal_header = `
<h2>Produto</h2><button class="btn-local square close-modal" onclick="ui.closeModal()"><iclass="bi bi-x-lg"></i></button>
    `
    const modal_body = `
<div class="form-line">
    <div class="form-group">
        <label for="stock-name">Nome:</label>
        <input type="text" id="stock-name">
    </div>
    <div class="form-group">
        <label for="stock-type">Tipo:</label>
        <input type="text" id="stock-type"></input>
    </div>
</div>
<div class="form-line">
    <div class="form-group">
        <label for="stock-color">Cor:</label>
        <input type="text" id="stock-color">
    </div>
    <div class="form-group">
        <label for="stock-description">Descrição:</label>
        <input type="text" id="stock-description">
    </div>
</div>
<div class="form-line">
    <div class="form-group">
        <label for="stock-amount">Quantidade atual:</label>
        <input type="number" id="stock-amount">
    </div>
    <div class="form-group">
        <label for="stock-amount-min">Quantidade minima:</label>
        <input type="number" id="stock-amount-min">
    </div>
</div>
<div class="form-line">
    <div class="form-group">
        <label for="stock-price-buy">Preço de compra:</label>
        <input type="text" id="stock-price-buy">
    </div>
    <div class="form-group">
        <label for="stock-price-sell">Preço de venda:</label>
        <input type="text" id="stock-price-sell">
    </div>
</div>

<div class="form-line">
    <div class="form-group">
        <label for="stock-image">Imagem de venda:</label>
        <input class="input-img" data-preview="preview-sale" type="file" id="stock-image">
        <img id="preview-sale" class="img-preview" src="">
    </div>
    <div class="form-group">
        <label for="stock-image-creator">Imagem do criador:</label>
        <input class="input-img" data-preview="preview-creator" type="file" id="stock-image-creator">
        <img id="preview-creator" class="img-preview" src=""
            style="display:none; width: 80px; margin-top: 5px;">
    </div>
</div>
    `
    const modal_footer = `
<button type="button" class="btn_modal create" onclick="actions.saveProduct()">Salvar</button>
<button type="button" class="btn_modal update" onclick="actions.deleteProduct()">Deletar</button>
<button type="button" class="btn_modal update" onclick="actions.saveProduct()">Salvar</button>
    `
    return constructModalBase('product', modal_header, modal_body, modal_footer)
}

function constructModalFont() {
    const modal_header = `
<h2>Importar Fonte</h2><button class="btn-local square close-modal" onclick="ui.closeModal()"><i class="bi bi-x-lg"></i></button>
    `
    const modal_body = `
<div class="form-line">
    <div class="form-group">
        <label for="asset-font-name">Nome da Fonte:</label>
        <input type="text" id="asset-font-name" placeholder="Ex: Poppins Bold">
    </div>
    <div class="form-group">
        <label for="asset-font-type">Tipo/Estilo:</label>
        <select id="asset-font-type">
            <option value="Sans Serif">Sans Serif</option>
            <option value="Serif">Serif</option>
            <option value="Display">Display / Decorativa</option>
            <option value="Script">Script / Manuscrita</option>
        </select>
    </div>
</div>

<div class="form-group-border" style="margin-top: 15px; padding: 10px;">
    <label class="d-none">Origem do Recurso:</label>
    <div class="form-line d-none" style="gap: 10px; margin-bottom: 10px;">
        <button class="btn-local retangle btn-source-type active"
            onclick="toggleAssetSource(this, 'file', 'font')">Arquivo Local</button>
        <button class="btn-local retangle btn-source-type"
            onclick="toggleAssetSource(this, 'url', 'font')">URL Externa</button>
    </div>

    <div id="font-source-file">
        <label for="asset-font-file">Selecionar Arquivo (.ttf, .otf):</label>
        <input type="file" id="asset-font-file" accept=".ttf,.otf">
        <small id="current-font-path" class="d-none"
            style="display: block; margin-top: 5px; color: var(--color-primary);">
            Arquivo atual: <span id="font-filename"></span>
        </small>
    </div>

    <div id="font-source-url" class="d-none">
        <label for="asset-font-url-path">Link da Fonte (URL):</label>
        <input type="url" id="asset-font-url-path" placeholder="https://exemplo.com/fonte.ttf">
    </div>
</div>
    `
    const modal_footer = `
<button type="button" class="btn_modal create" onclick="actions.assetsSaveFont()">Importar</button>
<button type="button" class="btn_modal update" onclick="actions.assetsSaveFont()">Salvar</button>
    `
    return constructModalBase('font', modal_header, modal_body, modal_footer)
}

function constructModalFigure() {
    const modal_header = `
<h2>Importar Vetor ou Imagem</h2>
<button class="btn-local square close-modal" onclick="ui.closeModal()"><i class="bi bi-x-lg"></i></button>
    `
    const modal_body = `
<div class="form-line">
    <div class="form-group">
        <label for="asset-vector-name">Nome do Ativo:</label>
        <input type="text" id="asset-vector-name" placeholder="Ex: Brasão de Armas">
    </div>
    <div class="form-group">
        <label for="asset-vector-category">Categoria:</label>
        <select id="asset-vector-category">
            <option value="Logos">Logos</option>
            <option value="Brasões">Brasões</option>
            <option value="Datas">Datas</option>
            <option value="Desenhos">Desenhos</option>
        </select>
    </div>
</div>

<div class="form-group-border" style="margin-top: 15px; padding: 10px;">
    <label class="d-none">Origem do Recurso:</label>
    <div class="form-line d-none" style="gap: 10px; margin-bottom: 10px;">
        <button class="btn-local retangle btn-source-type active"
            onclick="toggleAssetSource(this, 'file', 'vector')">Arquivo Local</button>
        <button class="btn-local retangle btn-source-type"
            onclick="toggleAssetSource(this, 'url', 'vector')">URL Externa</button>
    </div>

    <div id="vector-source-file">
        <label for="asset-vector-file">Selecionar Imagem (SVG, PNG, WebP):</label>
        <input class="input-img" data-preview="preview-vector-import" type="file" id="asset-vector-file"
            accept=".svg,.png,.webp">
        <small id="current-figure-path" class="d-none"
            style="display: block; margin-top: 5px; color: var(--color-primary);">
            Arquivo atual: <span id="figure-filename"></span>
        </small>
        <img id="preview-vector-import" class="img-preview" src="">
    </div>

    <div id="vector-source-url" class="d-none">
        <label for="vector-url-path">Link da Imagem (URL):</label>
        <input type="url" id="vector-url-path" placeholder="https://exemplo.com/imagem.png">
    </div>
</div>
    `
    const modal_footer = `
<button type="button" class="btn_modal create" onclick="actions.assetsSaveVector()">Importar</button>
<button type="button" class="btn_modal update" onclick="actions.assetsSaveVector()">Atualizar</button>
    `
    return constructModalBase('vector', modal_header, modal_body, modal_footer)
}

function constructModalViewOrder() {
    const modal_header = `
<h2>Visualização do Pedido</h2><span class="view-id" style="font-size: 0.9rem; color: var(--text-muted);"></span>
<button class="btn-local square close-modal" onclick="ui.closeModal()"><iclass="bi bi-x-lg"></i></button>
    `
    const modal_body = `
<div class="info-grid"
    style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
    <div><strong>Cliente:</strong>
        <p class="view-client"></p>
    </div>
    <div><strong>Telefone:</strong>
        <p class="view-phone"></p>
    </div>
    <div style="grid-column: span 2;"><strong>Endereço:</strong>
        <p class="view-address"></p>
    </div>
    <div><strong>Data de Entrega:</strong>
        <p class="view-delivery"></p>
    </div>
</div>
<hr style="margin-bottom: 15px; border: 0; border-top: 1px solid var(--border-color);">
<div class="view-jobs-list">
</div>
    `
    const modal_footer = `
    `
    return constructModalBase('view-order', modal_header, modal_body, modal_footer)
}

function constructModalSale() {
    const modal_header = `
<h2>Pedido</h2>
<button class="btn-local square close-modal" onclick="ui.closeModal()"><i class="bi bi-x-lg"></i></button>
    `
    const modal_body = `
<div class="form-line">
    <div class="form-group">
        <label for="sale-client-name">Nome do cliente:</label>
        <input type="text" id="sale-client-name" required placeholder="Digite o nome do cliente">
    </div>
    <div class="form-group">
        <label for="sale-name">Origem do pedido:</label>
        <select name="origin" id="sale-origin" required>
            <option value="">Selecione uma opção</option>
            <option value="0">Presencial</option>
            <option value="1">Anuncio</option>
            <option value="2">Instagram</option>
            <option value="3">WhatsApp</option>
            <option value="4">Site</option>
            <option value="5">Indicação</option>
            <option value="6">Redirecionado de outro pedido</option>
        </select>
    </div>
</div>
<div class="form-line">
    <div class="form-group">
        <label for="sale-client-phone">Telefone do cliente:</label>
        <input type="text" id="sale-client-phone" required placeholder="Digite o telefone do cliente">
    </div>
    <div class="form-group">
        <label for="sale-name">Endereço do cliente:</label>
        <input type="text" id="sale-client-address" required placeholder="Digite o endereço do cliente">
    </div>
</div>
<div class="form-line">
    <div class="form-group">
        <label for="sale-status">Situação do pedido:</label>
        <select name="status" id="sale-status">
            <option value="">Selecione uma opção</option>
            <option value="0">Aguardando Confirmação</option>
            <option value="1">Aprovado</option>
            <option value="3">Concluido</option>
            <option value="99">Cancelado</option>
        </select>
    </div>
    <div class="form-group">
        <label for="sale-priority">Prioridade do pedido:</label>
        <select name="priority" id="sale-priority">
            <option value="">Selecione uma opção</option>
            <option value="0">Baixa</option>
            <option value="1">Normal</option>
            <option value="2">Alta</option>
            <option value="3">Urgente</option>
        </select>
    </div>
    <div class="form-group">
        <label for="sale-delivery-date">Data de entrega:</label>
        <input type="date" id="sale-delivery-date">
    </div>
</div>
<h3>Monte os itens do pedido:</h3>
<div class="form-box-list">
    <div class="form-card">
        <div class="card-header">
            <div class="cad-header-left">
                <span><strong>Item_</strong></span>
                <span class="item-number"><strong>01</strong></span>
            </div>
            <div class="card-header-actions">
                <button class="btn-local square card-sale"><i class="bi bi-dash"></i></button>
                <button class="btn-local square card-sale"><i class="bi bi-copy"></i></button>
                <button class="btn-local square card-sale"><i class="bi bi-plus"></i></button>
            </div>
        </div>
        <div class="card-body">
            <div class="form-line">
                <div class="form-group form-group-border">
                    <div class="form-line space-between">
                        <label>Item:</label>
                        <div class="search-container">
                            <i class="bi bi-search"></i>
                            <input class="search-box form-control" type="text"
                                placeholder="Buscar item..." data-list_class="sale-list-products"
                                data-list_type="select-item">
                        </div>

                    </div>
                    <div class="custom-select-list sale-list-products">

                    </div>
                </div>
            </div>

            <div class="form-group-border container-criador-mix">
                <div class="form-line">
                    <div class="section-header-toggle">
                        <label class="switch-label">Modo Criador Profissional</label>
                        <label class="switch">
                            <input type="checkbox" class="toggle-creator-mode"
                                onchange="alternarModoCriador(this)">
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>

                <div class="form-line">
                    <div class="mode-default-fields">
                        <div class="form-line">
                            <div class="form-group">
                                <label>Texto:</label>
                                <input type="text" class="sale-text-input">
                                <label>Exemplo:</label>
                                <div class="font-example sale-font-example">
                                    <span class="font-preview-display">Sem texto aplicado</span>
                                </div>
                            </div>
                            <div class="form-group">
                                <div class="form-line space-between">
                                    <label>Fonte:</label>
                                    <div class="search-container">
                                        <i class="bi bi-search"></i>
                                        <input class="search-box form-control" type="text"
                                            placeholder="Buscar fonte..."
                                            data-list_class="sale-list-fonts"
                                            data-list_type="select-item">
                                    </div>
                                    <div class="custom-select-list sale-list-fonts">
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="form-line space-between">
                                <label>Figura:</label>
                                <div class="search-container">
                                    <i class="bi bi-search"></i>
                                    <input class="search-box form-control" type="text"
                                        placeholder="Buscar figura..."
                                        data-list_class="sale-list-figures"
                                        data-list_type="select-item">
                                </div>
                            </div>
                            <div class="form-line">
                                <div class="form-group custom-select-list sale-list-figures">

                                </div>
                                <img class="image-preview figure-preview-display" src="" alt="Preview">
                            </div>
                        </div>

                        <div class="form-line form-group-border">
                            <div class="form-group">
                                <label>Imagem de referência:</label>
                                <img class="img-preview preview-img-reference" src="">
                                <input type="file" class="sale-image-reference"
                                    onchange="ui.previewImageVector(this, 'preview-img-reference')">
                            </div>
                            <div class="form-group">
                                <label>Observação:</label>
                                <input type="text" class="sale-observation">
                            </div>
                        </div>
                    </div>

                    <div class="mode-creator-fields d-none">
                        <div class="art-status-container form-group">
                            <input type="hidden" class="json-end-art">

                            <div class="art-empty-state">
                                <p>Nenhuma arte customizada criada.</p>
                                <button type="button" class="btn-create-art"
                                    onclick="abrirCriadorStaff(this)">
                                    <i class="bi bi-palette"></i> Abrir Criador de Arte
                                </button>
                            </div>

                            <div class="art-active-state d-none">
                                <div class="art-badge"><i class="bi bi-check-seal-fill"></i> Arte Pronta
                                </div>
                                <div class="art-actions-row">
                                    <button type="button" class="btn-edit-art"
                                        onclick="abrirCriadorStaff(this)">Editar</button>
                                    <button type="button" class="btn-delete-art"
                                        onclick="excluirArteCustom(this)">Excluir</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    `
    const modal_footer = `
<button type="button" class="btn_modal create" onclick="actions.saveSale()">Salvar</button>
<button type="button" class="btn_modal update" onclick="actions.cancelSale()">Deletar</button>
<button type="button" class="btn_modal update" onclick="actions.saveSale()">Salvar</button>
    `
    return constructModalBase('sale', modal_header, modal_body, modal_footer)
}

export {
    constructHome, constuctOrders, constructProduction,
    constuctStock, constructCreator, constructStaff, constructPageNav,
    constructModalProduct, constructModalSale, constructModalFont,
    constructModalFigure, constructModalViewOrder
}
