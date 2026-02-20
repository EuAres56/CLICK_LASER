function card(uid_pack, uid_item, card_header, card_body, card_footer, priority) {

    const card_html = `
                <div class="card ${priority}" data-uid="${uid_item}" data-packId="${uid_pack}">
                    <div class="card-header">
                        ${card_header}
                    </div>

                    <div class="card-body">
                        ${card_body}
                    </div>

                    <div class="card-footer">
                        ${card_footer}
                    </div>
                </div>
    `
    return card_html
}


function create_job_card(json_order, json_job) {
    // 1. Dicionários de prioridades
    const priority_class = { 0: "priority-high", 1: "priority-medium", 2: "priority-low" };
    const priority_text = { 0: "Urgente", 1: "Normal", 2: "Baixa" };

    // 2. Extração e Formatação de dados base
    const order_id = (json_order.order_id).toString().padStart(5, '0');
    const order_uid = json_order.order_uid;
    const priority_class_value = priority_class[json_order.priority];
    const priority_text_value = priority_text[json_order.priority];

    // 3. Construção do Header
    const card_header = `
        <div class="ids-group">
            <span class="order-id" title="ID do Pedido">Pedido: #${order_id}</span>
            <span class="job-id" title="ID Único da Gravação">Job: #${json_job.job_id}</span>
        </div>
        <span class="job-priority ${priority_class_value}" title="Prioridade">${priority_text_value}</span>
    `;

    // 4. Construção do Body
    const card_body = `
        <h4 class="product-title">${json_job.product_title} - ${json_job.product_color}</h4>
        <div class="job-technical-sheet">
            <div class="data-row"><span class="label">TEXTO:</span> <span class="value">${json_job.text}</span></div>
            <div class="data-row"><span class="label">FONTE:</span> <span class="value">${json_job.font}</span></div>
            <div class="data-row"><span class="label">IMAGEM:</span> <span class="value">${json_job.name_image}</span></div>
            <div class="data-row obs-row"><span class="label">OBSERVAÇÃO:</span> <span class="value">${json_job.observ}</span></div>
        </div>
    `;

    // 5. Lógica condicional para botões de Visualização (Footer Parte 1)
    let view_actions_html = '';
    view_actions_html += `<div class="view-buttons-group">`;

    if (json_job.json_image) {
        view_actions_html += `
            <button class="btn-req btn-job-action" data-art='${json_job.json_image}' onclick="openArtPreview(this)">
                <i class="bi bi-eye"></i> Ver Arte
            </button>`;
    } else {
        view_actions_html += `
            <button class="btn-req btn-job-action create-disabled">
                <i class="bi bi-eye"></i> Sem Arte
            </button>`;
    }

    if (json_job.url_ref) {
        view_actions_html += `
            <button class="btn-req btn-job-action" data-ref="${json_job.url_ref}" onclick="openReference(this)">
                <i class="bi bi-image"></i> Ver Ref.
            </button>`;
    } else {
        view_actions_html += `
            <button class="btn-req btn-job-action create-disabled">
                <i class="bi bi-image"></i> Sem Ref.
            </button>`;
    }

    view_actions_html += `</div>`;

    // 6. Construção do Status Stepper com Long Press (Footer Parte 2)
    // Usamos o status vindo da API para marcar o 'checked' inicial
    const status = json_job.status; // Assumindo que a API traz: 'approved', 'running', 'done'

    const status_stepper_html = `
        <div class="status-stepper" data-job-uid="${json_job.uid}">
            <label class="status-btn approved">
                <input type="radio" name="status_${json_job.uid}" value="approved" ${status === 'approved' ? 'checked' : ''}>

                <span class="status-label">Aprovado</span>
            </label>
            <label class="status-btn producing">
                <input type="radio" name="status_${json_job.uid}" value="running" ${status === 'running' ? 'checked' : ''}>
                <span class="status-label">Iniciado</span>
            </label>
            <label class="status-btn finished">
                <input type="radio" name="status_${json_job.uid}" value="done" ${status === 'done' ? 'checked' : ''}>
                <span class="status-label">Finalizado</span>
            </label>
        </div>
    `;

    const card_footer = view_actions_html + status_stepper_html;

    return card(order_uid, json_job.uid, card_header, card_body, card_footer, priority_class_value);
}


/**
 * Função base para a estrutura da linha (TR)
 */
function row(content, dataSets) {
    return `
        <tr ${dataSets}>
            ${content}
        </tr>
    `;
}

/**
 * Função principal para criar a linha da tabela de pedidos
 * @param {Object} json_order - Dados da tabela dashboard_orders
 * @param {String} job_summary - Resumo dos itens (ex: "2x Copo 473ml")
 */
function create_order_row(json_order, job_summary) {
    // Dicionários de Status para mapear o valor do banco para o visual da tabela
    const status_config = {
        0: { text: "Aguardando Confirmação", class: "bg-warning" },
        1: { text: "Em Produção", class: "bg-info" },
        2: { text: "Finalizado", class: "bg-success" },
        99: { text: "Cancelado", class: "bg-danger" }
    };

    // Dicionário de Origens para as badges
    const origin_class = {
        "Instagram": "ig",
        "WhatsApp": "wa",
        "Site": "web",
        "Loja": "store"
    };

    const current_status = status_config[json_order.order_status] || { text: "Pendente", class: "bg-secondary" };
    const badge_class = origin_class[json_order.order_origin] || "default";

    // Formatação da data vinda do banco
    const formatted_date = json_order.order_created_at
        ? new Date(json_order.order_created_at).toLocaleDateString('pt-BR')
        : '--/--/----';

    // Conteúdo das células
    const row_content = `
        <td>#${json_order.id_num}</td>
        <td><strong>${json_order.client_name}</strong></td>
        <td>${job_summary || 'Sem itens'}</td>
        <td><span class="badge-origin ${badge_class}">${json_order.order_origin || 'Direto'}</span></td>
        <td>${formatted_date}</td>
        <td><span class="status-pill ${current_status.class}">${current_status.text}</span></td>
        <td>
            <div class="actions-cell">
                <button class="btn-req square" title="Visualizar Pedido"">
                    <i class="bi bi-eye"></i>
                </button>

                <button class="btn-req square" title="Imprimir Etiqueta">
                    <i class="bi bi-printer"></i>
                </button>

                <button class="btn-req square btn-for-modal" data-modal="modal-sale" data-uid="${json_order.uid}" title="Gerenciar Pedido">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </div>
        </td>
    `;

    // Dados para os atributos de busca e filtro da TR
    const search_string = `${json_order.id_num} ${json_order.client_name}`.toLowerCase();

    const html_dataSets = `
    id="orderRow_${json_order.uid}" data-search="${search_string}" data-status="${current_status.text}" data-origin="${json_order.order_origin}"
    `

    return row(row_content, html_dataSets);
}

function create_product_row(json_product) {
    // Dicionários de Status para mapear o valor do banco para o visual da tabela
    const status_config = {
        0: { text: "Em dia", class: "bg-success" },
        1: { text: "Baixo", class: "bg-warning" },
        2: { text: "Esgotado", class: "bg-danger" }
    };

    const current_status = status_config[json_product.product_status];

    // Conteúdo das células
    const row_content = `
        <td name="product_id">#${json_product.id}</td>
        <td name="product_title"><strong>${json_product.product_title}</strong></td>
        <td name="product_type">${json_product.product_type}</td>
        <td name="product_color">${json_product.product_color}</td>
        <td name="product_stock_now">${json_product.product_stock_now}</td>
        <td name="product_stock_min">${json_product.product_stock_min}</td>
        <td name="product_status"><span class="status-pill ${current_status.class}">${current_status.text}</span></td>
        <td>
            <div class="actions-cell">
                <button class="btn-req square in" onclick="actions.updateUnitStock('${json_product.uid}', 'in')"><i
                        class="bi bi-plus-lg"></i></button>
                <button class="btn-req square out" onclick="actions.updateUnitStock('${json_product.uid}', 'out')"><i
                        class="bi bi-dash-lg"></i></button>
                <button class="btn-req square btn-for-modal" data-uid="${json_product.uid}"  data-modal="modal-product"
                data-callback="actions.getProductDetails" title="Editar Produto"><i class="bi bi-pencil"></i></button>
            </div>
        </td>
    `;

    // Dados para os atributos de busca e filtro da TR
    const search_string = `${json_product.id} ${json_product.product_title}`.toLowerCase();

    const html_dataSets = `
    id="productRow_${json_product.uid}" data-search="${search_string}" data-type="${json_product.product_type}" data-color="${json_product.product_color}"
    `

    return row(row_content, html_dataSets);
}



export { create_job_card, create_order_row, create_product_row };
