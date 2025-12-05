// ==========================================================================
// 1. VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==========================================================================

// Recupera o carrinho do LocalStorage ou inicia vazio
let carrinhoItens = JSON.parse(localStorage.getItem('gamemania_carrinho')) || [];

// Função auxiliar para converter "R$ 1.000,00" em número (1000.00)
function converterPrecoParaNumero(textoPreco) {
    if (!textoPreco) return 0;
    let limpo = textoPreco.replace('R$', '').replaceAll('.', '').replace(',', '.').trim();
    return parseFloat(limpo) || 0;
}

// Função para formatar número (1000.00) para Real "R$ 1.000,00"
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função genérica para carregar HTML externo (Header/Footer)
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erro ao carregar ${filePath}`);
        const data = await response.text();
        const element = document.getElementById(elementId);
        if(element) {
            element.innerHTML = data;
            // Se for o sidebar, atualiza o visual dele assim que carregar
            if(elementId === "cart-sidebar-container") {
                atualizarVisualizacaoCarrinho();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// ==========================================================================
// 2. INICIALIZAÇÃO DO SITE (Ao carregar a página)
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // Carrega Header e Footer
    await loadComponent("header-target", "header.html");
    await loadComponent("footer-target", "footer.html");
    
    // Carrega Sidebar do Carrinho (apenas se o container existir na página)
    if(document.getElementById("cart-sidebar-container")) {
        await loadComponent("cart-sidebar-container", "cart_sidebar.html");
    }

    // Inicializa Carrossel (se existir)
    var myCarousel = document.querySelector('#carouselGameMania');
    if(myCarousel) {
        new bootstrap.Carousel(myCarousel, { interval: 3000, ride: 'carousel' });
    }

    // Renderiza a página de Checkout (se estiver nela)
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
});

// ==========================================================================
// 3. LÓGICA DO CARRINHO (Adicionar, Remover, Abrir)
// ==========================================================================

function abrirCarrinho(e) {
    if(e) e.preventDefault();
    const offcanvasElement = document.getElementById('offcanvasCarrinho');
    if (offcanvasElement) {
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);
        bsOffcanvas.show();
    }
}

function adicionarAoCarrinho(botao) {
    // Encontra o card do produto mais próximo do botão clicado
    const card = botao.closest('.product-card'); 
    
    // Captura os dados
    const nome = card.querySelector('.product-name').innerText;
    const precoElement = card.querySelector('.product-price-new');
    const precoTexto = precoElement ? precoElement.innerText : 'R$ 0,00';
    const img = card.querySelector('img').src;

    // Adiciona ao array e salva
    carrinhoItens.push({ nome, precoTexto, img });
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));

    // Atualiza a interface
    atualizarVisualizacaoCarrinho();
    abrirCarrinho(null);
}

function removerItem(index) {
    carrinhoItens.splice(index, 1); // Remove o item pelo índice
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens)); // Salva
    
    atualizarVisualizacaoCarrinho(); // Atualiza Sidebar
    
    // Se estiver na página de checkout, atualiza ela também
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
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
            total += converterPrecoParaNumero(item.precoTexto);

            const itemHTML = `
                <div class="d-flex align-items-center mb-3 border-bottom border-secondary pb-3">
                    <img src="${item.img}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                    <div class="ms-3 flex-grow-1">
                        <h6 class="text-white mb-1 small">${item.nome}</h6>
                        <span class="fw-bold small" style="color: var(--neon-green);">${item.precoTexto}</span>
                    </div>
                    <button onclick="removerItem(${index})" class="btn btn-sm text-danger" title="Remover item">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            containerItens.innerHTML += itemHTML;
        });
    }

    if(containerTotal) {
        containerTotal.innerText = formatarMoeda(total);
    }

    // Configura o botão de "Finalizar Compra" do sidebar
    const btnFinalizar = document.querySelector('.cart-footer button');
    if(btnFinalizar) {
        btnFinalizar.onclick = () => window.location.href = 'checkout.html';
    }
}

// ==========================================================================
// 4. LÓGICA DE FILTROS (Páginas de Categoria)
// ==========================================================================
function filtrarProdutos(categoria, botaoClicado) {
    const produtos = document.querySelectorAll('.product-col');
    const botoes = document.querySelectorAll('.btn-filter');

    // Atualiza visual dos botões (active)
    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }

    // Lógica de esconder/mostrar
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

// ==========================================================================
// 5. LÓGICA ESPECÍFICA DO CHECKOUT (Página de Pagamento)
// ==========================================================================
function renderizarPaginaCheckout() {
    const container = document.getElementById("checkout-lista-itens");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const totalEl = document.getElementById("checkout-total");
    
    if(!container) return;

    container.innerHTML = '';
    let total = 0;

    carrinhoItens.forEach((item) => {
        total += converterPrecoParaNumero(item.precoTexto);

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

    // Atualiza os valores na tela
    if(subtotalEl) subtotalEl.innerText = formatarMoeda(total);
    if(totalEl) totalEl.innerText = formatarMoeda(total);
}