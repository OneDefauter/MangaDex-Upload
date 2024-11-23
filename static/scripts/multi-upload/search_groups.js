document.getElementById('scan-group').addEventListener('input', function () {
    const query = this.value.trim();
    const suggestionsList = document.getElementById('scan-suggestions');
    if (query.length > 2) {
        fetch(`/search_groups?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const suggestions = data.results.slice(0, 10);
                suggestionsList.innerHTML = '';

                suggestions.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item.name;
                    listItem.dataset.id = item.id; // Armazena o ID como atributo de dados
                    listItem.addEventListener('click', function () {
                        addScanTag(item.name, item.id);
                        document.getElementById('scan-group').value = '';
                        suggestionsList.innerHTML = ''; // Limpa as sugestões
                    });
                    suggestionsList.appendChild(listItem);
                });

                suggestionsList.style.display = 'block'; // Mostrar sugestões
            })
            .catch(error => {
                console.error('${translations.group_search_error}:', error);
                suggestionsList.innerHTML = '<li>${translations.group_search_error}</li>';
                suggestionsList.style.display = 'block';
            });
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
        alert(translations.group_already_added);
        return; // Não adiciona duplicatas
    }

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<span data-id="${id}">${name}</span><i class="fi fi-rr-cross-small"></i>`;

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
