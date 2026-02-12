export default async function register(request, env) {
    try {
        // 1. Clonamos a requisição para garantir que o corpo possa ser lido com segurança
        const reqClone = request.clone();
        const { email, password, name } = await reqClone.json();

        // Validação básica (opcional, mas recomendada)
        if (!email || !password || !name) {
            return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }


        // 2. Chamada para o Supabase (Método POST para inserir)
        const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/auth_users`;

        const response = await fetch(supabaseUrl, {
            method: "POST",
            headers: {
                "apikey": env.SUPABASE_KEY,
                "Authorization": `Bearer ${env.SUPABASE_KEY}`, // Service Role é melhor aqui
                "Content-Type": "application/json",
                "Prefer": "return=representation" // Solicita que o dado inserido seja retornado
            },
            body: JSON.stringify({
                email: email,
                password: password, // Lembre-se: em produção usaremos hash!
                name: name,
                role: "authenticated",
                plan: "basic",
                system: "web"
            })
        });

        // 3. Tratamento de Erros do Supabase (ex: e-mail duplicado)
        if (!response.ok) {
            const errorData = await response.json();
            console.error("[Supabase Error]:", errorData);

            // Verifica se o erro é de violação de unicidade (e-mail já existe)
            const message = errorData.code === "23505"
                ? "Este e-mail já está cadastrado."
                : "Erro ao salvar no banco de dados.";

            return new Response(JSON.stringify({ error: message, details: errorData.message }), {
                status: response.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        const newUser = await response.json();

        // 4. Retorno de Sucesso
        return new Response(JSON.stringify({
            success: true,
            message: "Cadastro realizado com sucesso!",
            user: { email: newUser[0].email, name: newUser[0].name }
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("[Register Fatal Error]:", err.message);
        return new Response(JSON.stringify({ error: "Erro interno no servidor", detail: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
