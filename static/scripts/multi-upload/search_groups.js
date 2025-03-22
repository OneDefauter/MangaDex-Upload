let searchTimeoutGroup;

document.getElementById('scan-group').addEventListener('input', function () {
    clearTimeout(searchTimeoutGroup);
    const query = this.value.trim();
    const suggestionsList = document.getElementById('scan-suggestions');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const language = document.getElementById('language').value.trim(); // Obtém o idioma selecionado

    if (query.length > 2) {
        if (uuidRegex.test(query)) {
            searchTimeoutGroup = setTimeout(() => {
                // Se for UUID, adiciona o grupo diretamente
                fetch(`/search_groups_uuid?uuid=${query}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.results.attributes.name && data.results.id) {
                        addScanTag(data.results.attributes.name, data.results.id);
                        document.getElementById('scan-group').value = ''; // Limpa o campo de entrada
                        suggestionsList.innerHTML = '';
                        suggestionsList.style.display = 'none'; // Ocultar se a entrada for menor que 3 caracteres
                    } else {
                        alert(t.script.search_groups.group_not_found); // Mostra alerta se o UUID não for encontrado
                    }
                })
                .catch(error => {
                    console.error(`${t.script.search_groups.group_search_error}:`, error);
                    alert(t.script.search_groups.group_search_error);
                    document.getElementById('scan-group').value = ''; // Limpa o campo de entrada
                    suggestionsList.innerHTML = '';
                    suggestionsList.style.display = 'none'; // Ocultar se a entrada for menor que 3 caracteres
                });
            }, 1000);
        } else {
            searchTimeoutGroup = setTimeout(() => {
                // Caso contrário, busca grupos e exibe sugestões
                fetch(`/search_groups?query=${query}&language=${language}`)
                .then(response => response.json())
                .then(data => {
                    const suggestions = data.results.slice(0, 10);
                    suggestionsList.innerHTML = '';

                    suggestions.forEach(item => {
                        const listItem = document.createElement('li');
                        listItem.textContent = item.name;
                        listItem.dataset.id = item.id; // Armazena o ID como atributo de dados
                        listItem.addEventListener('click', function () {
                            clearTimeout(searchTimeoutGroup); // **Evita a execução do timeout pendente**
                            addScanTag(item.name, item.id);
                            document.getElementById('scan-group').value = '';
                            suggestionsList.innerHTML = ''; // Limpa as sugestões
                        });
                        suggestionsList.appendChild(listItem);
                    });

                    suggestionsList.style.display = 'block'; // Mostrar sugestões
                })
                .catch(error => {
                    console.error(`${t.script.search_groups.group_search_error}:`, error);
                    suggestionsList.innerHTML = `<li>${t.script.search_groups.group_search_error}</li>`;
                    suggestionsList.style.display = 'block';
                });
            }, 1000);
        }
    } else {
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none'; // Ocultar se a entrada for menor que 3 caracteres
    }
});

// Função para adicionar uma tag ao contêiner
function addScanTag(name, id) {
    const tagContainer = document.getElementById('selected-groups');

    // Verifica se o ID já está presente
    const existingTags = Array.from(tagContainer.querySelectorAll('.tag span')).map(span => {
        return span.dataset.id; // Retorna o ID da tag
    });

    if (existingTags.includes(id)) {
        alert(t.script.search_groups.group_already_added);
        return; // Não adiciona duplicatas
    }

    // Verificar se o nome já contém o ID para evitar duplicação
    const displayName = name.includes(id) ? name : `${name} (${id})`;

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<span data-id="${id}">${displayName}</span><i class="fi fi-rr-cross-small"></i>`;

    // Adiciona o evento de clique para remover a tag
    tag.querySelector('i').addEventListener('click', function () {
        tagContainer.removeChild(tag);
    });

    tagContainer.appendChild(tag);
}

// Ocultar sugestões ao clicar fora
document.addEventListener('click', (event) => {
    const suggestionsList = document.getElementById('scan-suggestions');
    if (!document.getElementById('scan-group').contains(event.target) &&
        !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
    }
});
