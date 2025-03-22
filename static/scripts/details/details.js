let t = translations.downloads

document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');
    const reverseOrderBtn = document.createElement('button');
    reverseOrderBtn.textContent = t.reverse_button;
    reverseOrderBtn.className = 'reverse-order-btn';
    reverseOrderBtn.style.marginTop = "10px";

    let isReversed = false;

    reverseOrderBtn.addEventListener('click', function () {
        isReversed = !isReversed; // Alterna o estado
        const chapterList = document.getElementById('chapter-list');
        const chapters = Array.from(chapterList.children);
        chapterList.innerHTML = ''; // Limpa a lista
        const orderedChapters = isReversed ? chapters.reverse() : chapters;
        orderedChapters.forEach(chapter => chapterList.appendChild(chapter));
    });

    // Adicione o botão de inverter ordem na interface
    const buttonsContainer = document.querySelector('.buttons-container');
    buttonsContainer.appendChild(reverseOrderBtn);

    fetchMangaDetails(mangaId);

    const downloadAllBtn = document.getElementById('download-all-btn');
    let selectedLanguage = ''; // Variável para armazenar a linguagem selecionada

    downloadAllBtn.addEventListener('click', function () {
        showLoadingScreen();

        const mangaTitle = document.querySelector('#manga-title')?.textContent.trim() || t.unknown_title;

        const chapterData = [...document.querySelectorAll('.chapter-item')].map(item => {
            const groupIds = item.dataset.groups ? JSON.parse(item.dataset.groups) : [];
            return {
                chapterId: item.dataset.chapterId,
                translatedLanguage: item.dataset.translatedLanguage,
                chapterNumber: item.dataset.chapterNumber,
                volume: item.dataset.volume,
                mangaTitle: mangaTitle,
                mangaId: mangaId,
                groups: groupIds
            };
        });

        fetch('/api/download_chapters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chapters: chapterData })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            hideLoadingScreen();
        })
        .catch(error => {
            console.error(t.console_and_alert.console.download_chapter_error, error);
            hideLoadingScreen();
        });
    });

    function displayChapters(chapters, language) {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = ''; // Limpa a lista antes de adicionar novos capítulos

        if (!chapters || !Array.isArray(chapters)) {
            console.warn(t.console_and_alert.console.none_chapter);
            return;
        }

        // Ordenar capítulos por volume e número de capítulo
        const sortedChapters = chapters.sort((a, b) => {
            const volumeA = parseFloat(a.attributes.volume) || Infinity; // Sem volume vai para o final
            const volumeB = parseFloat(b.attributes.volume) || Infinity;

            if (volumeA !== volumeB) return volumeA - volumeB;

            const chapterA = parseFloat(a.attributes.chapter) || 0;
            const chapterB = parseFloat(b.attributes.chapter) || 0;

            return chapterA - chapterB;
        });

        let currentVolume = null;

        sortedChapters.forEach(chapter => {
            const volume = chapter.attributes.volume || t.no_volume;
            const groupNames = chapter.relationships
                .filter(rel => rel.type === 'scanlation_group')
                .map(group => group.attributes.name || t.unknown_group)
                .join(", ");

            if (volume !== currentVolume) {
                const volumeHeader = document.createElement('div');
                volumeHeader.className = 'volume-header';
                volumeHeader.textContent = volume === t.no_volume ? t.chapters_no_volume : `Volume ${volume}`;
                chapterList.appendChild(volumeHeader);
                currentVolume = volume;
            }

            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            chapterItem.innerHTML = `
                ${volume !== t.no_volume ? `Vol.${volume} ` : ""}Ch.${chapter.attributes.chapter || t.only}
                <br>
                <span class="group-names">${t.groups} ${groupNames}</span>
            `;
            chapterItem.dataset.chapterId = chapter.id;
            chapterItem.dataset.translatedLanguage = chapter.attributes.translatedLanguage;
            chapterItem.dataset.chapterNumber = chapter.attributes.chapter;
            chapterItem.dataset.volume = volume;

            // Adicionar evento de clique ao capítulo
            chapterItem.addEventListener('click', () => {
                const chapterId = chapterItem.dataset.chapterId;
                const mangaTitle = document.getElementById('manga-title').textContent;
                const translated = chapterItem.dataset.translatedLanguage;
                const chapterNumber = chapterItem.dataset.chapterNumber;
                const volume = chapterItem.dataset.volume || 'none';
        
                console.log(t.check_download_chapter, {
                    chapter_id: chapterId,
                    manga_title: mangaTitle,
                    translated: translated,
                    chapter: chapterNumber,
                    volume: volume
                });

                // Emitir evento para verificar se o capítulo foi baixado
                socket.emit('check_chapter_downloaded', {
                    chapter_id: chapterId,
                    manga_title: mangaTitle,
                    translated: translated,
                    chapter: chapterNumber,
                    volume: volume
                });
            });

            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'fi fi-rr-file-download';
            downloadIcon.title = 'Baixar';

            downloadIcon.addEventListener('click', () => {
                showLoadingScreen();

                fetch('/api/download_chapters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chapters: [{
                            chapterId: chapter.id,
                            translatedLanguage: chapter.attributes.translatedLanguage,
                            chapterNumber: chapter.attributes.chapter,
                            volume: chapter.attributes.volume,
                            mangaTitle: document.getElementById('manga-title').textContent,
                            mangaId: mangaId,
                            groups: groupNames.split(", ")
                        }]
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    hideLoadingScreen();
                })
                .catch(error => {
                    console.error(t.console_and_alert.console.download_chapter_error, error);
                    hideLoadingScreen();
                });
            });

            chapterItem.appendChild(downloadIcon);
            chapterList.appendChild(chapterItem);
        });
    }

    // Ouvir a resposta do servidor
    socket.on('chapter_downloaded', (data) => {
        if (!data.downloaded) {
            alert(t.console_and_alert.alert.chapter_not_downloaded);
            return;
        }

        if (!data.images || data.images.length === 0) {
            alert(t.console_and_alert.alert.not_images_for_chapter);
            return;
        }

        // Exibir o conteúdo do capítulo
        const chapterViewer = document.createElement('div');
        chapterViewer.className = 'chapter-viewer';
        chapterViewer.innerHTML = `
            <div class="chapter-content">
                <button class="close-viewer-btn">Fechar</button>
                <div class="chapter-header">
                    <h2>Volume ${data.volume || t.no_volume} - ${t.chapter} ${data.chapter || t.unknown}</h2>
                </div>
                <div class="image-container">
                    ${data.images.map(img => `<img src="/serve_image?filePath=${encodeURIComponent(img)}" class="chapter-image" alt="Página">`).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(chapterViewer);

        const closeBtn = chapterViewer.querySelector('.close-viewer-btn');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(chapterViewer);
        });
    });

    function fetchMangaDetails(mangaId) {
        fetch(`/api/manga/${mangaId}`)
            .then(response => response.json())
            .then(data => {
                displayMangaDetails(data);
                createLanguageButtons(data.availableTranslatedLanguages);
            })
            .catch(error => {
                console.error(t.console_and_alert.console.error_fetching_details, error);
                hideLoadingScreen();
            })
            .finally(() => {
                hideLoadingScreen();
            });
    }

    function displayMangaDetails(data) {
        document.getElementById('cover-image').src = data.cover_url;
        document.getElementById('manga-title').textContent = data.title;
        document.getElementById('manga-author').textContent = `${translations.downloads.author}: ${data.author}`;
        document.getElementById('manga-artist').textContent = `${translations.downloads.artist}: ${data.artist}`;
        document.getElementById('manga-status').textContent = `${translations.downloads.status}: ${data.status}`;
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

        fetch(`/api/manga/${mangaId}/chapters_with_groups?language=${language}`)
            .then(response => response.json())
            .then(data => {
                if (data.result === "ok") {
                    displayChapters(data.data, language);
                } else {
                    console.error(t.console_and_alert.console.error_get_chapters, data.message);
                }
            })
            .catch(error => {
                console.error(t.console_and_alert.console.error_fetching_chapters, error);
                hideLoadingScreen();
            })
            .finally(() => {
                hideLoadingScreen();
            });
    }

    function showLoadingScreen() {
        loadingScreen.style.display = 'flex';
    }

    function hideLoadingScreen() {
        loadingScreen.style.display = 'none';
    }
});
