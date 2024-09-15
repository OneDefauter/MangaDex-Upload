document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');
    const chapterPopup = document.getElementById('chapter-popup');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const container = document.querySelector('.container'); // Seleciona a div com a classe container
    const overlay = document.getElementById('overlay'); // Seleciona o overlay

    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', function () {
            chapterPopup.style.display = 'none';
            container.style.filter = ''; // Remove o blur do fundo
            overlay.style.display = 'none'; // Esconde o overlay
        });
    }

    showLoadingScreen(); // Mostra a tela de carregamento no início

    fetchMangaDetails(mangaId);

    let selectedLanguage = ''; // Variável para armazenar a linguagem selecionada

    function fetchMangaDetails(mangaId) {
        fetch(`/api/manga/${mangaId}`)
            .then(response => response.json())
            .then(data => {
                displayMangaDetails(data);
                createLanguageButtons(data.availableTranslatedLanguages);
            })
            .catch(error => {
                console.error(translations.errorFetchingDetails, error);
                hideLoadingScreen(); // Oculta a tela de carregamento em caso de erro
            });
    }

    function displayMangaDetails(data) {
        document.getElementById('cover-image').src = data.cover_url;
        document.getElementById('manga-title').textContent = data.title;
        document.getElementById('manga-author').textContent = `${translations.author}: ${data.author}`;
        document.getElementById('manga-artist').textContent = `${translations.artist}: ${data.artist}`;
        document.getElementById('manga-status').textContent = `${translations.status}: ${data.status}`;
        document.getElementById('manga-link').href = data.link;
        document.getElementById('manga-description').textContent = data.description;

        const tagsContainer = document.getElementById('manga-tags');
        tagsContainer.innerHTML = ''; // Limpar tags anteriores
        data.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.textContent = tag;
            tagElement.className = 'tag';
            tagsContainer.appendChild(tagElement);
        });
        hideLoadingScreen(); // Oculta a tela de carregamento após carregar os detalhes
    }

    function createLanguageButtons(languages) {
        const buttonsContainer = document.getElementById('language-buttons');
        buttonsContainer.innerHTML = ''; // Limpar botões anteriores
        languages.forEach(language => {
            const button = document.createElement('button');
            button.textContent = language;
            button.className = 'language-btn';
            button.onclick = () => {
                selectedLanguage = language; // Atualiza a linguagem selecionada
                fetchChapters(mangaId, language);
            };
            buttonsContainer.appendChild(button);
        });
    }

    function fetchChapters(mangaId, language) {
        showLoadingScreen(); // Mostra a tela de carregamento durante a busca de capítulos

        fetch(`/edit/api/manga/${mangaId}/aggregate?translatedLanguage=${language}`)
            .then(response => response.json())
            .then(data => {
                displayChapters(data.chapters, language);
            })
            .catch(error => {
                console.error(translations.errorFetchingChapters, error);
            })
            .finally(() => {
                hideLoadingScreen(); // Oculta a tela de carregamento após carregar capítulos
            });
    }

    function displayChapters(chapters, language) {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = ''; // Limpa a lista antes de adicionar novos capítulos
    
        // Adiciona a classe 'chapter-grid' ao contêiner
        chapterList.className = 'chapter-grid';
    
        // Iterar diretamente sobre os capítulos recebidos
        chapters.forEach(chapter => {
            const attributes = chapter.attributes;
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            
            // Usando o ID exclusivo do capítulo para garantir que cada capítulo seja tratado separadamente
            chapterItem.innerHTML = `
                <span>
                    ${attributes.volume ? `Vol.${attributes.volume}` : ""} 
                    Ch.${attributes.chapter ? attributes.chapter : "Sem Número"} 
                    ${attributes.title ? `- ${attributes.title}` : ""}
                </span>
            `;
            chapterItem.dataset.chapterId = chapter.id; // Armazena o ID do capítulo
            chapterList.appendChild(chapterItem);
    
            // Adiciona evento de clique para exibir o pop-up
            chapterItem.addEventListener('click', function () {
                showChapterDetails(chapter.id);
            });
        });
    }    

    function showChapterDetails(chapterId) {
        fetch(`/get_chapter_details/${chapterId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const chapterData = data.data;

                    const popupContent = document.querySelector('.popup-content');
                    popupContent.innerHTML = `
                        <span id="popup-close-btn">&times;</span>
                        <h3>${translations.chapter_details || 'Detalhes do Capítulo'}</h3>
                        <p><strong>${translations.title || 'Título'}:</strong></p>
                        <p><input id="popup-title-input" type="text" placeholder="${translations.title || 'Título'}" value="${chapterData.title || ''}"></p>
                        <p><strong>${translations.volume || 'Volume'}:</strong></p>
                        <p><input id="popup-volume-input" type="text" placeholder="${translations.volume || 'Volume'}" value="${chapterData.volume || ''}"></p>
                        <p><strong>${translations.chapter || 'Capítulo'}:</strong></p>
                        <p><input id="popup-chapter-input" type="text" placeholder="${translations.chapter || 'Capítulo'}" value="${chapterData.chapter || ''}"></p>
                        <p><strong>${translations.group || 'Grupo'}:</strong></p>
                        <p class="cp-it">
                            <input id="popup-group-input" class="cp-it" type="text" placeholder="${translations.group || 'Grupo'}" autocomplete="off">
                            <ul id="popup-group-suggestions" class="suggestions-list"></ul>
                            <div id="popup-selected-groups" class="tags-container-group"></div>
                        </p>
                        <!-- Adicionando os botões -->
                        <div class="popup-buttons">
                            <button id="delete-btn" class="delete-btn">${translations.exclude || 'Excluir'}</button>
                            <button id="cancel-btn" class="cancel-btn">${translations.cancel || 'Cancelar'}</button>
                            <button id="edit-btn" class="edit-btn">${translations.edit || 'Editar'}</button>
                        </div>
                    `;

                    if (chapterData.groups && chapterData.groups.length > 0) {
                        chapterData.groups.forEach(group => {
                            const [groupName, groupId] = group.match(/(.*)\s\((.*)\)/).slice(1, 3);
                            addPopupGroupTag(groupName, groupId);
                        });
                    }

                    // Função para fechar o pop-up (Cancel button)
                    const cancelBtn = document.getElementById('cancel-btn');
                    cancelBtn.addEventListener('click', function () {
                        closePopup();  // Mesma função do botão de fechar
                    });

                    // Função para editar o capítulo (Edit button)
                    const editBtn = document.getElementById('edit-btn');
                    editBtn.addEventListener('click', function () {
                        const updatedChapter = {
                            title: document.getElementById('popup-title-input').value,
                            volume: document.getElementById('popup-volume-input').value,
                            chapter: document.getElementById('popup-chapter-input').value,
                            groups: Array.from(document.querySelectorAll('.tag-group span')).map(span => span.textContent),
                            version: chapterData.version
                        };

                        fetch(`/edit_chapter/${chapterId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updatedChapter)
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // alert(translations.chapter_edited_success);
                                closePopup(); // Fecha o pop-up após edição bem-sucedida
                            } else {
                                alert(translations.chapter_edited_error);
                            }
                        })
                        .catch(error => {
                            console.error(translations.chapter_edited_error_detail, error);
                            alert(translations.chapter_edited_error);
                        });
                    });

                    // Função para excluir o capítulo (Delete button)
                    const deleteBtn = document.getElementById('delete-btn');
                    deleteBtn.addEventListener('click', function () {
                        const confirmation = confirm(translations.confirm_delete);
                        if (confirmation) {
                            fetch(`/delete_chapter/${chapterId}`, {
                                method: 'DELETE'
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    alert(translations.chapter_excluded_success);

                                    // Encontra o item da lista de capítulos pelo ID do capítulo e remove-o
                                    const chapterItem = document.querySelector(`[data-chapter-id="${chapterId}"]`);
                                    if (chapterItem) {
                                        chapterItem.remove();  // Remove o item da lista do DOM
                                    }

                                    closePopup(); // Fecha o pop-up após exclusão bem-sucedida
                                } else {
                                    alert(translations.chapter_excluded_error);
                                }
                            })
                            .catch(error => {
                                console.error(translations.chapter_excluded_error_detail, error);
                                alert(translations.chapter_excluded_error);
                            });
                        }
                    });

                    const groupInput = document.getElementById('popup-group-input');
                    groupInput.addEventListener('input', function () {
                        const query = this.value.trim();
                        if (query.length > 2) {
                            fetch(`/search_groups?query=${query}`)
                                .then(response => response.json())
                                .then(data => {
                                    const suggestions = data.results.slice(0, 10);
                                    const suggestionsList = document.getElementById('popup-group-suggestions');
                                    suggestionsList.innerHTML = '';

                                    suggestions.forEach(item => {
                                        const listItem = document.createElement('li');
                                        listItem.textContent = `${item.name} (${item.id})`;
                                        listItem.addEventListener('click', function () {
                                            addPopupGroupTag(item.name, item.id);
                                            groupInput.value = '';
                                            suggestionsList.innerHTML = '';
                                        });
                                        suggestionsList.appendChild(listItem);
                                    });
                                });
                        }
                    });

                    groupInput.addEventListener('keydown', function (event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const query = this.value.trim();
                            if (query) {
                                const match = query.match(/^(.*?)\s*\((.*?)\)$/);
                                const name = match ? match[1] : null;
                                const id = match ? match[2] : query;

                                addPopupGroupTag(name, id);
                                this.value = '';
                            }
                        }
                    });

                    function addPopupGroupTag(name, id) {
                        const tagContainer = document.getElementById('popup-selected-groups');
                        
                        const existingTags = Array.from(tagContainer.querySelectorAll('.tag-group span')).map(span => {
                            const text = span.textContent.trim();
                            const match = text.match(/^(.*?)\s*\((.*?)\)$/);
                            return match ? match[2] : text; // Retorna o ID da tag
                        });
                        
                        if (existingTags.includes(id)) {
                            alert(translations.group_already_added);
                            return; // Não adiciona duplicatas
                        }
                        
                        const tag = document.createElement('div');
                        tag.className = 'tag-group';
                        tag.innerHTML = `<span>${name ? `${name} (${id})` : id}</span><span class="tag-close-btn">&times;</span>`;
                        
                        // Adiciona o evento de clique para remover a tag
                        tag.querySelector('.tag-close-btn').addEventListener('click', function () {
                            tagContainer.removeChild(tag);
                        });
                        
                        tagContainer.appendChild(tag);
                    }

                    const popupCloseBtn = document.getElementById('popup-close-btn');
                    if (popupCloseBtn) {
                        popupCloseBtn.addEventListener('click', function () {
                            chapterPopup.style.display = 'none';
                            container.style.filter = ''; // Remove o blur do fundo
                            overlay.style.display = 'none'; // Esconde o overlay
                        });
                    }

                    chapterPopup.style.display = 'block';
                    container.style.filter = 'blur(5px)'; // Adiciona o blur ao fundo
                    overlay.style.display = 'block'; // Mostra o overlay
                } else {
                    console.error(translations.error_get_details_chapters, data.error);
                }
            })
            .catch(error => {
                console.error(translations.error_get_details_chapters, error);
            });
    }

    function closePopup() {
        chapterPopup.style.display = 'none';
        container.style.filter = ''; // Remove o blur do fundo
        overlay.style.display = 'none'; // Esconde o overlay
    }

    function showLoadingScreen() {
        loadingScreen.style.display = 'flex'; // Mostra a tela de carregamento
    }

    function hideLoadingScreen() {
        loadingScreen.style.display = 'none'; // Esconde a tela de carregamento
    }
});
