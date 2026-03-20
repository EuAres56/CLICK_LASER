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

