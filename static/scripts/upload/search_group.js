let searchTimeoutGroup;

document.getElementById('group').addEventListener('input', function () {
    clearTimeout(searchTimeoutGroup);

    const query = this.value.trim();
    const suggestionsList = document.getElementById('group-suggestions');
    const language = document.getElementById('language').value.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (query.length > 2) {
        if (uuidRegex.test(query)) {
            searchTimeoutGroup = setTimeout(() => {
                fetch(`/search_groups_uuid?uuid=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data?.results?.attributes?.name && data?.results?.id) {
                            addGroupTag(data.results.attributes.name, data.results.id);
                            document.getElementById('group').value = '';
                            suggestionsList.innerHTML = '';
                            suggestionsList.style.display = 'none';
                        } else {
                            alert(translations.upload.script.search_groups.group_not_found);
                        }
                    })
                    .catch(error => {
                        console.error(`${translations.upload.script.search_groups.group_search_error}:`, error);
                        alert(translations.upload.script.search_groups.group_search_error);
                        document.getElementById('group').value = '';
                        suggestionsList.innerHTML = '';
                        suggestionsList.style.display = 'none';
                    });
            }, 1000);
        } else {
            searchTimeoutGroup = setTimeout(() => {
                fetch(`/search_groups?query=${query}&language=${language}`)
                    .then(response => response.json())
                    .then(data => {
                        const suggestions = data.results.slice(0, 10);
                        suggestionsList.innerHTML = '';

                        suggestions.forEach(item => {
                            const listItem = document.createElement('li');
                            listItem.textContent = `${item.name} (${item.id})`;
                            listItem.dataset.id = item.id;
                            listItem.addEventListener('click', function () {
                                addGroupTag(item.name, item.id);
                                document.getElementById('group').value = '';
                                suggestionsList.innerHTML = '';
                                suggestionsList.style.display = 'none';
                            });
                            suggestionsList.appendChild(listItem);
                        });

                        suggestionsList.style.display = 'block';
                    })
                    .catch(error => {
                        console.error(`${translations.upload.script.search_groups.group_search_error}:`, error);
                        suggestionsList.innerHTML = `<li>${translations.upload.script.search_groups.group_search_error}</li>`;
                        suggestionsList.style.display = 'block';
                    });
            }, 1000);
        }
    } else {
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none';
    }
});

// Suporte ao Enter para adicionar manualmente
document.getElementById('group').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const query = this.value.trim();
        if (query) {
            const match = query.match(/^(.*?)\s*\((.*?)\)$/);
            const name = match ? match[1] : null;
            const id = match ? match[2] : query;

            addGroupTag(name, id);
            this.value = '';
            document.getElementById('group-suggestions').innerHTML = '';
            document.getElementById('group-suggestions').style.display = 'none';
        }
    }
});

function addGroupTag(name, id) {
    const tagContainer = document.getElementById('selected-groups');
    
    // Verifica se o ID já está presente
    const existingTags = Array.from(tagContainer.querySelectorAll('.tag span')).map(span => {
        const text = span.textContent.trim();
        const match = text.match(/^(.*?)\s*\((.*?)\)$/);
        return match ? match[2] : text; // Retorna o ID da tag
    });

    if (existingTags.includes(id)) {
        alert(translations.upload.console_and_alert.alert.group_already_added);
        return; // Não adiciona duplicatas
    }

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<span>${name ? `${name} (${id})` : id}</span><i class="fi fi-rr-cross-small"></i>`;

    // Adiciona o evento de clique para remover a tag
    tag.querySelector('i').addEventListener('click', function () {
        tagContainer.removeChild(tag);
    });

    tagContainer.appendChild(tag);
}

// Mostrar sugestões ao focar, se já existirem
document.getElementById('group').addEventListener('focus', function () {
    const suggestionsList = document.getElementById('group-suggestions');
    if (suggestionsList.children.length > 0) {
        suggestionsList.style.display = 'block';
    }
});

// Ocultar sugestões ao clicar fora
document.addEventListener('click', (event) => {
    const suggestionsList = document.getElementById('group-suggestions');
    if (!document.getElementById('group').contains(event.target) &&
        !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
    }
});
