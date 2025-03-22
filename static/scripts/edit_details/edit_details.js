document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');
    const chapterPopup = document.getElementById('chapter-popup');
    const container = document.querySelector('.container');
    const overlay = document.getElementById('overlay');

    // Elementos do modal de filtro
    const openFilterModalBtn = document.getElementById('open-filter-modal');
    const filterModal = document.getElementById('filter-modal');
    const filterCloseBtn = document.getElementById('filter-close-btn');
    const filterOverlay = document.getElementById('filter-overlay');
    const clearFiltersBtn = document.getElementById('clear-filters');

    // Elementos dos campos do filtro
    const filterChapterInput = document.getElementById('filter-chapter');
    // Removido: const filterGroupInput = document.getElementById('filter-group');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const deleteAllFilteredBtn = document.getElementById('delete-all-filtered');

    // Abre o modal de filtro com animação
    openFilterModalBtn.addEventListener('click', function () {
        filterModal.classList.remove('hide');
        filterOverlay.classList.remove('hide');

        filterModal.style.display = 'block';
        filterOverlay.style.display = 'block';

        // Força reflow para reiniciar a animação
        void filterModal.offsetWidth;

        filterModal.classList.add('show');
        filterOverlay.classList.add('show');
    });

    filterCloseBtn.addEventListener('click', closeFilterModal);
    filterOverlay.addEventListener('click', closeFilterModal);

    function closeFilterModal() {
        filterModal.classList.remove('show');
        filterOverlay.classList.remove('show');

        filterModal.classList.add('hide');
        filterOverlay.classList.add('hide');

        // Quando a animação terminar, define display: none
        filterModal.addEventListener('animationend', function handler(e) {
            if (e.animationName === 'modalFadeOut') {
                filterModal.style.display = 'none';
                filterModal.removeEventListener('animationend', handler);
            }
        });
        filterOverlay.addEventListener('animationend', function handler(e) {
            if (e.animationName === 'overlayFadeOut') {
                filterOverlay.style.display = 'none';
                filterOverlay.removeEventListener('animationend', handler);
            }
        });
    }

    // Botão "Limpar" no modal de filtro: limpa os campos e desmarca todos os checkboxes
    clearFiltersBtn.addEventListener('click', function () {
        filterChapterInput.value = '';
        filterDateStart.value = '';
        filterDateEnd.value = '';
        const checkboxes = document.querySelectorAll('.group-filter-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
    });

    applyFiltersBtn.addEventListener('click', function () {
        applyFilters();
        closeFilterModal();
    });

    // Carrega os dados iniciais
    showLoadingScreen();
    fetchMangaDetails(mangaId);

    let selectedLanguage = '';

    function fetchMangaDetails(mangaId) {
        fetch(`/api/manga/${mangaId}`)
            .then(response => response.json())
            .then(data => {
                displayMangaDetails(data);
                createLanguageButtons(data.availableTranslatedLanguages);
            })
            .catch(error => {
                console.error(translations.edits.console_and_alert.console.error_fetching_details, error);
                hideLoadingScreen();
            });
    }

    function displayMangaDetails(data) {
        document.getElementById('cover-image').src = data.cover_url;
        document.getElementById('manga-title').textContent = data.title;
        document.getElementById('manga-author').textContent = `${translations.edits.author}: ${data.author}`;
        document.getElementById('manga-artist').textContent = `${translations.edits.artist}: ${data.artist}`;
        document.getElementById('manga-status').textContent = `${translations.edits.status}: ${data.status}`;
        document.getElementById('manga-link').href = data.link;
        document.getElementById('manga-description').textContent = data.description;

        const tagsContainer = document.getElementById('manga-tags');
        tagsContainer.innerHTML = '';
        data.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.textContent = tag;
            tagElement.className = 'tag';
            tagsContainer.appendChild(tagElement);
        });
        hideLoadingScreen();
    }

    function createLanguageButtons(languages) {
        const buttonsContainer = document.getElementById('language-buttons');
        buttonsContainer.innerHTML = '';
        languages.forEach(language => {
            const button = document.createElement('button');
            button.textContent = language;
            button.className = 'language-btn';
            button.onclick = () => {
                selectedLanguage = language;
                fetchChapters(mangaId, language);
            };
            buttonsContainer.appendChild(button);
        });
    }

    function fetchChapters(mangaId, language) {
        showLoadingScreen();
        fetch(`/edit/api/manga/${mangaId}/aggregate?translatedLanguage=${language}`)
            .then(response => response.json())
            .then(data => {
                displayChapters(data.chapters, language);
            })
            .catch(error => {
                console.error(translations.edits.console_and_alert.console.error_fetching_chapters, error);
            })
            .finally(() => {
                hideLoadingScreen();
            });
    }

    function displayChapters(chapters, language) {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = '';
        chapterList.className = 'chapter-grid';

        // 1) Coletar todos os nomes de grupos (para criar os checkboxes)
        const groupSet = new Set();

        chapters.forEach(chapter => {
            const attributes = chapter.attributes;
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';

            // Monta string dos grupos
            let groupNames = "";
            if (chapter.relationships && chapter.relationships.length > 0) {
                const namesArray = chapter.relationships
                    .map(rel => rel.attributes?.name || "")
                    .filter(name => name);
                namesArray.forEach(n => groupSet.add(n));
                groupNames = namesArray.join(", ");
            }

            chapterItem.dataset.chapterId = chapter.id;
            chapterItem.dataset.chapterNumber = attributes.chapter || "";
            chapterItem.dataset.createdAt = attributes.createdAt || "";
            chapterItem.dataset.groupNames = groupNames;

            // Exibe os dados, incluindo data de criação e grupos
            chapterItem.innerHTML = `
                <span>
                    ${attributes.volume ? `Vol.${attributes.volume}` : ""} 
                    Ch.${attributes.chapter ? attributes.chapter : "Sem Número"} 
                    ${attributes.title ? `- ${attributes.title}` : ""}
                    <br>
                    <small>${attributes.createdAt ? new Date(attributes.createdAt).toLocaleDateString() : ""}</small>
                    <br>
                    <small>${groupNames}</small>
                </span>
            `;

            chapterList.appendChild(chapterItem);

            chapterItem.addEventListener('click', function () {
                showChapterDetails(chapter.id);
            });
        });

        buildGroupCheckboxes(groupSet);
    }

    /**
     * Cria checkboxes de grupos dentro do modal de filtro.
     * @param {Set<string>} groupSet - Conjunto de nomes de grupos.
     */
    function buildGroupCheckboxes(groupSet) {
        const groupContainer = document.getElementById('group-checkboxes');
        groupContainer.innerHTML = '';

        groupSet.forEach(groupName => {
            const label = document.createElement('label');
            label.classList.add('checkbox-label');

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = groupName;
            input.classList.add('group-filter-checkbox');

            label.appendChild(input);
            label.appendChild(document.createTextNode(" " + groupName));

            groupContainer.appendChild(label);
        });
    }

    // Função que aplica os filtros aos capítulos exibidos
    function applyFilters() {
        const chapterFilter = filterChapterInput.value.trim();
        const dateStart = filterDateStart.value;
        const dateEnd = filterDateEnd.value;

        // Pegar todos os checkboxes marcados
        const selectedGroups = Array.from(
            document.querySelectorAll('.group-filter-checkbox:checked')
        ).map(cb => cb.value.toLowerCase());

        const chapterItems = document.querySelectorAll('.chapter-item');
        chapterItems.forEach(item => {
            let show = true;

            // Filtro por capítulo (intervalo ou exato)
            if (chapterFilter) {
                if (chapterFilter.includes("-")) {
                    const [min, max] = chapterFilter.split("-").map(n => parseFloat(n.trim()));
                    const chapterNumber = parseFloat(item.dataset.chapterNumber);
                    if (isNaN(chapterNumber) || chapterNumber < min || chapterNumber > max) {
                        show = false;
                    }
                } else {
                    if (item.dataset.chapterNumber !== chapterFilter) {
                        show = false;
                    }
                }
            }

            // Filtro por grupos
            if (selectedGroups.length > 0) {
                const itemGroups = item.dataset.groupNames.toLowerCase().split(",").map(g => g.trim());
                const hasSomeGroup = selectedGroups.some(g => itemGroups.includes(g));
                if (!hasSomeGroup) show = false;
            }

            // Filtro por data
            if (dateStart || dateEnd) {
                const createdAt = item.dataset.createdAt;
                if (createdAt) {
                    const createdDate = new Date(createdAt);
                    if (dateStart) {
                        const startDate = new Date(dateStart);
                        if (createdDate < startDate) show = false;
                    }
                    if (dateEnd) {
                        const endDate = new Date(dateEnd);
                        endDate.setHours(23, 59, 59, 999);
                        if (createdDate > endDate) show = false;
                    }
                } else {
                    show = false;
                }
            }

            item.style.display = show ? "block" : "none";
        });
    }

    applyFiltersBtn.addEventListener('click', applyFilters);

    // Botão "Deletar Todos Filtrados"
    deleteAllFilteredBtn.addEventListener('click', function () {
        const confirmation = confirm("Você realmente deseja deletar todos os capítulos filtrados?");
        if (!confirmation) return;

        const chapterItems = document.querySelectorAll('.chapter-item');
        chapterItems.forEach(item => {
            if (item.style.display !== "none") {
                const chapterId = item.dataset.chapterId;
                fetch(`/delete_chapter/${chapterId}`, {
                    method: 'DELETE'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            item.remove();
                        } else {
                            alert(translations.edits.console_and_alert.alert.chapter_excluded_error);
                        }
                    })
                    .catch(error => {
                        console.error(translations.edits.console_and_alert.console.chapter_excluded_error_detail, error);
                        alert(translations.edits.console_and_alert.alert.chapter_excluded_error);
                    });
            }
        });
        closeFilterModal();
    });

    // Funções de modal de edição (chapter-popup) com animação
    function showChapterPopup() {
        chapterPopup.classList.remove('hide');
        chapterPopup.style.display = 'block';
        void chapterPopup.offsetWidth;
        chapterPopup.classList.add('show');
    }

    function closeChapterPopup() {
        chapterPopup.classList.remove('show');
        chapterPopup.classList.add('hide');
        chapterPopup.addEventListener('animationend', function handler() {
            chapterPopup.style.display = 'none';
            chapterPopup.removeEventListener('animationend', handler);
        });
        container.style.filter = '';
        overlay.style.display = 'none';
    }

    function showChapterDetails(chapterId) {
        fetch(`/get_chapter_details/${chapterId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const chapterData = data.data;
                    const popupContent = document.querySelector('.popup-content');
                    popupContent.innerHTML = `
                        <span id="popup-close-btn" class="popup-close-btn">&times;</span>
                        <h3>${translations.edits.modal.chapter.chapter_details || 'Detalhes do Capítulo'}</h3>
                        <p><strong>${translations.edits.modal.chapter.title || 'Título'}:</strong></p>
                        <p><input id="popup-title-input" type="text" placeholder="${translations.edits.modal.chapter.title || 'Título'}" value="${chapterData.title || ''}"></p>
                        <p><strong>${translations.edits.modal.chapter.volume || 'Volume'}:</strong></p>
                        <p><input id="popup-volume-input" type="text" placeholder="${translations.edits.modal.chapter.volume || 'Volume'}" value="${chapterData.volume || ''}"></p>
                        <p><strong>${translations.edits.modal.chapter.chapter || 'Capítulo'}:</strong></p>
                        <p><input id="popup-chapter-input" type="text" placeholder="${translations.edits.modal.chapter.chapter || 'Capítulo'}" value="${chapterData.chapter || ''}"></p>
                        <p><strong>${translations.edits.modal.chapter.group || 'Grupo'}:</strong></p>
                        <div class="cp-it">
                            <input id="popup-group-input" class="cp-it" type="text" placeholder="${translations.edits.modal.chapter.group || 'Grupo'}" autocomplete="off">
                            <ul id="popup-group-suggestions" class="suggestions-list"></ul>
                            <div id="popup-selected-groups" class="tags-container-group"></div>
                        </div>
                        <div class="popup-buttons">
                            <button id="delete-btn" class="delete-btn">${translations.edits.modal.chapter.exclude || 'Excluir'}</button>
                            <button id="cancel-btn" class="cancel-btn">${translations.edits.modal.chapter.cancel || 'Cancelar'}</button>
                            <button id="edit-btn" class="edit-btn">${translations.edits.modal.chapter.edit || 'Editar'}</button>
                        </div>
                    `;

                    if (chapterData.groups && chapterData.groups.length > 0) {
                        chapterData.groups.forEach(group => {
                            const [groupName, groupId] = group.match(/(.*)\s\((.*)\)/).slice(1, 3);
                            addPopupGroupTag(groupName, groupId);
                        });
                    }

                    const cancelBtn = document.getElementById('cancel-btn');
                    cancelBtn.addEventListener('click', closeChapterPopup);

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
                                    closeChapterPopup();
                                } else {
                                    alert(translations.edits.console_and_alert.alert.chapter_edited_error);
                                }
                            })
                            .catch(error => {
                                console.error(translations.edits.console_and_alert.console.chapter_edited_error_detail, error);
                                alert(translations.edits.console_and_alert.alert.chapter_edited_error);
                            });
                    });

                    const deleteBtn = document.getElementById('delete-btn');
                    deleteBtn.addEventListener('click', function () {
                        const confirmation = confirm(translations.edits.console_and_alert.alert.confirm_delete);
                        if (confirmation) {
                            fetch(`/delete_chapter/${chapterId}`, {
                                method: 'DELETE'
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        const chapterItem = document.querySelector(`[data-chapter-id="${chapterId}"]`);
                                        if (chapterItem) {
                                            chapterItem.remove();
                                        }
                                        closeChapterPopup();
                                    } else {
                                        alert(translations.edits.console_and_alert.alert.chapter_excluded_error);
                                    }
                                })
                                .catch(error => {
                                    console.error(translations.edits.console_and_alert.console.chapter_excluded_error_detail, error);
                                    alert(translations.edits.console_and_alert.alert.chapter_excluded_error);
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
                            return match ? match[2] : text;
                        });
                        if (existingTags.includes(id)) {
                            alert(translations.edits.console_and_alert.alert.group_already_added);
                            return;
                        }
                        const tag = document.createElement('div');
                        tag.className = 'tag-group';
                        tag.innerHTML = `<span>${name ? `${name} (${id})` : id}</span><span class="tag-close-btn">&times;</span>`;
                        tag.querySelector('.tag-close-btn').addEventListener('click', function () {
                            tagContainer.removeChild(tag);
                        });
                        tagContainer.appendChild(tag);
                    }

                    const popupCloseBtn = document.getElementById('popup-close-btn');
                    if (popupCloseBtn) {
                        popupCloseBtn.addEventListener('click', closeChapterPopup);
                    }

                    // Mostra o modal de edição com animação e aplica blur no fundo
                    showChapterPopup();
                    container.style.filter = 'blur(5px)';
                    overlay.style.display = 'block';
                } else {
                    console.error(translations.edits.console_and_alert.alert.error_get_details_chapters, data.error);
                }
            })
            .catch(error => {
                console.error(translations.edits.console_and_alert.alert.error_get_details_chapters, error);
            });
    }

    function showLoadingScreen() {
        loadingScreen.style.display = 'flex';
    }

    function hideLoadingScreen() {
        loadingScreen.style.display = 'none';
    }
});
