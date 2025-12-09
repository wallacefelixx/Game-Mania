// --- Variáveis Globais ---
// Tenta pegar do LocalStorage, se não existir, inicia vazio
let carrinhoItens = JSON.parse(localStorage.getItem('gamemania_carrinho')) || [];

// --- Função Fetch Genérica ---
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erro ao carregar ${filePath}`);
        const data = await response.text();
        const element = document.getElementById(elementId);
        if(element) {
            element.innerHTML = data;
            // Se carregou o sidebar, atualiza o visual dele com os itens salvos
            if(elementId === "cart-sidebar-container") {
                atualizarVisualizacaoCarrinho();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// --- Inicialização do Site ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Carrega Componentes
    await loadComponent("header-target", "header.html");
    await loadComponent("footer-target", "footer.html");
    
    // Carrega sidebar apenas se o container existir (não carrega no checkout para evitar duplicação)
    if(document.getElementById("cart-sidebar-container")) {
        await loadComponent("cart-sidebar-container", "cart_sidebar.html");
    }

    // 2. Inicializa Carrossel
    var myCarousel = document.querySelector('#carouselGameMania');
    if(myCarousel) {
        new bootstrap.Carousel(myCarousel, { interval: 3000, ride: 'carousel' });
    }

    // 3. Verifica se está na página de Checkout para carregar o resumo
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
});

// --- LÓGICA DO CARRINHO ---

function abrirCarrinho(e) {
    if(e) e.preventDefault();
    const offcanvasElement = document.getElementById('offcanvasCarrinho');
    if (offcanvasElement) {
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);
        bsOffcanvas.show();
    }
}

function adicionarAoCarrinho(botao) {
    const card = botao.closest('.product-card'); 
    const nome = card.querySelector('.product-name').innerText;
    const precoElement = card.querySelector('.product-price-new');
    const precoTexto = precoElement ? precoElement.innerText : 'R$ 0,00';
    const img = card.querySelector('img').src;

    carrinhoItens.push({ nome, precoTexto, img });
    
    // Salva no LocalStorage
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));

    atualizarVisualizacaoCarrinho();
    abrirCarrinho(null);
}

function atualizarVisualizacaoCarrinho() {
    const containerItens = document.getElementById('lista-itens-carrinho');
    const containerTotal = document.getElementById('preco-total-carrinho');
    
    if(!containerItens) return;

    containerItens.innerHTML = '';
    let total = 0;

    if (carrinhoItens.length === 0) {
        containerItens.innerHTML = '<p class="text-center text-muted mt-5">Seu carrinho está vazio.</p>';
    } else {
        carrinhoItens.forEach((item, index) => {
            let precoLimpo = item.precoTexto.replace('R$', '').replaceAll('.', '').replace(',', '.').trim();
            let precoNumerico = parseFloat(precoLimpo);
            if(!isNaN(precoNumerico)) total += precoNumerico;

            const itemHTML = `
                <div class="d-flex align-items-center mb-3 border-bottom border-secondary pb-3">
                    <img src="${item.img}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                    <div class="ms-3 flex-grow-1">
                        <h6 class="text-white mb-1 small">${item.nome}</h6>
                        <span class="fw-bold small" style="color: var(--neon-green);">${item.precoTexto}</span>
                    </div>
                    <button onclick="removerItem(${index})" class="btn btn-sm text-danger"><i class="bi bi-trash"></i></button>
                </div>
            `;
            containerItens.innerHTML += itemHTML;
        });
    }

    if(containerTotal) {
        containerTotal.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Atualiza botão do sidebar para ir para o Checkout
    const btnFinalizar = document.querySelector('.cart-footer button');
    if(btnFinalizar) {
        btnFinalizar.onclick = () => window.location.href = 'checkout.html';
    }
}

function removerItem(index) {
    carrinhoItens.splice(index, 1);
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));
    atualizarVisualizacaoCarrinho();
    
    // Se estiver na página de checkout, atualiza ela também
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
}

// --- FUNÇÃO DE FILTRO (AGORA CENTRALIZADA) ---
function filtrarProdutos(categoria, botaoClicado) {
    const produtos = document.querySelectorAll('.product-col');
    const botoes = document.querySelectorAll('.btn-filter');

    // Atualiza visual dos botões
    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }

    // Filtragem
    produtos.forEach(produto => {
        const categoriaProduto = produto.getAttribute('data-categoria');
        if (categoria === 'todos') {
            produto.classList.remove('d-none-filter');
        } else {
            if (categoriaProduto === categoria) {
                produto.classList.remove('d-none-filter'); 
            } else {
                produto.classList.add('d-none-filter'); 
            }
        }
    });
}

// --- LÓGICA ESPECÍFICA DA PÁGINA DE CHECKOUT ---
function renderizarPaginaCheckout() {
    const container = document.getElementById("checkout-lista-itens");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const totalEl = document.getElementById("checkout-total");
    
    if(!container) return;

    container.innerHTML = '';
    let total = 0;

    carrinhoItens.forEach((item) => {
        let precoLimpo = item.precoTexto.replace('R$', '').replaceAll('.', '').replace(',', '.').trim();
        let precoNumerico = parseFloat(precoLimpo);
        if(!isNaN(precoNumerico)) total += precoNumerico;

        container.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center">
                    <img src="${item.img}" class="rounded border" style="width: 50px; height: 50px; object-fit: contain;">
                    <span class="ms-2 small text-muted">${item.nome}</span>
                </div>
                <span class="fw-bold">${item.precoTexto}</span>
            </div>
        `;
    });

    if(subtotalEl) subtotalEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(totalEl) totalEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}