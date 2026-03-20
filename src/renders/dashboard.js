import { dataBaseRequest } from '../utils/connectDataBase.js';
import * as dashboard from "../static/dashboard.js";



// Função base para a estrutura do CARD
export function card(uid_pack, uid_item, card_header, card_body, card_footer, priority) {

    const card_html = `
                <div class="card-item card ${priority}" data-uid="${uid_item}" data-packId="${uid_pack}">
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

// Função base para a estrutura da linha (TR)
export function row(content, dataSets) {
    return `
        <tr class="row-item" ${dataSets}>
            ${content}
        </tr>
    `;
}

// Função base para a estrutura do CARD de uma gravação
export function create_job_card(json_order, json_job) {
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
        <div class="ids-group"
        data-search="${order_id} ${json_job.uid} ${json_order.client_name} ${json_job.product_title} ${json_job.product_color}"
        >
            <span class="order-id" title="ID do Pedido" data-uid="${order_uid}">Pedido: #${order_id}</span>
            <span class="job-id" title="ID Único da Gravação" data-uid="${json_job.uid}">Job: #${(json_job.uid).split('-')[0]}</span>
        </div>
        <span class="job-priority ${priority_class_value}" title="Prioridade">${priority_text_value}</span>
    `;

    // 4. Construção do Body
    const card_body = `
        <h4 class="product-title">${json_job.product_title} - ${json_job.product_color}</h4>
        <div class="job-technical-sheet">
            <div class="data-row"><span class="label">TEXTO:</span> <span class="value copyable-text" title="Clique para copiar">${json_job.text}</span></div>
            <div class="data-row"><span class="label">FONTE:</span> <span class="value">${json_job.font}</span></div>
            <div class="data-row"><span class="label">IMAGEM:</span> <span class="value copyable-image" data-url="${json_job.url_image}" title="Clique para copiar imagem">${json_job.name_image}</span></div>
            <div class="data-row obs-row"><span class="label">OBSERVAÇÃO:</span> <span class="value">${json_job.observ}</span></div>
        </div>
    `;

    // 5. Lógica condicional para botões de Visualização (Footer Parte 1)
    let view_actions_html = '';
    view_actions_html += `<div class="view-buttons-group">`;

    if (json_job.json_image) {
        view_actions_html += `
            <button class="btn-local btn-art btn-job-action" data-art='${json_job.json_image}'">
                <i class="bi bi-eye"></i> Ver Arte
            </button>`;
    } else {
        view_actions_html += `
            <button class="btn-local btn-job-action create-disabled">
                <i class="bi bi-eye"></i> Sem Arte
            </button>`;
    }

    if (json_job.url_ref) {
        view_actions_html += `
            <button class="btn-local btn-ref  btn-job-action" data-ref="${json_job.url_ref}">
                <i class="bi bi-image"></i> Ver Ref.
            </button>`;
    } else {
        view_actions_html += `
            <button class="btn-local btn-job-action create-disabled">
                <i class="bi bi-image"></i> Sem Ref.
            </button>`;
    }

    view_actions_html += `</div>`;

    // 6. Construção do Status Stepper com Long Press (Footer Parte 2)
    // Usamos o status vindo da API para marcar o 'checked' inicial
    const status = json_job.status;
    const status_stepper_html = `
        <div class="status-stepper" data-job-uid="${json_job.uid}">
            <label class="status-btn approved">
                <input type="radio" name="status_${json_job.uid}" value="approved" ${status === 1 ? 'checked' : ''}>

                <span class="status-label">Aprovado</span>
            </label>
            <label class="status-btn producing">
                <input type="radio" name="status_${json_job.uid}" value="running" ${status === 2 ? 'checked' : ''}>
                <span class="status-label">Iniciado</span>
            </label>
            <label class="status-btn finished">
                <input type="radio" name="status_${json_job.uid}" value="done" ${status === 3 ? 'checked' : ''}>
                <span class="status-label">Finalizado</span>
            </label>
        </div>
    `;

    const card_footer = view_actions_html + status_stepper_html;

    return card(order_uid, json_job.uid, card_header, card_body, card_footer, priority_class_value);
}

// Função para construção da linha da tabela de pedidos
export function create_order_row(json_order, job_summary) {
    // Dicionários de Status para mapear o valor do banco para o visual da tabela
    const status_config = {
        0: { text: "Aguardando Confirmação", class: "bg-warning" },
        1: { text: "Em Produção", class: "bg-info" },
        3: { text: "Finalizado", class: "bg-success" },
        99: { text: "Cancelado", class: "bg-danger" }
    };

    // Dicionário de Origens para as badges
    const origin_config = {
        0: { text: "Presencial", class: "bg-primary" },
        1: { text: "Anuncio", class: "bg-danger" },
        2: { text: "Instagram", class: "bg-info" },
        3: { text: "WhatsApp", class: "bg-success" },
        4: { text: "Site", class: "bg-warning" },
        5: { text: "Indicado", class: "bg-secondary" },
        6: { text: "Redirecionado", class: "bg-danger" },
    };

    const current_status = status_config[json_order.order_status] || { text: "Pendente", class: "bg-secondary" };
    const current_origin = origin_config[json_order.order_origin] || { text: "Presencial", class: "bg-primary" };

    // Formatação da data vinda do banco
    const formatted_date = json_order.order_created_at
        ? new Date(json_order.order_created_at).toLocaleDateString('pt-BR')
        : '--/--/----';

    // Conteúdo das células
    const row_content = `
        <td>#${json_order.id_num}</td>
        <td><strong>${json_order.client_name}</strong></td>
        <td>${job_summary || 'Sem itens'}</td>
        <td><span class="badge-origin ${current_origin.class}">${current_origin.text || 'Direto'}</span></td>
        <td>${formatted_date}</td>
        <td><span class="status-pill ${current_status.class}">${current_status.text}</span></td>
        <td>
            <div class="actions-cell">
                <button class="btn-req square btn-for-modal" data-modal="modal-view-order"
                data-uid="${json_order.uid}" data-callback="actions.viewOrder" title="Visualizar Pedido">
                    <i class="bi bi-eye"></i>
                </button>

                <button class="btn-req square btn-printer" data-uid="${json_order.uid}" data-print="order" title="Imprimir Etiqueta">
                    <i class="bi bi-printer"></i>
                </button>

                <button class="btn-req square btn-for-modal" data-modal="modal-sale"
                data-uid="${json_order.uid}" data-callback="actions.searchSale" title="Gerenciar Pedido">
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

// Cria uma linha da tabela de produtos
export function create_product_row(json_product, permission) {
    const isEdit = permission === 'edit';

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
            ${isEdit ? `
                <button class="btn-req square in" onclick="actions.updateUnitStock('${json_product.uid}', 'in')"><i
                        class="bi bi-plus-lg"></i></button>
                <button class="btn-req square out" onclick="actions.updateUnitStock('${json_product.uid}', 'out')"><i
                        class="bi bi-dash-lg"></i></button>
                <button class="btn-req square btn-for-modal" data-uid="${json_product.uid}"  data-modal="modal-product"
                data-callback="actions.getProductDetails" title="Editar Produto"><i class="bi bi-pencil"></i></button>
            ` : `
            <button class="btn-local square"><i class="bi bi-plus-lg"></i></button>
            <button class="btn-local square"><i class="bi bi-dash-lg"></i></button>
            <button class="btn-local square"><i class="bi bi-pencil"></i></button>
            `}
        </div>
        </td>
    `;

    // Dados para os atributos de busca e filtro da TR
    const search_string = `${json_product.id} ${json_product.product_title} ${json_product.product_type} ${json_product.product_color}`.toLowerCase();

    const html_dataSets = `
    id="productRow_${json_product.uid}" data-search="${search_string}" data-type="${json_product.product_type}" data-color="${json_product.product_color}"
    `
    if (isEdit) {
    }
    return row(row_content, html_dataSets);
}

function getPermissions(permissionsJSON) {
    if (!permissionsJSON) return '<span class="badge-none">Sem Acesso</span>';

    const permsObj = typeof permissionsJSON === 'string' ? JSON.parse(permissionsJSON) : permissionsJSON;

    // Tradução das seções para o seu dashboard
    const sectionLabels = {
        "home": "Home",
        "orders": "Pedidos",
        "production": "Produção",
        "stock": "Estoque",
        "staff": "Equipe",
        "creator": "Criador"
    };

    // Filtramos apenas o que não é 'blocked'
    const activeEntries = Object.entries(permsObj).filter(([_, value]) => value !== 'blocked');

    if (activeEntries.length === 0) return '<span class="badge-none">Acesso Bloqueado</span>';

    // Geramos os badges
    const badges = activeEntries.map(([key, value]) => {
        const label = sectionLabels[key] || key;
        // Classe CSS muda se for 'edit' (mais vibrante) ou 'view' (mais discreto)
        const badgeClass = value === 'edit' ? 'badge-edit' : 'badge-view';
        const icon = value === 'edit' ? '<i class="bi bi-pencil-fill" style="font-size: 8px; margin-right: 3px;"></i>' : '';

        return `<span class="badge-perm ${badgeClass}">${icon}${label}</span>`;
    });

    return `<div class="permissions-container">${badges.join('')}</div>`;
}

function getRelativeAccessTime(lastAccessISO, tokenTimeISO) {
    const now = new Date();

    // Compensação de 3 horas (180 minutos) para alinhar com o padrão do seu banco
    const offsetMs = 3 * 60 * 60 * 1000;

    // Criamos as datas e "empurramos" 3h para frente para neutralizar o atraso de leitura
    const tokenTime = new Date(new Date(tokenTimeISO).getTime() + offsetMs);
    const lastAccess = new Date(new Date(lastAccessISO).getTime() + offsetMs);

    // 1. Verificação de Online (agora com tempos alinhados)
    if (tokenTime > now) {
        return `<span class="status-online" style="color: #00ff00; font-weight: bold;">Online</span>`;
    }

    // 2. Cálculo da diferença real
    const diffMs = now - lastAccess;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Lógica de exibição amigável
    if (diffMin < 1) return "Visto agora há pouco";
    if (diffMin <= 40) return `Visto há ${diffMin} min`;

    if (diffHours < 24) {
        return `Visto há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }

    if (diffDays < 7) {
        return `Visto há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    }

    return "Visto por último há muito tempo";
}
// Cria uma linha da tabela da equipe
export function create_staff_row(json_team, uid, permission) {
    // 1. Verifica se esta linha pertence ao usuário logado
    const isMe = json_team.uid === uid;

    // Se for "eu", o botão de edição fica desabilitado independente da permissão global
    const canEdit = permission === 'edit' && !isMe;

    // Iniciais e Cores
    const initials = json_team.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const hue = Math.floor(Math.random() * 360);
    const backgroundColor = `hsl(${hue}, 100%, 50%)`;
    const textColor = (hue > 40 && hue < 190) ? '#000000' : '#ffffff';

    // Permissões
    const permissions = getPermissions(json_team.permissions_sections);

    // Status/Tempo Relativo
    const accessStatus = getRelativeAccessTime(json_team.last_access, json_team.token_time);

    const row_content = `
        <td name="staff_name">
            <div class="box-h">
                <div class="user-avatar" style="background-color: ${backgroundColor}; color: ${textColor};">
                    <span>${initials}</span>
                </div>
                <strong>${isMe ? "Você" : json_team.name}</strong>
            </div>
        </td>
        <td name="staff_email">${json_team.email}</td>
        <td name="staff_job">${json_team.job_position || '---'}</td>
        <td name="staff_level">${json_team.permissions_level}</td>
        <td name="staff_level">${permissions}</td>
        <td name="staff_last_access">${accessStatus}</td>
        <td>
            <div class="actions-cell">
                ${canEdit ? `
                    <!-- <button class="btn-req square btn-generate-password" data-uid="${json_team.uid}" title="Redefinir Senha desse colaborador"><i class="bi bi-key"></i></button> -->
                    <!-- <button class="btn-req square btn-disabled-staff" data-uid="${json_team.uid}" title="Desativar"><i class="bi bi-person-x"></i></button> -->
                    <button class="btn-req square btn-for-modal" data-uid="${json_team.uid}" data-modal="modal-permissions" data-callback="actions.getPermissionsDetails" title="Permissões"><i class="bi bi-shield-lock"></i></button>
                    <button class="btn-req square btn-for-modal" data-uid="${json_team.uid}" data-modal="modal-staff"
                    data-callback="actions.getStaffDetails" title="Editar Membro"><i class="bi bi-pencil"></i></button>
                ` : `
                    <!-- <button class="btn-req square" disabled title="${isMe ? ' Vocé não pode redefinir sua senha por aqui' : 'Sem permissão'}">
                        <i class="bi bi-key"></i></button> -->
                    <!-- <button class="btn-local square" disabled title="${isMe ? ' Vocé não pode desativar sua conta por aqui' : 'Sem permissão'}">
                        <i class="bi bi-person-x"></i></button> -->
                    <button class="btn-local square" disabled title="${isMe ? 'Você não pode editar suas permissões por aqui' : 'Sem permissão'}">
                        <i class="bi bi-shield-lock"></i></button>
                    <button class="btn-local square" disabled title="${isMe ? 'Você não pode editar suas informações por aqui' : 'Sem permissão'}">
                        <i class="bi bi-pencil"></i></button>
                `}
            </div>
        </td>
    `;

    // No search_string, mantemos o nome original para que o usuário ainda se encontre ao digitar o próprio nome
    const search_string = `${json_team.uid} ${json_team.name} ${json_team.job_position || ''}`.toLowerCase();
    const html_dataSets = `id="staffRow_${json_team.uid}" data-search="${search_string}" data-job="${json_team.job_position || ''}" data-status="${json_team.permissions_level}"`;

    return row(row_content, html_dataSets);
}

// Cria um item de seleção
export function create_selection_item(data, groupName, aditionalClass = null, dataAtb = {}, atributes = null, inputClass = null) {
    const inputId = `sel_${groupName}_${data.id}_01`;
    const nameAttribute = `${groupName}_selection_01`;

    // Converte o objeto dataAtb em uma string de atributos HTML (data-key="value")
    const dataAttributes = Object.entries(dataAtb)
        .map(([key, value]) => `data-${key}="${value}"`)
        .join(' ');
    const addClass = aditionalClass ? ` ${aditionalClass}` : '';
    const atribs = atributes ? ` ${atributes}` : '';
    const inpClass = inputClass ? `class="${inputClass}"` : '';

    return `
        <label class="select-item sel_${groupName}${addClass}" for="${inputId}"${atribs}>
            <input ${inpClass} type="radio"
                   id="${inputId}"
                   name="${nameAttribute}"
                   ${dataAttributes}>
            <span class="item-content">${data.label.toUpperCase()}</span>
        </label>
    `;
}


export async function buildDashboardPayloadSections(map, uid, env) {
    try {
        const dataPromises = {};
        const authorized_modals = [];
        const authorized_page_lists = [];

        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;

        // --- Lógica de Datas ---
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const firstDayMonth = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
        const lastDayMonth = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];

        const sunday = new Date(now);
        sunday.setDate(now.getDate() - now.getDay());
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        const startWeek = new Date(sunday.getTime() - offset).toISOString().split('T')[0];
        const endWeek = new Date(saturday.getTime() - offset).toISOString().split('T')[0];

        let permissionsMap = map;
        if (typeof permissionsMap === 'string') {
            try {
                permissionsMap = JSON.parse(permissionsMap);
            } catch (e) {
                console.error("Erro ao parsear permissionsMap dentro do buildDashboardPayloadSections");
                permissionsMap = { home: "view" };
            }
        }

        // --- Lote de Promessas ---
        if (permissionsMap.home !== "blocked") {
            dataPromises.home_stats = Promise.all([
                dataBaseRequest("dashboard_orders?order_status=eq.0&select=count", "GET", null, env),
                dataBaseRequest("dashboard_jobs?job_status=eq.2&select=count", "GET", null, env),
                dataBaseRequest("dashboard_orders?order_status=eq.2&select=count", "GET", null, env)
            ]);
        }

        if (permissionsMap.orders !== "blocked") {
            const endpoint = `dashboard_orders?order_created_at=gte.${firstDayMonth}T00:00:00&order_created_at=lte.${lastDayMonth}T23:59:59&order=order_created_at.desc`;
            dataPromises.orders_data = dataBaseRequest(endpoint, "GET", null, env);
            if (permissionsMap.orders === "edit") {
                authorized_modals.push(dashboard.constructModalSale());
            }
            authorized_modals.push(dashboard.constructModalViewOrder());
            authorized_page_lists.push(dashboard.constructPageNav("sales", "Vendas"));
        }

        if (permissionsMap.production !== "blocked") {
            const endpointJobs = `dashboard_jobs?job_start_date=gte.${startWeek}T00:00:00&job_start_date=lte.${endWeek}T23:59:59&select=*`;
            dataPromises.production_jobs = dataBaseRequest(endpointJobs, "GET", null, env);
            authorized_page_lists.push(dashboard.constructPageNav("jobs", "Produção"));
        }

        if (permissionsMap.creator !== "blocked") {
            dataPromises.creator = Promise.all([
                dataBaseRequest("dashboard_fonts?select=*&order=font_name.asc", "GET", null, env),
                dataBaseRequest("dashboard_figures?select=*&order=figure_class.asc,figure_name.asc", "GET", null, env)
            ])
            if (permissionsMap.creator === "edit") {
                authorized_modals.push(dashboard.constructModalFont());
                authorized_modals.push(dashboard.constructModalFigure());
            }
            authorized_page_lists.push(dashboard.constructPageNav("creator", "Asservo"));
        }

        if (permissionsMap.stock !== "blocked") {
            dataPromises.stock = dataBaseRequest("dashboard_products?select=*&order=id.asc", "GET", null, env);
            if (permissionsMap.stock === "edit") {
                authorized_modals.push(dashboard.constructModalProduct());
            }
            authorized_page_lists.push(dashboard.constructPageNav("stock", "Estoque"));
        }

        if (permissionsMap.staff !== "blocked") {
            dataPromises.staff = dataBaseRequest("auth_staff?select=*&order=name.asc", "GET", null, env);
            if (permissionsMap.staff === "edit") {
                authorized_modals.push(dashboard.constructModalStaff());
                authorized_modals.push(dashboard.constructModalPermissions());
            }
            authorized_page_lists.push(dashboard.constructPageNav("team", "Equipe"));
        }

        // Execução em paralelo
        const results = await Promise.all(Object.values(dataPromises));
        const keys = Object.keys(dataPromises);
        const dbData = keys.reduce((acc, key, i) => { acc[key] = results[i]; return acc; }, {});

        // --- Processamento dos Templates ---
        const templateData = {};

        if (dbData.home_stats) {
            templateData.home = {
                pending_orders: dbData.home_stats[0][0]?.count || 0,
                active_jobs: dbData.home_stats[1][0]?.count || 0,
                completed_jobs: dbData.home_stats[2][0]?.count || 0
            };
        }

        if (dbData.orders_data && Array.isArray(dbData.orders_data)) {
            templateData.orders = {
                html: dbData.orders_data.map(order => create_order_row(order, (order.order_list_jobs?.length || 0) + " itens")).join('')
            };
        }

        if (dbData.production_jobs && Array.isArray(dbData.production_jobs) && dbData.production_jobs.length > 0) {
            // 1. Mapear UIDs únicos para buscar as ordens
            const orderUids = [...new Set(dbData.production_jobs.map(j => j.order_uid))];
            const ordersFromDb = await dataBaseRequest(`dashboard_orders?uid=in.(${orderUids.join(',')})&select=*`, "GET", null, env);

            // Converter ordens para um Map para busca rápida
            const ordersMap = new Map(ordersFromDb.map(o => [o.uid, o]));

            // 2. Definir a Blacklist de Status da Ordem (mesma da rota de busca)
            // 0: Pendente, 3: Concluído, 99: Cancelado/Aprovado
            const blackListView = [0, 3, 99];

            templateData.production = {
                html: dbData.production_jobs
                    .filter(row => {
                        const order = ordersMap.get(row.order_uid);
                        // Só exibe se a ordem existir e não estiver nos status bloqueados
                        return order && !blackListView.includes(parseInt(order.order_status));
                    })
                    .sort((a, b) => {
                        // Ordenação por prioridade da Ordem (descendente)
                        const priorityA = ordersMap.get(a.order_uid)?.order_priority || 0;
                        const priorityB = ordersMap.get(b.order_uid)?.order_priority || 0;
                        return priorityB - priorityA;
                    })
                    .map(row => {
                        const order = ordersMap.get(row.order_uid);

                        // Formatar URL de referência (usando prefixo público e bucket lib)
                        const url_reference = row.job_image_url_reference
                            ? `${publicServePrefix}${row.job_image_url_reference}?b=lib`
                            : "";

                        // Retornar o card com TODOS os dados que a rota de busca fornece
                        return create_job_card(
                            {
                                order_uid: row.order_uid,
                                order_id: order.id_num,
                                priority: order.order_priority
                            },
                            {
                                uid: row.uid,
                                product_title: row.product_title,
                                product_color: row.product_color,
                                text: row.job_text_title || "",
                                font: row.job_text_font || "",
                                art_json: row.job_art_json || "",
                                url_ref: url_reference,
                                name_image: row.job_figure_name || "",
                                url_image: row.job_figure_url || "",
                                json_image: row.job_image_json || "",
                                observ: row.job_observ || "",
                                status: row.job_status
                            }
                        );
                    }).join('')
            };
        }

        const publicServePrefix = "/api/public/assets/serve/";
        if (dbData.creator && Array.isArray(dbData.creator)) {

            templateData.creator = {
                fonts: dbData.creator[0]
                    .map(f => {
                        // Monta a URL completa apontando para o seu novo router público
                        const fontUrl = `${publicServePrefix}${f.font_url}?b=lib`;

                        return create_selection_item(
                            { id: f.uid, label: f.font_name.toUpperCase() },
                            "font",
                            null,
                            {
                                font_uid: f.uid,
                                font_name: f.font_name,
                                font_url: fontUrl, // <--- URL Padronizada
                                font_type: f.font_type
                            },
                            `style="font-family: '${f.font_name}'"`,
                            "input-creator_assets_font"
                        );
                    }).join(''),
                figures: dbData.creator[1]
                    .map(f => {
                        const figureUrl = `${publicServePrefix}${f.figure_url}?b=lib`;

                        return create_selection_item(
                            { id: f.uid, label: `${f.figure_name.toUpperCase()}` },
                            "figure",
                            null,
                            {
                                figure_uid: f.uid,
                                figure_name: f.figure_name,
                                figure_class: f.figure_class,
                                figure_url: figureUrl
                            },
                            null,
                            "input-creator_assets_figure" // inputClass

                        )
                    }).join('')
            };
        }

        if (dbData.stock && Array.isArray(dbData.stock)) {
            templateData.stock = {
                html: dbData.stock
                    .map(item => {
                        return item = create_product_row(item, permissionsMap.stock);
                    }).join('')
            };
        }

        if (dbData.staff && Array.isArray(dbData.staff)) {
            templateData.staff = {
                html: dbData.staff
                    .map(item => {
                        return item = create_staff_row(item, uid, permissionsMap.staff);
                    }).join('')
            };
        }

        // --- Construção do HTML Final ---
        const SECTION_TEMPLATES = {
            home: () => dashboard.constructHome(templateData.home),
            orders: () => dashboard.constuctOrders(templateData.orders),
            production: () => dashboard.constructProduction(templateData.production),
            creator: () => dashboard.constructCreator(templateData.creator),
            stock: () => dashboard.constuctStock(templateData.stock),
            staff: () => dashboard.constructStaff(templateData.staff)
        };

        const authorizedSectionsHtml = [];

        for (const [section, accessLevel] of Object.entries(permissionsMap)) {
            if (accessLevel !== "blocked" && SECTION_TEMPLATES[section]) {
                let html = SECTION_TEMPLATES[section]();

                // Controle de UI
                if (accessLevel !== "edit") {
                    html = html.replace(/class="[^"]*btn-for-modal[^"]*"/g, (match) => `${match} disabled style="opacity:0.6; pointer-events:none;"`);
                }
                authorizedSectionsHtml.push(html);
            }
        }

        return {
            sections_html: authorizedSectionsHtml.join('\n'),
            modals_html: authorized_modals.join('\n'),
            pages_list_html: authorized_page_lists.join('\n')
        };
    } catch (error) {
        console.error(error);
        const html = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Erro ao carregar dashboard</h4>
                <p>${error.message}</p>
            </div>
        `

        return { sections_html: html, modals_html: '', pages_list_html: '' }
    }
}
