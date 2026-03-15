import { dataBaseRequest } from '../utils/connectDataBase.js';
import { create_job_card, create_order_row, create_product_row, create_staff_row, create_selection_item } from "../renders/dashboard.js";
import * as dashboard from "../static/dashboard.js";

/**
 * FUNÇÃO 1: Apenas para o Login (Rápida)
 * Retorna o mapa de permissões puro para o cliente decidir o que mostrar na UI
 */
export function getUserPermissions(user) {
    try {
        const rawPermissions = typeof user.permissions_sections === 'string'
            ? JSON.parse(user.permissions_sections)
            : user.permissions_sections || {};

        return {
            map: rawPermissions,
            state_account: user.state_account,
            level: user.permission_level,
            name: user.name,
            uid: user.uid
        };
    } catch (e) {
        console.error("Erro ao extrair permissões:", e);
        return { map: { home: "view" }, level: 0 };
    }
}

/**
 * FUNÇÃO 2: Para a Rota de Start/Handshake (Pesada)
 * Busca todos os dados e monta o HTML baseado nas permissões
 */
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
            const orderUids = [...new Set(dbData.production_jobs.map(j => j.order_uid))];
            const ordersFromDb = await dataBaseRequest(`dashboard_orders?uid=in.(${orderUids.join(',')})&select=*`, "GET", null, env);
            const ordersMap = new Map(ordersFromDb.map(o => [o.uid, o]));

            templateData.production = {
                html: dbData.production_jobs
                    .filter(row => ordersMap.has(row.order_uid))
                    .sort((a, b) => (ordersMap.get(b.order_uid)?.order_priority || 0) - (ordersMap.get(a.order_uid)?.order_priority || 0))
                    .map(row => create_job_card(
                        { order_uid: row.order_uid, order_id: ordersMap.get(row.order_uid).id_num, priority: ordersMap.get(row.order_uid).order_priority },
                        { ...row, status: row.job_status, text: row.job_text_title, font: row.job_text_font }
                    )).join('')
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
