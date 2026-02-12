// Dados Fictícios (Simulando o que virá da sua API)
const mockProducts = [
    { id: 101, nome: "Copo Térmico 473ml", preco: 89.90, img: "" },
    { id: 102, nome: "Garrafa Sport 750ml", preco: 129.00, img: "" },
    { id: 103, nome: "Caneca Camp 350ml", preco: 65.00, img: "" },
    { id: 104, nome: "Garrafa Tech LED", preco: 159.90, img: "" },
];

let cart = [];

// Renderizar Produtos
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = mockProducts.map(p => `
    <div class="product-card">
        <div class="product-image">
            <img src="${p.img}" alt="${p.nome}">
        </div>
        <h3>${p.nome}</h3>
        <span class="product-price">R$ ${p.preco.toFixed(2).replace('.', ',')}</span>
        <button class="cta-button" style="padding: 10px 20px; font-size: 0.8rem;" onclick="addToCart(${p.id})">
            ADICIONAR AO PEDIDO
        </button>
    </div>
    `).join('');
}

function toggleCart() {
    document.getElementById('cartOverlay').classList.toggle('active');
}

function addToCart(id) {
    const product = mockProducts.find(p => p.id === id);
    cart.push(product);
    updateCartUI();
    if (!document.getElementById('cartOverlay').classList.contains('active')) {
        toggleCart();
    }
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    const countLabel = document.getElementById('cartCount');
    const totalLabel = document.getElementById('cartTotal');

    countLabel.innerText = cart.length;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; margin-top: 50px;">Seu carrinho está vazio.</p>';
        totalLabel.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
        <div style="width: 60px; height: 60px; background: #eee; border-radius: 8px; overflow: hidden">
            <img src="${item.img}" style="width:100%">
        </div>
        <div style="flex:1">
            <h4 style="font-size: 0.9rem; color: var(--roxo-dark)">${item.nome}</h4>
            <p style="font-weight: 700">R$ ${item.preco.toFixed(2)}</p>
        </div>
        <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer">✕</button>
    </div>
    `).join('');

    const total = cart.reduce((acc, item) => acc + item.preco, 0);
    totalLabel.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// Inicializar
renderProducts();
