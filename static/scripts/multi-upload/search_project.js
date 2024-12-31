document.getElementById('project').addEventListener('input', function () {
    const query = this.value;
    const suggestionsList = document.getElementById('project-suggestions');
    const projectIdInput = document.getElementById('project-id');
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';
    if (query.length > 2) {
        fetch(`/search_projects?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const suggestions = data.results.slice(0, 10);
                suggestionsList.innerHTML = '';

                suggestions.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.title} (${item.id})`;
                    listItem.setAttribute('data-project-long-strip', item.long_strip); // Usar o valor enviado pelo backend
                    listItem.addEventListener('click', function () {
                        document.getElementById('project').value = item.title;
                        projectIdInput.value = item.id;
                
                        console.log('Project Long Strip:', item.long_strip); // Exibir no console

                        if (!isAndroid && item.long_strip) {
                            showNotifications([translations.long_strip_tag]);
                            showNotifications([translations.recommended_tool]);
                        }

                        suggestionsList.innerHTML = '';
                        suggestionsList.style.display = 'none';
                    });
                    suggestionsList.appendChild(listItem);
                });

                suggestionsList.style.display = 'block'; // Mostrar sugestões
            })
            .catch(error => {
                console.error(`${translations.project_search_error}:`, error);
                suggestionsList.innerHTML = '<li>${translations.project_search_error}</li>';
                suggestionsList.style.display = 'block';
            });
    } else {
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none'; // Ocultar se a entrada for menor que 3 caracteres
    }
});

// Ocultar sugestões ao clicar fora
document.addEventListener('click', (event) => {
    const suggestionsList = document.getElementById('project-suggestions');
    if (!document.getElementById('project').contains(event.target) &&
        !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = 'none';
    }
});
