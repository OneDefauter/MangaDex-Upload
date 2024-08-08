document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');

    showLoadingScreen(); // Mostra a tela de carregamento no início

    fetchMangaDetails(mangaId);

    const downloadAllBtn = document.getElementById('download-all-btn');
    let selectedLanguage = ''; // Variável para armazenar a linguagem selecionada

    downloadAllBtn.addEventListener('click', function () {
        showLoadingScreen(); // Mostra a tela de carregamento durante o download

        const chapterData = [...document.querySelectorAll('.chapter-item')].map(item => ({
            chapterId: item.dataset.chapterId,
            translatedLanguage: item.dataset.translatedLanguage, // Certifique-se de que isto é definido
            chapterNumber: item.dataset.chapterNumber,
            volume: item.dataset.volume,
            mangaTitle: item.dataset.mangaTitle
        }));

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
            hideLoadingScreen(); // Oculta a tela de carregamento após o download
        })
        .catch(error => {
            console.error('Erro ao baixar capítulos:', error);
            hideLoadingScreen(); // Também oculta a tela de carregamento em caso de erro
        });
    });

    function fetchMangaDetails(mangaId) {
        fetch(`/api/manga/${mangaId}`)
            .then(response => response.json())
            .then(data => {
                displayMangaDetails(data);
                createLanguageButtons(data.availableTranslatedLanguages);
            })
            .catch(error => console.error('Erro ao buscar detalhes do mangá:', error))
            .finally(() => {
                hideLoadingScreen(); // Oculta a tela de carregamento após carregar os detalhes
            });
    }

    function displayMangaDetails(data) {
        document.getElementById('cover-image').src = data.cover_url;
        document.getElementById('manga-title').textContent = data.title;
        document.getElementById('manga-author').textContent = `Autor: ${data.author}`;
        document.getElementById('manga-artist').textContent = `Artista: ${data.artist}`;
        document.getElementById('manga-status').textContent = `Status: ${data.status}`;
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

        fetch(`/api/manga/${mangaId}/aggregate?translatedLanguage=${language}`)
            .then(response => response.json())
            .then(data => {
                displayChapters(data.chapters, language);
                createDownloadAllButton(data.chapters);
            })
            .catch(error => console.error('Erro ao buscar capítulos:', error))
            .finally(() => {
                hideLoadingScreen(); // Oculta a tela de carregamento após carregar capítulos
            });
    }

    function displayChapters(chapters, language) {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = ''; // Limpa a lista antes de adicionar novos capítulos
    
        // Ordenar volumes numericamente
        const sortedVolumes = Object.keys(chapters).sort((a, b) => parseFloat(a) - parseFloat(b));
    
        sortedVolumes.forEach(volume => {
            const volumeData = chapters[volume].chapters;
    
            // Ordenar capítulos numericamente
            const sortedChapters = Object.keys(volumeData).sort((a, b) => parseFloat(a) - parseFloat(b));
    
            sortedChapters.forEach(chapterNum => {
                const chapter = volumeData[chapterNum];
                const chapterItem = document.createElement('div');
                chapterItem.className = 'chapter-item';
                chapterItem.textContent = `Vol.${volume} Ch.${chapterNum}`;
                chapterItem.dataset.chapterId = chapter.id; // Armazena o ID do capítulo
                chapterItem.dataset.translatedLanguage = language; // Armazena o idioma selecionado
                chapterItem.dataset.chapterNumber = chapterNum; // Armazena o número do capítulo
                chapterItem.dataset.volume = volume; // Armazena o volume
                chapterItem.dataset.mangaTitle = document.getElementById('manga-title').textContent; // Armazena o título do mangá
                chapterList.appendChild(chapterItem);
            });
        });
    }

    function showLoadingScreen() {
        loadingScreen.style.display = 'flex'; // Mostra a tela de carregamento
    }

    function hideLoadingScreen() {
        loadingScreen.style.display = 'none'; // Esconde a tela de carregamento
    }
});
