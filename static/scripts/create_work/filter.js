document.addEventListener('DOMContentLoaded', function () {
    // Seleciona os botões do menu
    const filterButtons = document.querySelectorAll('.button-menu button');

    // Seleciona todas as divs dentro do #draft-form > div.mb-2 e remove a primeira div
    let todasDivs = Array.from(document.querySelector('#draft-form > div.mb-2')?.children || [])
        .filter((el, index) => index !== 0);

    // Separa os <hr> para serem ocultados depois
    const allHrElements = todasDivs.filter(el => el.tagName.toLowerCase() === 'hr');

    // Filtra novamente para remover os <hr> da lista principal
    todasDivs = todasDivs.filter(el => el.tagName.toLowerCase() !== 'hr');

    // Mapeia os nomes para os índices correspondentes
    const categoryIndex = {
        'obra': 0,
        'metadados': 1,
        'tags': 2,
        'sites': 3,
        'relacionadas': 4,
        'capas': 5
    };

    filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            // Remove a classe 'primary' de todos os botões e adiciona 'accent'
            filterButtons.forEach(btn => {
                btn.classList.remove('primary');
                btn.classList.add('accent');
            });

            // Adiciona 'primary' ao botão clicado e remove 'accent'
            button.classList.remove('accent');
            button.classList.add('primary');

            // Obtém o texto do botão e converte para minúsculas
            const filtro = button.textContent.trim().toLowerCase();

            if (filtro === t_script.filter.all) {
                // Exibe todas as seções
                todasDivs.forEach(section => {
                    section.style.display = '';
                });

                // Exibe todos os <hr>
                allHrElements.forEach(hr => {
                    hr.style.display = '';
                });

                const r1 = document.querySelector('#disabled-r1');
                const r2 = document.querySelector('#disabled-r2');
                const c1 = document.querySelector('#disabled-c1');
                const c2 = document.querySelector('#disabled-c2');

                if (r1 && r2 && c1 && c2) {
                    r1.style.display = 'none';
                    r2.style.display = 'none';
                    c1.style.display = 'none';
                    c2.style.display = 'none';
                }

            } else {
                // Oculta todas as seções
                todasDivs.forEach(section => {
                    section.style.display = 'none';
                });

                // Oculta todos os <hr>
                allHrElements.forEach(hr => {
                    hr.style.display = 'none';
                });

                // Obtém o índice da categoria e exibe a seção correspondente
                const index = categoryIndex[filtro];
                if (index !== undefined && todasDivs[index]) {
                    todasDivs[index].style.display = '';
                }
            }
        });
    });
});
