document.addEventListener("DOMContentLoaded", function () {
    const loadingScreen = document.getElementById('loading-screen');

    showLoadingScreen(); // Mostra a tela de carregamento no início

    fetchMangaDetails(mangaId);

    const downloadAllBtn = document.getElementById('download-all-btn');
    let selectedLanguage = ''; // Variável para armazenar a linguagem selecionada

    downloadAllBtn.addEventListener('click', function () {
        showLoadingScreen(); // Mostra a tela de carregamento durante o download
    
        // Obtém o título do mangá diretamente do elemento <h1 id="manga-title">
        const mangaTitle = document.querySelector('#manga-title')?.textContent.trim() || 'Título Desconhecido';
    
        // Mapeia todos os itens de capítulos e adiciona os dados necessários
        const chapterData = [...document.querySelectorAll('.chapter-item')].map(item => {
            const groupIds = item.dataset.groups ? JSON.parse(item.dataset.groups) : [];
            return {
                chapterId: item.dataset.chapterId,
                translatedLanguage: item.dataset.translatedLanguage,
                chapterNumber: item.dataset.chapterNumber,
                volume: item.dataset.volume,
                mangaTitle: mangaTitle, // Usa o título obtido do DOM
                groups: groupIds // Inclui o grupo como uma lista de IDs
            };
        });
    
        fetch('/api/download_chapters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chapters: chapterData }) // Envia todos os capítulos
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

    function displayChapters(chapters, language) {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = ''; // Limpa a lista antes de adicionar novos capítulos
    
        // Verifica se existem capítulos no formato esperado
        if (!chapters || !Array.isArray(chapters)) {
            console.warn("Nenhum capítulo encontrado ou formato inválido.");
            return;
        }
    
        // Ordenar capítulos por volume e número de capítulo
        const sortedChapters = chapters.sort((a, b) => {
            const volumeA = parseFloat(a.attributes.volume) || 0;
            const volumeB = parseFloat(b.attributes.volume) || 0;
    
            if (volumeA !== volumeB) {
                return volumeA - volumeB; // Ordena por volume
            }
    
            const chapterA = parseFloat(a.attributes.chapter) || 0;
            const chapterB = parseFloat(b.attributes.chapter) || 0;
    
            return chapterA - chapterB; // Ordena por capítulo
        });
    
        let currentVolume = null;
    
        sortedChapters.forEach(chapter => {
            const volume = chapter.attributes.volume; // Volume pode ser null ou undefined
    
            // Adiciona cabeçalho para o volume, se necessário e o volume existir
            if (volume && volume !== currentVolume) {
                const volumeHeader = document.createElement('div');
                volumeHeader.className = 'volume-header';
                volumeHeader.textContent = `Volume ${volume}`;
                chapterList.appendChild(volumeHeader);
    
                currentVolume = volume;
            }
    
            // Obtém os IDs dos grupos do capítulo
            const groupIds = chapter.relationships
                .filter(rel => rel.type === 'scanlation_group') // Filtra apenas relações de grupo
                .map(group => group.id); // Mapeia para uma lista de IDs
    
            // Criação do item do capítulo
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            chapterItem.textContent = `${volume ? `Vol.${volume} ` : ""}Ch.${chapter.attributes.chapter}`;
            chapterItem.dataset.chapterId = chapter.id;
            chapterItem.dataset.translatedLanguage = chapter.attributes.translatedLanguage;
            chapterItem.dataset.chapterNumber = chapter.attributes.chapter;
            chapterItem.dataset.volume = volume || ""; // Volume vazio para capítulos sem volume
    
            // Criação do ícone de download
            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'fi fi-rr-file-download'; // Classe do ícone (ou botão)
            downloadIcon.title = 'Baixar';
    
            // Adiciona evento de clique ao botão de download
            downloadIcon.addEventListener('click', () => {
                showLoadingScreen(); // Mostra a tela de carregamento
    
                fetch('/api/download_chapters', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chapters: [{
                            chapterId: chapter.id,
                            translatedLanguage: chapter.attributes.translatedLanguage,
                            chapterNumber: chapter.attributes.chapter,
                            volume: chapter.attributes.volume,
                            mangaTitle: document.getElementById('manga-title').textContent,
                            groups: groupIds // Sempre envia uma lista, vazia ou com IDs
                        }]
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data.message);
                    hideLoadingScreen(); // Oculta a tela de carregamento
                })
                .catch(error => {
                    console.error('Erro ao baixar capítulo:', error);
                    hideLoadingScreen();
                });
            });
    
            // Adiciona o botão de download ao item do capítulo
            chapterItem.appendChild(downloadIcon);
    
            // Adicionando o capítulo à lista
            chapterList.appendChild(chapterItem);
        });
    }
    
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
            })
            .finally(() => {
                hideLoadingScreen(); // Oculta a tela de carregamento após carregar os detalhes
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

        fetch(`/api/manga/${mangaId}/chapters_with_groups?language=${language}`)
            .then(response => response.json())
            .then(data => {
                if (data.result === "ok") {
                    displayChapters(data.data, language);
                } else {
                    console.error("Erro ao obter capítulos:", data.message);
                }
            })
            .catch(error => {
                console.error(translations.errorFetchingChapters, error);
                hideLoadingScreen(); // Oculta a tela de carregamento em caso de erro
            })
            .finally(() => {
                hideLoadingScreen(); // Oculta a tela de carregamento após carregar capítulos
            });
    }

    function showLoadingScreen() {
        loadingScreen.style.display = 'flex'; // Mostra a tela de carregamento
    }

    function hideLoadingScreen() {
        loadingScreen.style.display = 'none'; // Esconde a tela de carregamento
    }
});
