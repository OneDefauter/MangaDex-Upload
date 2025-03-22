let searchTimeoutProject;
let long_strip = false;

document.getElementById('project').addEventListener('input', function () {
    // Cancela qualquer timeout pendente para evitar múltiplas requisições
    clearTimeout(searchTimeoutProject);

    const query = this.value.trim();
    const suggestionsList = document.getElementById('project-suggestions');
    const projectIdInput = document.getElementById('project-id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (query.length > 2) {
        if (uuidRegex.test(query)) {
            searchTimeoutProject = setTimeout(() => {
                // Se for UUID, busca o projeto diretamente
                fetch(`/search_projects_uuid?uuid=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.results.title && data.results.id) {
                            document.getElementById('project').value = data.results.title + ` (${data.results.id})`;
                            projectIdInput.value = data.results.id;

                            updateProjectTitle(data.results.title);

                            console.log('Project Long Strip:', data.results.long_strip); // Exibir no console
                            long_strip = long_strip;

                            if (data.results.long_strip) {
                                showNotifications([t.script.search_projects.long_strip_tag]);
                                showNotifications([t.script.search_projects.recommended_tool]);
                            }

                            suggestionsList.innerHTML = '';
                            suggestionsList.style.display = 'none';
                        } else {
                            alert(t.script.search_projects.project_not_found); // Alerta se o UUID não for encontrado
                        }
                    })
                    .catch(error => {
                        console.error(`${t.script.search_projects.project_search_error}:`, error);
                        alert(t.script.search_projects.project_search_error);
                    });
                }, 1000);
        } else {
            searchTimeoutProject = setTimeout(() => {
                // Caso contrário, busca sugestões
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
                                long_strip = long_strip;

                                if (item.long_strip) {
                                    showNotifications([t.script.search_projects.long_strip_tag]);
                                    showNotifications([t.script.search_projects.recommended_tool]);
                                }

                                suggestionsList.innerHTML = '';
                                suggestionsList.style.display = 'none';
                            });
                            suggestionsList.appendChild(listItem);
                        });

                        suggestionsList.style.display = 'block'; // Mostrar sugestões
                    })
                    .catch(error => {
                        console.error(`${t.script.search_projects.project_search_error}:`, error);
                        suggestionsList.innerHTML = `<li>${t.script.search_projects.project_search_error}</li>`;
                        suggestionsList.style.display = 'block';
                    });
            }, 1000);
        }
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

// Função para buscar projeto pelo UUID (utilizada tanto no input quanto na verificação de query string)
function buscarProjetoPorUUID(uuid) {
    const projectIdInput = document.getElementById('project-id');
    const suggestionsList = document.getElementById('project-suggestions');
    fetch(`/search_projects_uuid?uuid=${uuid}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.results.title && data.results.id) {
                document.getElementById('project').value = data.results.title + ` (${data.results.id})`;
                projectIdInput.value = data.results.id;

                updateProjectTitle(data.results.title);

                console.log('Project Long Strip:', data.results.long_strip);
                // Aqui você pode definir a variável "long_strip" conforme o retorno do backend
                long_strip = data.results.long_strip;

                if (data.results.long_strip) {
                    showNotifications([t.script.search_projects.long_strip_tag]);
                    showNotifications([t.script.search_projects.recommended_tool]);
                }

                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
            } else {
                alert(t.script.search_projects.project_not_found);
            }
        })
        .catch(error => {
            console.error(`${t.script.search_projects.project_search_error}:`, error);
            alert(t.script.search_projects.project_search_error);
        });
}

// Verificar se há um parâmetro "id" na URL e, se houver, realizar a busca ao carregar a página
window.addEventListener('load', function() {
    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('id');
    if (uuidParam) {
        // Chama a função para buscar o projeto pelo UUID
        buscarProjetoPorUUID(uuidParam);
    }
});