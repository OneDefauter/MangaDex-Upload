let is_japanese;
let end_chapter;

document.addEventListener('DOMContentLoaded', function () {
    const SelectLanguageContainer = document.querySelector('#tags-language-select');
    const ctn = SelectLanguageContainer.querySelector('div');
    const SelectLanguage = SelectLanguageContainer.querySelector('#select-language-to-tags');
    console.log(SelectLanguageContainer);
    console.log(ctn);
    console.log(SelectLanguage);

    SelectLanguageContainer.addEventListener('click', function () {
        // Se já estiver aberto, fecha-o
        if (SelectLanguage.style.display === 'block') {
            SelectLanguage.style.display = 'none';
            if (ctn) {
                ctn.classList.replace('rounded-b', 'rounded');
            }
            return;
        }

        const rect = SelectLanguageContainer.getBoundingClientRect();
        const marginEdge = 10; // margem mínima da viewport
        const dropdown = SelectLanguage;
    
        // Define left e width com base no container, sem somar scroll
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
    
        // Exibe o dropdown (caso esteja oculto) para que possamos calcular o espaço disponível
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            dropdown.style.display = 'block';
        }
    
        // Calcula o espaço disponível abaixo e acima do container
        const spaceBelow = window.innerHeight - rect.bottom - marginEdge;
        const spaceAbove = rect.top - marginEdge;
    
        // Decisão de posicionamento: escolhe o lado com mais espaço disponível
        if (spaceBelow >= spaceAbove) {
            // Posiciona abaixo do container
            dropdown.style.top = rect.bottom + 'px';
            dropdown.style.bottom = marginEdge + 'px';
            // Limita a altura máxima para caber no espaço disponível abaixo
            dropdown.style.maxHeight = spaceBelow + 'px';
        } else {
            // Posiciona acima do container
            dropdown.style.top = marginEdge + 'px';
            dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
            // Limita a altura máxima para caber no espaço disponível acima
            dropdown.style.maxHeight = spaceAbove + 'px';
        }
    
        // Ajusta classes se necessário
        ctn.classList.replace('rounded', 'rounded-b');
    });
    

    document.addEventListener('click', function (e) {
        if (!SelectLanguageContainer.contains(e.target)) {
            ctn.classList.replace('rounded-b', 'rounded');
            SelectLanguage.style.display = 'none';
        }
    });

    document.addEventListener('scroll', function (e) {
        if (!SelectLanguageContainer.contains(e.target)) {
            ctn.classList.replace('rounded-b', 'rounded');
            SelectLanguage.style.display = 'none';
        }
    });

    SelectLanguage.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const language = item.textContent.trim();
            const flag = item.querySelector('img').getAttribute('src');

            SelectLanguageContainer.querySelector('.placeholder-text.opacity-40.with-label').innerHTML = `
                <img class="inline-block select-none" title="${language}" src="${flag}" alt="${language} flag icon" width="24" height="24">
                <!---->
                ${language}
            `;
            
            SelectLanguageContainer.querySelector('.placeholder-text.opacity-40.with-label').classList.add('populated');
            SelectLanguageContainer.querySelector('.absolute.top-4.transition-label.with-placeholder').classList.add('populated');
            SelectLanguageContainer.classList.add('md-select--populated');

            SelectLanguage.style.display = 'none';
            ctn.classList.replace('rounded-b', 'rounded');

            if (language === 'Japanese') {
                is_japanese = true;
                Demography();
            } else {
                is_japanese = false;
                const SelectDemographyContainer = document.querySelector('#demography-container');

                SelectDemographyContainer.querySelector('.md-select-inner-wrap.rounded.block').classList.remove('cursor-pointer');
                SelectDemographyContainer.querySelector('.md-select__border').classList.add('disabled');
                SelectDemographyContainer.querySelector('.flex-grow.relative').classList.add('opacity-20');
            }
        });
    }) 
});

document.addEventListener('DOMContentLoaded', function () {
    const SelectClassificationContainer = document.querySelector('#tags-content-classification');
    const ctnClassification = SelectClassificationContainer.querySelector('div');
    const SelectClassification = SelectClassificationContainer.querySelector('#select-content-classification');

    console.log(SelectClassificationContainer);
    console.log(ctnClassification);
    console.log(SelectClassification);

    SelectClassificationContainer.addEventListener('click', function () {
        // Se já estiver aberto, fecha-o
        if (SelectClassification.style.display === 'block') {
            SelectClassification.style.display = 'none';
            if (ctnClassification) {
                ctnClassification.classList.replace('rounded-b', 'rounded');
            }
            return;
        }

        const rect = SelectClassificationContainer.getBoundingClientRect();
        const dropdown = SelectClassification;

        // Define left e width com base no container
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';

        // Exibe o dropdown para que possamos posicioná-lo corretamente
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            dropdown.style.display = 'block';
        }

        // Calcula o espaço disponível abaixo e acima do container
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Decide se usa 'top' ou 'bottom' para posicionar o dropdown
        if (spaceBelow >= spaceAbove) {
            // Se há mais espaço abaixo, posiciona usando 'top'
            dropdown.style.top = rect.bottom + 'px';
            dropdown.style.bottom = '';
        } else {
            // Se há mais espaço acima, posiciona usando 'bottom'
            dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
            dropdown.style.top = '';
        }

        // Ajusta as classes para efeito visual (se aplicável)
        if (ctnClassification) {
            ctnClassification.classList.replace('rounded', 'rounded-b');
        }
    });

    // Fecha o dropdown ao clicar fora dele
    document.addEventListener('click', function (e) {
        if (!SelectClassificationContainer.contains(e.target)) {
            if (ctnClassification) {
                ctnClassification.classList.replace('rounded-b', 'rounded');
            }
            SelectClassification.style.display = 'none';
        }
    });

    // Fecha o dropdown ao rolar a página
    document.addEventListener('scroll', function () {
        if (!SelectClassificationContainer.contains(event.target)) {
            if (ctnClassification) {
                ctnClassification.classList.replace('rounded-b', 'rounded');
            }
            SelectClassification.style.display = 'none';
        }
    });

    // Adiciona os listeners para cada uma das 4 opções de classificação
    SelectClassification.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const classification = item.textContent.trim();

            // Atualiza o placeholder com a opção selecionada
            const placeholder = SelectClassificationContainer.querySelector('.placeholder-text.opacity-40.with-label');
            if (placeholder) {
                placeholder.innerHTML = classification;
                placeholder.classList.add('populated');
            }
            const label = SelectClassificationContainer.querySelector('.absolute.top-4.transition-label.with-placeholder');
            if (label) {
                label.classList.add('populated');
            }
            SelectClassificationContainer.classList.add('md-select--populated');

            // Fecha o dropdown e restaura as classes do container
            SelectClassification.style.display = 'none';
            if (ctnClassification) {
                ctnClassification.classList.replace('rounded-b', 'rounded');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const SelectStatusContainer = document.querySelector('#tags-content-status');
    // Considera que há um <div> interno para ajustes visuais, semelhante aos outros
    const ctnStatus = SelectStatusContainer.querySelector('div');
    const SelectStatus = SelectStatusContainer.querySelector('#select-status-content');

    console.log(SelectStatusContainer);
    console.log(SelectStatus);

    SelectStatusContainer.addEventListener('click', function () {
        if (!SelectStatus) return;
        // Se já estiver aberto, fecha-o
        if (SelectStatus.style.display === 'block') {
            SelectStatus.style.display = 'none';
            if (ctnStatus) {
                ctnStatus.classList.replace('rounded-b', 'rounded');
            }
            return;
        }

        const rect = SelectStatusContainer.getBoundingClientRect();
        const dropdown = SelectStatus;

        // Define left e width com base no container (sem somar scroll)
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';

        // Exibe o dropdown para que possamos posicioná-lo
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            dropdown.style.display = 'block';
        }

        // Calcula os espaços disponíveis abaixo e acima do container
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Se há mais espaço abaixo, posiciona usando 'top', caso contrário usa 'bottom'
        if (spaceBelow >= spaceAbove) {
            dropdown.style.top = rect.bottom + 'px';
            dropdown.style.bottom = '';
        } else {
            dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
            dropdown.style.top = '';
        }

        // Ajusta a classe para efeito visual, se houver o elemento auxiliar
        if (ctnStatus) {
            ctnStatus.classList.replace('rounded', 'rounded-b');
        }
    });

    // Fecha o dropdown ao clicar fora dele
    document.addEventListener('click', function (e) {
        if (!SelectStatusContainer.contains(e.target)) {
            if (ctnStatus) {
                ctnStatus.classList.replace('rounded-b', 'rounded');
            }
            SelectStatus.style.display = 'none';
        }
    });

    // Fecha o dropdown ao rolar a página
    document.addEventListener('scroll', function () {
        if (!SelectStatusContainer.contains(event.target)) {
            if (ctnStatus) {
                ctnStatus.classList.replace('rounded-b', 'rounded');
            }
            SelectStatus.style.display = 'none';
        }
    });

    // Configura os listeners para as 4 opções
    SelectStatus.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const status = item.textContent.trim();

            // Atualiza o placeholder com a opção selecionada
            const placeholder = SelectStatusContainer.querySelector('.placeholder-text.opacity-40.with-label');
            if (placeholder) {
                placeholder.innerHTML = status;
                placeholder.classList.add('populated');
            }
            const label = SelectStatusContainer.querySelector('.absolute.top-4.transition-label.with-placeholder');
            if (label) {
                label.classList.add('populated');
            }
            SelectStatusContainer.classList.add('md-select--populated');

            // Fecha o dropdown e restaura as classes do container
            SelectStatus.style.display = 'none';
            if (ctnStatus) {
                ctnStatus.classList.replace('rounded-b', 'rounded');
            }

            if (status === 'Completed' || status === 'Cancelled') {
                end_chapter = true;
            } else {
                end_chapter = false;
            }
            Status();
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const TagsAllContainer = document.querySelector("#tags-container-all");
    // Seleciona todas as divs que possuem a classe "chip flex items-center"
    const chips = TagsAllContainer.querySelectorAll(".chip.flex.items-center");

    chips.forEach(chip => {
        chip.addEventListener("click", function () {
            this.classList.toggle("include"); // Alterna a classe 'include'
        });
    });

    // Comando para testar no console: test-all
    window.testAll = function () {
        console.log(t_script.tags.adding_include_class);
        
        chips.forEach(chip => {
            chip.classList.add("include");
        });

        setTimeout(() => {
            console.log(t_script.tags.removing_include_class);
            chips.forEach(chip => {
                chip.classList.remove("include");
            });
        }, 3000);
    };
});

document.addEventListener("DOMContentLoaded", function () {
    const YearContainer = document.querySelector('#year-container');
    const YearInput = YearContainer.querySelector('input');

    YearInput.addEventListener("input", function () {
        let value = this.value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
        if (value.length > 4) {
            value = value.slice(0, 4); // Limita a 4 caracteres
        }
        if (value.length > 0) {
            YearInput.parentElement.classList.add("md-populated"); // Adiciona classe se tiver texto
        } else {
            YearInput.parentElement.classList.remove("md-populated"); // Remove se estiver vazio
        }
        this.value = value;
    });
});

function Demography() {
    const SelectDemographyContainer = document.querySelector('#demography-container');
    const ctnDemography = SelectDemographyContainer.querySelector('div');
    const SelectDemography = SelectDemographyContainer.querySelector('#select-demography');
    
    console.log(SelectDemographyContainer);
    console.log(ctnDemography);
    console.log(SelectDemography);

    SelectDemographyContainer.querySelector('.md-select-inner-wrap.rounded.block').classList.add('cursor-pointer');
    SelectDemographyContainer.querySelector('.md-select__border.disabled').classList.remove('disabled');
    SelectDemographyContainer.querySelector('.flex-grow.relative.opacity-20').classList.remove('opacity-20');
    
    // Abre/fecha o dropdown ao clicar no container
    SelectDemographyContainer.addEventListener('click', function (e) {
        if (!is_japanese) return;

        // Se o clique for dentro do próprio dropdown, não alterna
        if (e.target.closest('#select-demography')) return;
        
        // Se o dropdown já estiver aberto, fecha-o
        if (SelectDemography.style.display === 'block') {
            SelectDemography.style.display = 'none';
            if (ctnDemography) {
                ctnDemography.classList.replace('rounded-b', 'rounded');
            }
            return;
        }
        
        // Caso contrário, abre o dropdown
        const rect = SelectDemographyContainer.getBoundingClientRect();
        const dropdown = SelectDemography;
        
        // Posiciona horizontalmente com base no container
        dropdown.style.left = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
        
        // Exibe o dropdown
        dropdown.style.display = 'block';
        
        // Para este dropdown, usaremos apenas 'top' para o posicionamento:
        dropdown.style.top = rect.bottom + 'px';
        dropdown.style.bottom = '';
        
        // Altera a classe para efeito visual (se existir o elemento auxiliar)
        if (ctnDemography) {
            ctnDemography.classList.replace('rounded', 'rounded-b');
        }
    });
    
    // Fecha o dropdown ao clicar fora do container
    document.addEventListener('click', function (e) {
        if (!SelectDemographyContainer.contains(e.target)) {
            if (ctnDemography) {
                ctnDemography.classList.replace('rounded-b', 'rounded');
            }
            SelectDemography.style.display = 'none';
        }
    });
    
    // Fecha o dropdown ao rolar a página
    document.addEventListener('scroll', function () {
        if (!SelectDemographyContainer.contains(event.target)) {
            if (ctnDemography) {
                ctnDemography.classList.replace('rounded-b', 'rounded');
            }
            SelectDemography.style.display = 'none';
        }
    });
    
    // Adiciona os listeners para cada uma das 5 opções
    // Supondo que cada opção esteja dentro de um <div> dentro do dropdown
    SelectDemography.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const demography = item.textContent.trim();
            
            // Atualiza o placeholder com a opção selecionada
            const placeholder = SelectDemographyContainer.querySelector('.placeholder-text.with-label.populated');
            if (placeholder) {
                placeholder.innerHTML = demography;
            }
            
            // Fecha o dropdown e restaura o estilo do container
            SelectDemography.style.display = 'none';
            if (ctnDemography) {
                ctnDemography.classList.replace('rounded-b', 'rounded');
            }
        });
    });
}

function Status() {
    const EndChapterContainer = document.querySelector('#end-chapter'); 

    console.log(EndChapterContainer);

    if (end_chapter) {
        EndChapterContainer.querySelectorAll(':scope > div').forEach(item => {
            const in_ = item.querySelector('input');
            item.classList.remove('md-disabled');
            in_.disabled = false;
        });
    } else {
        EndChapterContainer.querySelectorAll(':scope > div').forEach(item => {
            const in_ = item.querySelector('input');
            item.classList.add('md-disabled');
            in_.disabled = true;
        });
    }

    if (end_chapter) {
        EndChapterContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener("input", function () {
                let value = this.value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
                const parentDiv = input.closest(".md-inputwrap"); // Encontra a div pai mais próxima
                if (parentDiv) {
                    if (value.trim() !== "") {
                        parentDiv.classList.add("md-populated"); // Adiciona classe se tiver texto
                    } else {
                        parentDiv.classList.remove("md-populated"); // Remove se estiver vazio
                        this.value = "";
                    }
                }
            });
        });
    }
}

