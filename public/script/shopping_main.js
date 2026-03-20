/**
 * CLICK LASER - Shopping Core Engine (Versão Otimizada)
 */

const shoppingActions = {
    products: [],
    cart: [],

    // 1. Inicialização
    init: async () => {
        shoppingUI.toggleLoader(true);

        // PRIMEIRO: Carrega o catálogo (precisamos dos preços e estoque atuais)
        await shoppingActions.loadCatalog();

        // DEPOIS: Processa o carrinho do localStorage
        const savedCart = localStorage.getItem('clicklaser_cart');
        if (savedCart) {
            let cartArray = JSON.parse(savedCart);

            // Validação: Atualiza os dados do carrinho com os preços/estoque REAIS do catálogo
            const validCart = cartArray.map(cartItem => {
                const liveProduct = shoppingActions.products.find(p => p.id === cartItem.id);
                if (liveProduct) {
                    // Atualiza preço e estoque caso tenham mudado no banco
                    return { ...cartItem, preco: liveProduct.preco, estoque: liveProduct.estoque, isAvailable: true };
                }
                return { ...cartItem, isAvailable: false }; // Marca como esgotado
            });

            shoppingActions.cart = validCart;

            // Atualiza a interface (agora com shoppingActions.products populado)
            shoppingUI.updateCartCount(shoppingActions.cart.length);
            shoppingUI.renderCart(shoppingActions.cart);
        }

        shoppingUI.toggleLoader(false);
    },

    // 2. Busca de dados via API Pública
    loadCatalog: async () => {
        try {
            const response = await fetch('/api/public/shopping/list');
            if (!response.ok) throw new Error("Erro ao carregar catálogo");

            shoppingActions.products = await response.json();
            shoppingUI.renderProducts(shoppingActions.products);
        } catch (error) {
            console.error("Erro no Shopping:", error);
            alert("Não foi possível carregar os produtos. Tente novamente mais tarde.");
        }
    },

    // 3. Gerenciamento de Carrinho
    addToCart: (productId) => {
        const product = shoppingActions.products.find(p => p.id === productId);

        if (product) {
            // Verifica se ainda há estoque disponível baseado no que já está no carrinho
            const quantityInCart = shoppingActions.cart.filter(item => item.id === productId).length;

            if (quantityInCart >= product.estoque) {
                alert(`Ops! Só temos ${product.estoque} unidades de "${product.nome}" em estoque.`);
                return;
            }

            // Adiciona ao array com um cartId único (timestamp + random para evitar duplicatas exatas)
            shoppingActions.cart.push({
                ...product,
                cartId: Date.now() + Math.random(),
                isConfigured: false
            });

            // Salva no localStorage para persistência
            localStorage.setItem('clicklaser_cart', JSON.stringify(shoppingActions.cart));

            // Atualiza Interface
            shoppingUI.updateCartCount(shoppingActions.cart.length);
            shoppingUI.renderCart(shoppingActions.cart);

            // Feedback visual suave (Toast) em vez de abrir o carrinho
            shoppingUI.showToast(product.nome);
        }
    },

    removeFromCart: (cartId) => {
        shoppingActions.cart = shoppingActions.cart.filter(item => item.cartId !== cartId);
        localStorage.setItem('clicklaser_cart', JSON.stringify(shoppingActions.cart));

        shoppingUI.updateCartCount(shoppingActions.cart.length);
        shoppingUI.renderCart(shoppingActions.cart);
    },

    checkout: () => {
        if (shoppingActions.cart.length === 0) {
            return alert("Seu carrinho está vazio!");
        }
        // Salva a decisão final e vai para o customizador
        localStorage.setItem('clicklaser_cart', JSON.stringify(shoppingActions.cart));
        window.location.href = "/customizer.html";
    }
};

const shoppingUI = {
    // Alternar visibilidade do carrinho e do overlay de fundo
    toggleCart: () => {
        const cart = document.getElementById('cartOverlay');
        const overlay = document.getElementById('bodyOverlay');

        cart.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    },

    // Exibir/Esconder Loader
    toggleLoader: (show) => {
        const loader = document.getElementById('loader-wrapper');
        if (loader) loader.style.display = show ? 'flex' : 'none';
    },

    // Feedback rápido de "Item adicionado"
    showToast: (productName) => {
        const toast = document.createElement('div');
        toast.className = 'stock-badge'; // Usando sua classe de estilo ou uma nova
        toast.style.cssText = `
            position: fixed; bottom: 110px; right: 30px; height: 50px;
            background: #2ecc71; color: white; padding: 15px;
            border-radius: 10px; z-index: 3000; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        toast.innerHTML = `✅ ${productName} adicionado!`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    // Renderizar Grade de Produtos
    renderProducts: (list) => {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (list.length === 0) {
            grid.innerHTML = '<p>Nenhum produto disponível no momento.</p>';
            return;
        }

        grid.innerHTML = list.map(p => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${p.img || './assets/no-image.png'}" alt="${p.nome}" loading="lazy">
                    <div class="stock-badge">${p.estoque === 1 ? p.estoque + ' disponível' : p.estoque + ' disponíveis'}</div>
                </div>
                <div class="product-info">
                    <h3>${p.nome} ${p.cor}</h3>
                    <div class="price-container">
                        <span class="product-price">R$ ${p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button class="cta-button" onclick="shoppingActions.addToCart('${p.id}')">
                        ADICIONAR AO PEDIDO
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Atualizar contador da bolinha
    updateCartCount: (count) => {
        const counter = document.getElementById('cartCount');
        if (counter) counter.innerText = count;
    },

    // Renderizar Itens dentro do Carrinho
    // No shoppingUI.renderCart:
    renderCart: (cartItems) => {
        const container = document.getElementById('cartItems');
        const totalLabel = document.getElementById('cartTotal');

        if (!container) return;

        if (cartItems.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; margin-top: 50px;">Seu carrinho está vazio.</p>';
            if (totalLabel) totalLabel.innerText = "R$ 0,00";
            return;
        }

        container.innerHTML = cartItems.map(item => {
            // Verifica disponibilidade para o estilo visual
            const isAvailable = item.isAvailable !== false;
            const statusClass = isAvailable ? "" : "item-sold-out";

            return `
                <div class="cart-item ${statusClass}">
                    <div class="cart-item-img">
                        <img src="${item.img}" alt="${item.nome}">
                        ${!isAvailable ? '<span class="sold-out-badge">ESGOTADO</span>' : ''}
                    </div>
                    <div class="cart-item-details">
                        <h4>${item.nome}</h4>
                        <p>${isAvailable ? `R$ ${item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Indisponível'}</p>
                    </div>
                    <button class="btn-remove" onclick="shoppingActions.removeFromCart(${item.cartId})">✕</button>
                </div>
            `;
        }).join('');

        // SOMA: Filtra apenas itens disponíveis para o total
        const total = cartItems.reduce((acc, item) => {
            return (item.isAvailable !== false) ? acc + item.preco : acc;
        }, 0);

        if (totalLabel) {
            totalLabel.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
    },
};

// Iniciar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    shoppingActions.init();
});
