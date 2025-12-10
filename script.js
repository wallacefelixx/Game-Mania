// ==========================================================================
// ARQUIVO: script.js
// DESCRIÇÃO: Lógica principal do site Game Mania (Carrinho, Filtros, UI, Checkout)
// ==========================================================================

// ==========================================================================
// 1. VARIÁVEIS GLOBAIS E UTILITÁRIOS
// ==========================================================================

// Recupera o carrinho do LocalStorage ou cria um array vazio se for a primeira vez
let carrinhoItens = JSON.parse(localStorage.getItem('gamemania_carrinho')) || [];

/**
 * Converte uma string de preço (ex: "R$ 1.200,90") para um número float (1200.90)
 * Remove 'R$', espaços, pontos de milhar e troca vírgula por ponto.
 */
function converterPrecoParaNumero(textoPreco) {
    if (!textoPreco) return 0;
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
 * Carrega componentes HTML externos (Header, Footer, Sidebar) dinamicamente.
 * Isso evita repetir código HTML em todas as páginas.
 */
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Erro ao carregar ${filePath}`);
        
        const data = await response.text();
        const element = document.getElementById(elementId);
        
        if(element) {
            element.innerHTML = data;
            
            // Se o componente carregado for o carrinho, atualiza a lista visual imediatamente
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
    
    // 1. Carrega Header e Footer em todas as páginas
    await loadComponent("header-target", "header.html");
    await loadComponent("footer-target", "footer.html");
    
    // 2. Carrega a Sidebar do Carrinho (se o container existir na página)
    if(document.getElementById("cart-sidebar-container")) {
        await loadComponent("cart-sidebar-container", "cart_sidebar.html");
    }

    // 3. Inicializa lógica da página de Checkout (se estiver nela)
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }

    // 4. Inicializa Contagem Regressiva (se houver o elemento de timer)
    if(document.getElementById("countdown-timer")) {
        iniciarContagemRegressiva(5 * 60 * 60); // 5 horas em segundos
    }

    // 5. Inicializa o Mascote/Robô de Ajuda
    inicializarRoboGamer();
});

// ==========================================================================
// 3. LÓGICA DO CARRINHO DE COMPRAS
// ==========================================================================

/**
 * Abre o menu lateral (Offcanvas) do carrinho usando a API do Bootstrap
 */
function abrirCarrinho(e) {
    if(e) e.preventDefault(); // Previne comportamento padrão se for link
    const offcanvasElement = document.getElementById('offcanvasCarrinho');
    if (offcanvasElement) {
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);
        bsOffcanvas.show();
    }
}

/**
 * Adiciona um produto ao carrinho baseado no botão clicado.
 * Busca as informações do Card pai do botão.
 */
function adicionarAoCarrinho(botao) {
    // Encontra o card pai do botão clicado para pegar os dados
    const card = botao.closest('.product-card'); 
    
    // Extrai dados do HTML
    const nome = card.querySelector('.product-name').innerText;
    const precoElement = card.querySelector('.product-price-new');
    const precoTexto = precoElement ? precoElement.innerText : 'R$ 0,00';
    const img = card.querySelector('img').src;

    // Adiciona ao array e salva no LocalStorage do navegador
    carrinhoItens.push({ nome, precoTexto, img });
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));

    // Atualiza a UI e abre o carrinho para dar feedback ao usuário
    atualizarVisualizacaoCarrinho();
    abrirCarrinho(null);
}

/**
 * Remove um item do carrinho pelo índice do array
 */
function removerItem(index) {
    carrinhoItens.splice(index, 1); // Remove 1 item na posição index
    localStorage.setItem('gamemania_carrinho', JSON.stringify(carrinhoItens));
    
    atualizarVisualizacaoCarrinho();
    
    // Se estivermos na página de checkout, atualiza o resumo lá também
    if(document.getElementById("checkout-resumo-container")) {
        renderizarPaginaCheckout();
    }
}

/**
 * Renderiza o HTML da lista de itens dentro da Sidebar do Carrinho
 */
function atualizarVisualizacaoCarrinho() {
    const containerItens = document.getElementById('lista-itens-carrinho');
    const containerTotal = document.getElementById('preco-total-carrinho');
    
    // Se o HTML do carrinho ainda não carregou, para a execução para não dar erro
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

    // Configura o botão de "Finalizar Compra" para levar ao checkout
    const btnFinalizar = document.querySelector('.cart-footer button');
    if(btnFinalizar) {
        btnFinalizar.onclick = () => window.location.href = 'checkout.html';
    }
}

// ==========================================================================
// 4. LÓGICA DE FILTROS (PRODUTOS E JOGOS)
// ==========================================================================

/**
 * Filtro para Página de Hardware/Periféricos (Usa classe .product-col)
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
 * Filtro para Página de Jogos (Usa classe .game-col e atributo data-plataforma)
 */
function filtrarJogos(plataforma, botaoClicado) {
    const jogos = document.querySelectorAll('.game-col');
    const botoes = document.querySelectorAll('.btn-filter');
    
    // Gerenciar classe 'active' nos botões
    if(botoes.length > 0 && botaoClicado) {
        botoes.forEach(btn => btn.classList.remove('active'));
        botaoClicado.classList.add('active');
    }
    
    // Filtrar cards
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

/**
 * Renderiza o resumo do pedido na página checkout.html (estático, sem botões de remover)
 */
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

        // Formatação com zero à esquerda
        horas = horas < 10 ? "0" + horas : horas;
        minutos = minutos < 10 ? "0" + minutos : minutos;
        segundos = segundos < 10 ? "0" + segundos : segundos;

        display.textContent = horas + " : " + minutos + " : " + segundos;

        if (--timer < 0) {
            timer = duracaoSegundos; // Reinicia o loop se acabar
        }
    }, 1000);
}

// ==========================================================================
// 7. LÓGICA DO ROBÔ GAMEMANIA (CHAT HELPER)
// ==========================================================================

function inicializarRoboGamer() {
    const roboImgUrl = "https://cdn-icons-png.flaticon.com/512/8654/8654193.png"; 
    
    // Detecta qual página o usuário está para mandar a mensagem certa
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

    // Mostra balão no hover
    container.onmouseenter = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'block';
    };

    // Esconde balão ao sair
    container.onmouseleave = function() {
        const balao = document.getElementById('robo-msg');
        if(balao) balao.style.display = 'none';
    };

    document.body.appendChild(container);
}

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

// ==========================================================================
// 8. LÓGICA DE BUSCA (SEARCH ENGINE)
// ==========================================================================

// BANCO DE DADOS DE PRODUTOS (Adicione todos os seus produtos aqui)
const dbProdutos = [
    { nome: "PlayStation 5 Slim", preco: "R$ 3.799,90", img: "https://images.kabum.com.br/produtos/fotos/496229/console-playstation-5-slim-edicao-digital-com-2-jogos-controle-sem-fio-dualsense-branco-1tb-ssd- CFI-2014-B01X_1701349883_gg.jpg", link: "ps5.html", categoria: "console" },
    { nome: "Xbox Series X", preco: "R$ 4.299,90", img: "https://assets.xboxservices.com/assets/fb/d2/fbd2cb56-5c25-414d-9f46-e6c1642648bf.png?n=XBX_A-BuyBoxBGImage01-D.png", link: "xbox.html", categoria: "console" },
    { nome: "Nintendo Switch OLED", preco: "R$ 2.199,90", img: "https://assets.nintendo.com/image/upload/f_auto/q_auto/dpr_1.0/c_scale,w_800/ncom/en_US/switch/site-design-update/hardware/switch/gallery/gallery01", link: "nintendo-switch.html", categoria: "console" },
    { nome: "Notebook Gamer Acer Predator", preco: "R$ 8.999,90", img: "https://images4.kabum.com.br/produtos/fotos/sync_mirakl/677554/xlarge/Notebook-Acer-Predator-Phn16-72-99my-Intel-Ci9-14900hx-14-Gen-32gb-1TB-SSD-RTX-4070-W11-Home-NH-QTVAL-002_1762352017.png", link: "acer-predator-helios.html", categoria: "pc" },
    { nome: "Funko Pop! Batman", preco: "R$ 119,90", img: "https://http2.mlstatic.com/D_NQ_NP_2X_781225-MLA97783777990_112025-F.webp", link: "diversos.html", categoria: "diversos" },
    { nome: "Microfone Shure SM7B", preco: "R$ 2.999,00", img: "https://products.shureweb.eu/cdn-cgi/image/width=1380,height=1380,format=auto/shure_product_db/product_main_images/files/7e1/bf6/ed-/original/721ed7ee412b45897688a7b5acdefa44.webp", link: "mic_shure_sm7b.html", categoria: "perifericos" }
    // ... Adicione mais produtos conforme necessário
];

/**
 * Função chamada ao submeter o formulário do Header
 */
function realizarBusca(event) {
    event.preventDefault(); // Impede a página de recarregar
    const termo = document.getElementById('termo-busca').value.trim();
    
    if (termo) {
        // Redireciona para a página de busca com o termo na URL
        window.location.href = `busca.html?q=${encodeURIComponent(termo)}`;
    }
}

/**
 * Função executada apenas na página busca.html para renderizar resultados
 */
function carregarResultadosNaPagina() {
    const params = new URLSearchParams(window.location.search);
    const termo = params.get('q');
    const container = document.getElementById('resultados-busca');
    const tituloBusca = document.getElementById('titulo-busca');

    if (!container || !termo) return;

    tituloBusca.innerText = `Resultados para: "${termo}"`;
    container.innerHTML = '';

    // Filtra os produtos (busca case-insensitive)
    const resultados = dbProdutos.filter(p => 
        p.nome.toLowerCase().includes(termo.toLowerCase()) || 
        p.categoria.toLowerCase().includes(termo.toLowerCase())
    );

    if (resultados.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-emoji-frown display-1 text-muted"></i>
                <h3 class="mt-3 text-muted">Nenhum produto encontrado.</h3>
                <p>Tente buscar por termos mais genéricos como "PS5", "Xbox" ou "Funko".</p>
                <a href="index.html" class="btn btn-comprar px-4 mt-3" style="width:auto">Voltar para Home</a>
            </div>
        `;
        return;
    }

    // Renderiza os cards encontrados
    resultados.forEach(produto => {
        const html = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="product-card card h-100">
                    <a href="${produto.link}" class="product-link text-center">
                        <img src="${produto.img}" class="product-img" alt="${produto.nome}">
                    </a>
                    <div class="card-body p-0 text-center">
                        <a href="${produto.link}" class="product-link">
                            <h5 class="product-name">${produto.nome}</h5>
                        </a>
                        <div class="price-container">
                            <span class="product-price-new">${produto.preco}</span>
                        </div>
                        <button class="btn btn-comprar" onclick="adicionarAoCarrinho(this)">COMPRAR</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Verifica se está na página de busca e carrega os resultados
if (window.location.pathname.includes('busca.html')) {
    document.addEventListener("DOMContentLoaded", carregarResultadosNaPagina);
}
