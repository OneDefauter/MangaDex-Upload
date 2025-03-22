// Variáveis para guardar a estrutura original
let originalFlexDiv = null;
let originalParent = null;
let originalIndex = null;
let originalChildren = null;

function armazenarFlexDiv() {
    // Seleciona o nó
    const flexDiv = document.querySelector('#mode-pc');
    if (!flexDiv) return;

    // Armazena referências
    originalFlexDiv = flexDiv;
    originalParent = flexDiv.parentNode;

    // Pega a posição exata em que o #mode-pc está dentro do pai
    const siblings = Array.from(originalParent.childNodes);
    originalIndex = siblings.indexOf(flexDiv);

    // Salva os filhos para depois recolocar
    originalChildren = Array.from(flexDiv.childNodes);
}

function removerFlexDiv() {
    if (!originalFlexDiv) return; // se ainda não foi armazenado ou já removido

    // Para cada filho dentro de #mode-pc, jogamos ele para o pai de #mode-pc
    while (originalFlexDiv.firstChild) {
        originalParent.insertBefore(originalFlexDiv.firstChild, originalFlexDiv);
    }

    // Remove o #mode-pc do DOM
    originalParent.removeChild(originalFlexDiv);
}

function recolocarFlexDiv() {
    // Se o #mode-pc já está na página, não faz nada
    if (document.querySelector('#mode-pc')) return;

    // Cria novamente o nó
    const newFlexDiv = document.createElement('div');
    newFlexDiv.id = 'mode-pc';
    newFlexDiv.classList.add('flex');

    // Insere o nó recriado na mesma posição original (se ela existir)
    const siblings = Array.from(originalParent.childNodes);
    if (originalIndex >= 0 && originalIndex < siblings.length) {
        originalParent.insertBefore(newFlexDiv, siblings[originalIndex]);
    } else {
        // Se a posição não existe mais, insere no final
        originalParent.appendChild(newFlexDiv);
    }

    // Recoloca os filhos que estavam armazenados
    if (originalChildren) {
        originalChildren.forEach(child => {
            newFlexDiv.appendChild(child);
        });
    }

    // Atualiza a referência do originalFlexDiv para esse novo
    originalFlexDiv = newFlexDiv;
}

function ajustarLayout() {
    if (window.matchMedia('(max-width: 768px)').matches) {
        removerFlexDiv();
    } else {
        recolocarFlexDiv();
    }
}

armazenarFlexDiv();            // guarda a estrutura original
window.addEventListener('resize', ajustarLayout);
ajustarLayout();               // executa uma vez na abertura
