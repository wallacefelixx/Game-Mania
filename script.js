// ==========================================================================
// ARQUIVO: script.js
// DESCRIÇÃO: Lógica principal do site Game Mania (Carrinho, Filtros, UI)
// ==========================================================================

// ==========================================================================
// 1. VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==========================================================================

// Recupera o carrinho do LocalStorage ou cria um array vazio se não existir
let carrinhoItens = JSON.parse(localStorage.getItem('gamemania_carrinho')) || [];

/**
 * Converte uma string de preço (ex: "R$ 1.200,90") para um número float (1200.90)
 */
function converterPrecoParaNumero(textoPreco) {
    if (!textoPreco) return 0;
    // Remove "R$", remove pontos de milhar e troca vírgula decimal por ponto
    let limpo = textoPreco.replace('R$', '').replaceAll('.', '').replace(',', '.').trim();
    return parseFloat(limpo) || 0;
}

/**
 * Formata um número para o padrão de moeda brasileiro (R$ 0,00)
 */
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Carrega componentes HTML externos (Header, Footer, Sidebar) dinamicamente
 */
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erro ao carregar ${filePath}`);
        const data = await response.text();
        const element = document.getElementById(elementId);
        if(element) {
            element.innerHTML = data;
            // Se for o carrinho, atualiza os itens visuais logo após carregar
            if(elementId === "cart-sidebar-container") {
                atualizarVisualizacaoCarrinho();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

// ==========================================================================
// 2. INICIALIZAÇÃO DO SITE (DOMContentLoaded)
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // Carrega Header e Footer em todas as páginas
    await loadComponent("header-target", "header.html");
    await loadComponent("footer-target", "footer.html");
    
    // Carrega a Sidebar do Carrinho se o container existir
    if(document.getElementById("cart-sidebar-container")) {
        await loadComponent("cart-sidebar-container", "cart_sidebar.html");
    }

    // Inicializa lógica da página de Checkout
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }

    // Inicializa Contagem Regressiva (se houver o elemento)
    if(document.getElementById("countdown-timer")) {
        iniciarContagemRegressiva(5 * 60 * 60); // 5 horas em segundos
    }

    // Inicializa o Mascote/Robô de Ajuda
    inicializarRoboGamer();
});

// ==========================================================================
// 3. LÓGICA DO CARRINHO DE COMPRAS
// ==========================================================================

/**
 * Abre o menu lateral (Offcanvas) do carrinho
 */
function abrirCarrinho(e) {
    if(e) e.preventDefault();
    const offcanvasElement = document.getElementById('offcanvasCarrinho');
    if (offcanvasElement) {
        // Usa a API do Bootstrap para mostrar o offcanvas
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);
        bsOffcanvas.show();
    }
}

/**
 * Adiciona um produto ao carrinho baseado no botão clicado
 */
function adicionarAoCarrinho(botao) {
    // Encontra o card pai do botão clicado para pegar os dados
    const card = botao.closest('.product-card'); 
    
    const nome = card.querySelector('.product-name').innerText;
    const precoElement = card.querySelector('.product-price-new');
    const precoTexto = precoElement ? precoElement.innerText : 'R$ 0,00';
    const img = card.querySelector('img').src;

    // Adiciona ao array e salva no navegador
    carrinhoItens.push({ nome, precoTexto, img });
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));

    // Atualiza a UI e abre o carrinho para feedback imediato
    atualizarVisualizacaoCarrinho();
    abrirCarrinho(null);
}

/**
 * Remove um item do carrinho pelo índice
 */
function removerItem(index) {
    carrinhoItens.splice(index, 1);
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));
    
    atualizarVisualizacaoCarrinho();
    
    // Se estivermos na página de checkout, atualiza o resumo lá também
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
}

/**
 * Renderiza a lista de itens dentro da Sidebar do Carrinho
 */
function atualizarVisualizacaoCarrinho() {
    const containerItens = document.getElementById('lista-itens-carrinho');
    const containerTotal = document.getElementById('preco-total-carrinho');
    
    // Se o HTML do carrinho ainda não carregou, para a execução
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

    // Atualiza o valor total no rodapé do carrinho
    if(containerTotal) {
        containerTotal.innerText = formatarMoeda(total);
    }

    // Configura o botão de "Finalizar Compra"
    const btnFinalizar = document.querySelector('.cart-footer button');
    if(btnFinalizar) {
        btnFinalizar.onclick = () => window.location.href = 'checkout.html';
    }
}

// ==========================================================================
// 4. LÓGICA DE FILTROS (PRODUTOS E JOGOS)
// ==========================================================================

/**
 * Filtro Genérico para Produtos (Hardware, Notebooks, etc)
 */
function filtrarProdutos(categoria, botaoClicado) {
    const produtos = document.querySelectorAll('.product-col');
    const botoes = document.querySelectorAll('.btn-filter');

    // Gerencia a classe 'active' visual nos botões
    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }

    // Mostra/Esconde produtos baseado no atributo data-categoria
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

/**
 * Filtro Específico para a Página de Jogos (PlayStation, Xbox, etc)
 */
function filtrarJogos(plataforma, botaoClicado) {
    const jogos = document.querySelectorAll('.game-col');
    const botoes = document.querySelectorAll('.btn-filter');
    
    // Gerenciar classe 'active' nos botões
    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }
    
    // Filtrar cards baseado no atributo data-plataforma
    jogos.forEach(jogo => {
        const plat = jogo.getAttribute('data-plataforma');
        if (plataforma === 'todos' || plat === plataforma) {
            jogo.classList.remove('d-none-filter');
        } else {
            jogo.classList.add('d-none-filter');
        }
    });
}

// ==========================================================================
// 5. LÓGICA DA PÁGINA DE CHECKOUT
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
// 6. RELÓGIO DE CONTAGEM REGRESSIVA (OFERTAS)
// ==========================================================================

function iniciarContagemRegressiva(duracaoSegundos) {
    let timer = duracaoSegundos, horas, minutos, segundos;
    const display = document.getElementById('countdown-timer');
    
    if(!display) return;

    setInterval(function () {
        horas = parseInt(timer / 3600, 10);
        minutos = parseInt((timer % 3600) / 60, 10);
        segundos = parseInt(timer % 60, 10);

        // Adiciona o zero à esquerda se for menor que 10
        horas = horas < 10 ? "0" + horas : horas;
        minutos = minutos < 10 ? "0" + minutos : minutos;
        segundos = segundos < 10 ? "0" + segundos : segundos;

        display.textContent = horas + " : " + minutos + " : " + segundos;

        if (--timer < 0) {
            timer = duracaoSegundos; // Reinicia o timer se acabar
        }
    }, 1000);
}

// ==========================================================================
// 7. LÓGICA DO ROBÔ GAMEMANIA (CHAT HELPER)
// ==========================================================================

function inicializarRoboGamer() {
    // Ícone do Robô Gamer
    const roboImgUrl = "https://cdn-icons-png.flaticon.com/512/8654/8654193.png"; 
    
    // 1. Deteção da Página Atual para personalizar mensagem
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

    // Cria o container do robô dinamicamente
    const container = document.createElement('div');
    container.className = 'robo-container';
    
    // HTML interno do Robô e Balão
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
    // Mostra o balão ao passar o mouse sobre a área do robô
    container.onmouseenter = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'block';
    };

    // Esconde o balão ao tirar o mouse
    container.onmouseleave = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'none';
    };

    document.body.appendChild(container);
}

// Fecha o balão manualmente
function fecharBalao(e) {
    if(e) e.stopPropagation(); 
    const balao = document.getElementById('robo-msg');
    if(balao) balao.style.display = 'none';
}

// Redireciona para o WhatsApp
function abrirWhatsappAjuda() {
    const numero = "5537998296855"; 
    const mensagem = "Olá! Estou na loja Gamemania e tenho uma dúvida.";
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
}