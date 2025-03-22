// Variável para armazenar o timer do toque
let touchTimer;

// Variável para armazenar o timestamp do último toque
let lastTapTime = 0;

// Variável para armazenar o timer para diferenciar toque simples e duplo toque
let tapTimeout = null;

// Função para selecionar todos os itens (que não estão em grupo)
function selectAllItems() {
    // Verifica se o modal está aberto para não interferir na interação dentro dele
    if (isModalOpen()) return;
    const items = document.querySelectorAll('.file-item:not([data-group-name])');
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';
    items.forEach(item => {
        item.classList.add('selected');
        if (isAndroid) {
            const checkbox = item.querySelector('.item-checkbox');
            if (checkbox) checkbox.checked = true;
        }
    });
}

// Inicia o timer no toque e define um tempo (por exemplo, 800ms) para considerar como "toque longo"
document.addEventListener('touchstart', function(e) {
    // Se o toque ocorrer em um input ou textarea, não inicia o toque longo
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    touchTimer = setTimeout(() => {
        selectAllItems();
        updateGroupButton();
    }, 800);
});

// Cancela o timer se o toque for breve
document.addEventListener('touchend', function() {
    clearTimeout(touchTimer);
});

// Função para tratar o toque em itens, diferenciando toque simples (CTRL) de duplo toque (SHIFT)
function handleTouchItemClick(event, index) {
    const currentTime = new Date().getTime();
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';
    const item = event.currentTarget;

    // Se houver um timer pendente (ou seja, esse toque é o segundo dentro do intervalo)
    if (tapTimeout) {
        // Cancela o timer do toque simples
        clearTimeout(tapTimeout);
        tapTimeout = null;
        // Executa a lógica de duplo toque (SHIFT)
        if (lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            for (let i = start; i <= end; i++) {
                const listItem = itemsList.children[i];
                if (!listItem.hasAttribute('data-group-name')) { // Ignora itens já em grupo
                    listItem.classList.add('selected');
                    if (isAndroid) {
                        const checkbox = listItem.querySelector('.item-checkbox');
                        if (checkbox) checkbox.checked = true;
                    }
                }
            }
        }
        // Atualiza o lastSelectedIndex para o item atual (opcional, dependendo do comportamento desejado)
        lastSelectedIndex = index;
        updateGroupButton();
    } else {
        // Se for o primeiro toque, define um timer para executar a ação de toque simples (CTRL)
        tapTimeout = setTimeout(() => {
            // Lógica de toque simples (CTRL): alterna a seleção do item atual
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                if (isAndroid) {
                    const checkbox = item.querySelector('.item-checkbox');
                    if (checkbox) checkbox.checked = false;
                }
                // Aqui não atualizamos lastSelectedIndex se for deseleção
            } else {
                item.classList.add('selected');
                if (isAndroid) {
                    const checkbox = item.querySelector('.item-checkbox');
                    if (checkbox) checkbox.checked = true;
                }
                lastSelectedIndex = index; // Atualiza o índice quando o item é selecionado
            }
            tapTimeout = null; // Limpa o timer após a execução
            updateGroupButton();
        }, 300); // Aguarda 300ms para verificar se haverá um segundo toque
    }
}

// Exemplo de como adicionar o listener para os itens
function loadItens() {
    const allItens = document.querySelectorAll('.file-item');
    allItens.forEach((item, index) => {
        item.addEventListener('touchend', (event) => {
            event.preventDefault();
            handleTouchItemClick(event, index);
        });
    });
}
