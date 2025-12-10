// ==========================================================================
// 1. VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==========================================================================

let carrinhoItens = JSON.parse(localStorage.getItem('gamemania_carrinho')) || [];

function converterPrecoParaNumero(textoPreco) {
    if (!textoPreco) return 0;
    let limpo = textoPreco.replace('R$', '').replaceAll('.', '').replace(',', '.').trim();
    return parseFloat(limpo) || 0;
}

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erro ao carregar ${filePath}`);
        const data = await response.text();
        const element = document.getElementById(elementId);
        if(element) {
            element.innerHTML = data;
            if(elementId === "cart-sidebar-container") {
                atualizarVisualizacaoCarrinho();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// ==========================================================================
// 2. INICIALIZAÇÃO DO SITE
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    await loadComponent("header-target", "header.html");
    await loadComponent("footer-target", "footer.html");
    
    if(document.getElementById("cart-sidebar-container")) {
        await loadComponent("cart-sidebar-container", "cart_sidebar.html");
    }

    // Não inicializamos o Carousel aqui para deixar o HTML controlar
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }

    if(document.getElementById("countdown-timer")) {
        iniciarContagemRegressiva(5 * 60 * 60); // 5 horas
    }

    // === INICIALIZA O ROBÔ AQUI ===
    inicializarRoboGamer();
});

// ==========================================================================
// 3. LÓGICA DO CARRINHO
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
    const card = botao.closest('.product-card'); 
    const nome = card.querySelector('.product-name').innerText;
    const precoElement = card.querySelector('.product-price-new');
    const precoTexto = precoElement ? precoElement.innerText : 'R$ 0,00';
    const img = card.querySelector('img').src;

    carrinhoItens.push({ nome, precoTexto, img });
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));

    atualizarVisualizacaoCarrinho();
    abrirCarrinho(null);
}

function removerItem(index) {
    carrinhoItens.splice(index, 1);
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));
    atualizarVisualizacaoCarrinho();
    
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

    const btnFinalizar = document.querySelector('.cart-footer button');
    if(btnFinalizar) {
        btnFinalizar.onclick = () => window.location.href = 'checkout.html';
    }
}

// ==========================================================================
// 4. LÓGICA DE FILTROS
// ==========================================================================
function filtrarProdutos(categoria, botaoClicado) {
    const produtos = document.querySelectorAll('.product-col');
    const botoes = document.querySelectorAll('.btn-filter');

    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }

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
// 5. LÓGICA DO CHECKOUT
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

    if(subtotalEl) subtotalEl.innerText = formatarMoeda(total);
    if(totalEl) totalEl.innerText = formatarMoeda(total);
}

// ==========================================================================
// 6. RELÓGIO DE OFERTAS
// ==========================================================================
function iniciarContagemRegressiva(duracaoSegundos) {
    let timer = duracaoSegundos, horas, minutos, segundos;
    const display = document.getElementById('countdown-timer');
    if(!display) return;

    setInterval(function () {
        horas = parseInt(timer / 3600, 10);
        minutos = parseInt((timer % 3600) / 60, 10);
        segundos = parseInt(timer % 60, 10);
        horas = horas < 10 ? "0" + horas : horas;
        minutos = minutos < 10 ? "0" + minutos : minutos;
        segundos = segundos < 10 ? "0" + segundos : segundos;
        display.textContent = horas + " : " + minutos + " : " + segundos;
        if (--timer < 0) timer = duracaoSegundos; 
    }, 1000);
}

// ==========================================================================
// 7. LÓGICA DO ROBÔ GAMEMANIA (HOVER EFFECT)
// ==========================================================================
function inicializarRoboGamer() {
    // Ícone do Robô Gamer
    const roboImgUrl = "https://cdn-icons-png.flaticon.com/512/8654/8654193.png"; 
    
    // 1. Deteção da Página Atual
    const caminho = window.location.pathname.toLowerCase(); 
    let mensagemTexto = "Psst! Procurando o melhor setup? 🎮"; 

    if (caminho.includes("checkout")) {
        mensagemTexto = "Dúvidas no pagamento? Posso ajudar! 💳";
    } else if (caminho.includes("carrinho") || caminho.includes("cart")) {
        mensagemTexto = "Ótimas escolhas! Falta pouco para o nível máximo. 🚀";
    } else if (caminho.includes("login") || caminho.includes("entrar")) {
        mensagemTexto = "Esqueceu a senha? Vamos resolver. 🔐";
    } else if (caminho.includes("produto")) {
        mensagemTexto = "Essa peça é uma máquina! Quer ver as specs? 🔧";
    }

    const container = document.createElement('div');
    container.className = 'robo-container';
    
    // HTML (Sem onclick na imagem)
    container.innerHTML = `
        <div class="robo-balao" id="robo-msg" style="display: none;">
            <button class="robo-fechar" onclick="fecharBalao(event)">X</button>
            <span id="robo-texto">${mensagemTexto}</span>
            <br>
            <a href="#" onclick="abrirWhatsappAjuda()" style="color: blue; text-decoration: underline; font-weight: bold; font-size: 0.85rem;">
                Falar com Especialista
            </a>
        </div>
        <img src="${roboImgUrl}" class="robo-avatar" alt="Robô Ajuda">
    `;

    // 2. EVENTOS DE HOVER (MOUSE)
    // Usamos o container para que o balão não feche se o mouse for da imagem para o texto
    container.onmouseenter = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'block';
    };

    container.onmouseleave = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'none';
    };

    document.body.appendChild(container);
}

// Funções Auxiliares
function fecharBalao(e) {
    if(e) e.stopPropagation(); 
    const balao = document.getElementById('robo-msg');
    if(balao) balao.style.display = 'none';
}

function abrirWhatsappAjuda() {
    const numero = "5537998296855"; 
    const mensagem = "Olá! Estou na loja Gamemania e tenho uma dúvida.";
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
}