// Função para adicionar a área animada dinamicamente
function createAnimatedArea() {
    // Cria a div com a classe 'area'
    const areaDiv = document.createElement('div');
    areaDiv.classList.add('area');

    // Cria o ul com a classe 'circles'
    const ul = document.createElement('ul');
    ul.classList.add('circles');

    // Adiciona 10 li dinamicamente dentro do ul
    for (let i = 0; i < 10; i++) {
        const li = document.createElement('li');
        ul.appendChild(li);
    }

    // Adiciona o ul dentro da div
    areaDiv.appendChild(ul);

    // Adiciona a div no corpo do documento
    document.body.prepend(areaDiv); // Insere antes de todo o conteúdo
}

// Chama a função para criar a área animada
createAnimatedArea();
