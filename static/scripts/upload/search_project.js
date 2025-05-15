let searchTimeoutProject;
let long_strip = false;

document.getElementById('project').addEventListener('input', function () {
    clearTimeout(searchTimeoutProject);

    const query = this.value.trim();
    const suggestionsList = document.getElementById('project-suggestions');
    const projectIdInput = document.getElementById('project-id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (query.length > 2) {
        if (uuidRegex.test(query)) {
            searchTimeoutProject = setTimeout(() => {
                fetch(`/search_projects_uuid?uuid=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data?.results?.title && data?.results?.id) {
                            document.getElementById('project').value = `${data.results.title}`;
                            projectIdInput.value = data.results.id;

                            console.log('Project Long Strip:', data.results.long_strip);
                            long_strip = data.results.long_strip;

                            if (data.results.long_strip) {
                                showNotifications([
                                    translations.upload.script.search_projects.project_long_strip,
                                    translations.upload.script.search_projects.recommended_tool
                                ]);
                            }

                            suggestionsList.innerHTML = '';
                            suggestionsList.style.display = 'none';
                        } else {
                            alert(translations.upload.script.search_projects.project_not_found);
                        }
                    })
                    .catch(error => {
                        console.error(translations.upload.script.search_projects.project_search_error, error);
                        alert(translations.upload.script.search_projects.project_search_error);
                    });
            }, 1000);
        } else {
            searchTimeoutProject = setTimeout(() => {
                fetch(`/search_projects?query=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        const suggestions = data.results.slice(0, 10);
                        suggestionsList.innerHTML = '';

                        suggestions.forEach(item => {
                            const listItem = document.createElement('li');
                            listItem.textContent = `${item.title} (${item.id})`;
                            listItem.setAttribute('data-project-long-strip', item.long_strip);
                            listItem.addEventListener('click', function () {
                                document.getElementById('project').value = item.title;
                                projectIdInput.value = item.id;

                                console.log('Project Long Strip:', item.long_strip);
                                long_strip = item.long_strip;

                                if (item.long_strip) {
                                    showNotifications([
                                        translations.upload.script.search_projects.project_long_strip,
                                        translations.upload.script.search_projects.recommended_tool
                                    ]);
                                }

                                suggestionsList.innerHTML = '';
                                suggestionsList.style.display = 'none';
                            });
                            suggestionsList.appendChild(listItem);
                        });

                        suggestionsList.style.display = 'block';
                    })
                    .catch(error => {
                        console.error(translations.upload.script.search_projects.project_search_error, error);
                        suggestionsList.innerHTML = `<li>${translations.upload.script.search_projects.project_search_error}</li>`;
                        suggestionsList.style.display = 'block';
                    });
            }, 1000);
        }
    } else {
        suggestionsList.innerHTML = '';
        suggestionsList.style.display = 'none';
    }
});

// Mostrar sugestões ao focar, se já existirem
document.getElementById('project').addEventListener('focus', function () {
    const suggestionsList = document.getElementById('project-suggestions');
    if (suggestionsList.children.length > 0) {
        suggestionsList.style.display = 'block';
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

function buscarProjetoPorUUID(uuid) {
    const projectIdInput = document.getElementById('project-id');
    const suggestionsList = document.getElementById('project-suggestions');
    fetch(`/search_projects_uuid?uuid=${uuid}`)
        .then(response => response.json())
        .then(data => {
            if (data?.results?.title && data?.results?.id) {
                document.getElementById('project').value = `${data.results.title} (${data.results.id})`;
                projectIdInput.value = data.results.id;

                console.log('Project Long Strip:', data.results.long_strip);
                long_strip = data.results.long_strip;

                if (data.results.long_strip) {
                    showNotifications([
                        translations.upload.script.search_projects.project_long_strip,
                        translations.upload.script.search_projects.recommended_tool
                    ]);
                }

                suggestionsList.innerHTML = '';
                suggestionsList.style.display = 'none';
            } else {
                alert(translations.upload.script.search_projects.project_not_found);
            }
        })
        .catch(error => {
            console.error(translations.upload.script.search_projects.project_search_error, error);
            alert(translations.upload.script.search_projects.project_search_error);
        });
}

window.addEventListener('load', function () {
    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('id');
    if (uuidParam) {
        buscarProjetoPorUUID(uuidParam);
    }
});
