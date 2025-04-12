document.addEventListener('DOMContentLoaded', function () {
    const loadingOverlay = document.getElementById('loading-overlay');
    const workInput = document.getElementById('workInput');
    let timer = null;

    const resultModal = document.getElementById('resultModal');
    const mainResult = document.getElementById('mainResult');
    const otherResults = document.getElementById('otherResults');
    const closeModal = document.querySelector('.modal .close');
    const createWorkBtn = document.getElementById('createWorkBtn');

    // Verifica se existe o parâmetro "id" na URL
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) {
        // Emula o comportamento do input: envia o id para o socket e exibe o overlay de loading
        socket.emit('search_project_manga_updates', { data: idParam });
        loadingOverlay.style.display = 'flex';
        console.log(t.script.sended + idParam);
        workInput.value = '';
    }

    function openResultModal() {
        resultModal.style.display = 'flex';
    }

    function closeResultModal() {
        resultModal.style.display = 'none';
        mainResult.innerHTML = '';
        otherResults.innerHTML = '';
    }

    closeModal.addEventListener('click', closeResultModal);
    window.addEventListener('click', function (e) {
        if (e.target === resultModal) closeResultModal();
    });

    createWorkBtn.addEventListener('click', function () {
        openDraftModal();
    });

    function extractId(input) {
        const regex = /(?:https?:\/\/)?(?:www\.)?mangaupdates\.com\/series\/([a-zA-Z0-9]{7})/;
        const match = input.match(regex);
        return match ? match[1] : null;
    }

    workInput.addEventListener('focus', function () {
        workInput.classList.remove('invalid');
    });

    workInput.addEventListener('keyup', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            let value = workInput.value.trim();
            if (value !== '') {
                const extractedId = extractId(value);
                if (extractedId) {
                    value = extractedId;
                } else {
                    const idRegex = /^[a-zA-Z0-9]{7}$/;
                    if (!idRegex.test(value)) {
                        console.log(t.script.input_error);
                        workInput.classList.add('invalid', 'shake');
                        setTimeout(() => {
                            workInput.classList.remove('shake');
                        }, 2000);
                        return;
                    }
                }
                socket.emit('search_project_manga_updates', { data: value });
                loadingOverlay.style.display = 'flex';
                console.log(t.script.sended + value);
                workInput.value = '';
            }
        }, 1000);
    });

    socket.on('search_response', function (data) {
        mainResult.innerHTML = '';
        otherResults.innerHTML = '';
        loadingOverlay.style.display = 'none';
        MangaUpdates = data.MangaUpdates;
        OriginalLanguage = data.original_language;

        if (data.obra_existe) {
            let html = `
              <div class="result-item large" data-id="${data.obra_existe.id}">
                  <div class="image">
                      <img src="${data.obra_existe.cover_url}" alt="${data.obra_existe.title}">
                  </div>
                  <div class="details">
                      <h2>${data.obra_existe.title}</h2>
                      <p><strong>${t.script.status}</strong> ${data.obra_existe.data.attributes.status}</p>
                      <p><strong>${t.script.year}</strong> ${data.obra_existe.data.attributes.year || 'N/A'}</p>
                      <p><strong>${t.script.original_language}</strong> ${data.obra_existe.data.attributes.originalLanguage}</p>
                      <p>${data.obra_existe.data.attributes.description.en || ''}</p>
                  </div>
              </div>
          `;
            mainResult.innerHTML = html;
        }

        if (
            data.obra_existe &&
            data?.attributes?.links?.mu &&
            data.obra_existe.data?.attributes?.links?.mu &&
            data.attributes.links.mu === data.obra_existe.data.attributes.links.mu
        ) {
            let htmlList = '';
            data.md_search_results.forEach(function (manga) {
                if (data.obra_existe && manga.data.attributes.links.mu === data.obra_existe.data.attributes.links.mu) {
                    return;
                }
                htmlList += `
                  <div class="result-item small" data-id="${manga.id}">
                      <div class="image">
                          <img src="${manga.cover_url}" alt="${manga.title}">
                      </div>
                      <div class="details">
                          <h3>${manga.title}</h3>
                          <p><strong>${t.script.status}</strong> ${manga.data.attributes.status}</p>
                          <p><strong>${t.script.year}</strong> ${manga.data.attributes.year || 'N/A'}</p>
                          <p><strong>${t.script.original_language}</strong> ${manga.data.attributes.originalLanguage || 'N/A'}</p>
                      </div>
                  </div>
              `;
            });
            otherResults.innerHTML = htmlList;
        }

        // Adiciona evento de clique nos resultados para abrir nova aba
        document.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', function () {
                const mangaId = this.getAttribute('data-id');
                if (mangaId) {
                    window.open(`https://mangadex.org/title/${mangaId}`, '_blank');
                }
            });
        });

        openResultModal();
    });

    // Exemplo usando fetch:
    function openDraftModal() {
        sessionStorage.setItem("draftData", JSON.stringify(MangaUpdates));
        sessionStorage.setItem("draftDataOriginalLanguage", JSON.stringify(OriginalLanguage));
        window.location.href = '/create-draft';
    }
});

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Mínima distância (em pixels) para considerar que foi um swipe
const swipeThreshold = 50;

document.addEventListener('touchstart', function (event) {
    // Considera apenas o primeiro toque
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}, false);

document.addEventListener('touchend', function (event) {
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;
    handleGesture();
}, false);

function handleGesture() {
    // Se estiver focado em um input ou textarea, não ativa o atalho
    const tagName = document.activeElement.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
        return;
    }

    // Calcula a diferença entre o início e o fim do toque
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Se a diferença horizontal for maior que a vertical e maior que o limiar:
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0) {
            // Swipe para a direita
            console.log(t.script.swipe_right);
            // Exemplo: abrir nova guia com o link desejado
            window.open('https://www.mangaupdates.com/series/advanced-search', '_blank');
        }
    }
}

document.addEventListener('keydown', function (e) {
    // Verifica se a tecla Alt está pressionada e se a tecla pressionada é "p" (ignorando maiúsculas/minúsculas)
    if (e.altKey && e.key.toLowerCase() === 'p') {
        window.open('https://www.mangaupdates.com/series/advanced-search', '_blank');
    }
});
