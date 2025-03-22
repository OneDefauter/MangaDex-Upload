document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const resultsContainer = document.getElementById("results-container");
    const paginationContainer = document.querySelector(".pagination");
    const prevPageBtn = document.getElementById("prev-btn");
    const nextPageBtn = document.getElementById("next-btn");
    const pageNumbersContainer = document.querySelector(".page-numbers");
    const loadingScreen = document.getElementById("loading-overlay");
    const progressContainer = document.querySelector('.progress');
    const progressBar = document.getElementById('progressBar');

    let currentPage = 1;
    let totalPages = 1;
    let allResults = [];
    let hasMoreResults = false; // Indica se há mais resultados
    let searchTimeout;

    progressBar.style.width = '0%';
    progressContainer.style.opacity = '0'; // Oculta a barra

    // Converte max_results_page para número
    const maxResultsPerPage = parseInt(max_results_page, 10);

    hidePagination();

    const savedState = sessionStorage.getItem('searchState');

    if (savedState) {
        const state = JSON.parse(savedState);

        // Restaura o estado salvo
        searchInput.value = state.query;
        allResults = state.results;
        currentPage = state.page;
        totalPages = state.totalPages;
        hasMoreResults = state.hasMore;

        displayResultsForPage(currentPage);
        showPagination();
        updatePagination();
    }

    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length > 0) {
            sessionStorage.removeItem('searchState');

            searchTimeout = setTimeout(() => {
                showLoadingScreen();
                fetchAllManga(query);
            }, 1000);
        } else {
            resultsContainer.innerHTML = "";
            hideLoadingScreen();
            hidePagination();
        }
    });

    prevPageBtn.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            displayResultsForPage(currentPage);
            updatePagination();
        }
    });

    nextPageBtn.addEventListener("click", function () {
        if (hasMoreResults && currentPage === totalPages) {
            fetchAdditionalResults();
        } else if (currentPage < totalPages) {
            currentPage++;
            displayResultsForPage(currentPage);
            updatePagination();
        }
    });

    // Adiciona navegação por teclado
    document.addEventListener("keydown", function (event) {
        const { key, shiftKey, altKey, ctrlKey } = event;

        if (key === "ArrowRight") {
            if (shiftKey) {
                // Shift + Seta Direita: pula 5 páginas para frente
                currentPage = Math.min(currentPage + 5, totalPages);
                displayResultsForPage(currentPage);
                updatePagination();
            } else if (altKey && ctrlKey) {
                // Alt + Ctrl + Seta Direita: vai para a última página
                currentPage = totalPages;
                displayResultsForPage(currentPage);
                updatePagination();
            } else if (currentPage < totalPages) {
                // Apenas Seta Direita: avança uma página
                currentPage++;
                displayResultsForPage(currentPage);
                updatePagination();
            } else if (hasMoreResults) {
                // Seta Direita na última página com "Carregar mais"
                fetchAdditionalResults();
            }
        } else if (key === "ArrowLeft") {
            if (shiftKey) {
                // Shift + Seta Esquerda: pula 5 páginas para trás
                currentPage = Math.max(currentPage - 5, 1);
                displayResultsForPage(currentPage);
                updatePagination();
            } else if (altKey && ctrlKey) {
                // Alt + Ctrl + Seta Esquerda: vai para a primeira página
                currentPage = 1;
                displayResultsForPage(currentPage);
                updatePagination();
            } else if (currentPage > 1) {
                // Apenas Seta Esquerda: volta uma página
                currentPage--;
                displayResultsForPage(currentPage);
                updatePagination();
            }
        }
    });

    function fetchAllManga(query) {
        // Limpa as obras da pesquisa anterior
        allResults = [];
        resultsContainer.innerHTML = "";
        hidePagination();

        const url = `/api/search?title=${encodeURIComponent(query)}&offset=0&limit=${maxResultsPerPage}`;

        showLoadingScreen();
    
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.mangas && data.mangas.length > 0) {
                    allResults = data.mangas;
                    totalPages = Math.ceil(data.totalResults / maxResultsPerPage);
                    currentPage = 1;
                    hasMoreResults = data.hasMore;

                    // Salva o estado no sessionStorage
                    saveStateToSession(query, currentPage, allResults, totalPages, hasMoreResults);

                    displayResultsForPage(currentPage);
                    showPagination();
                    updatePagination();
                } else {
                    resultsContainer.innerHTML = `<p>${translations.search.no_results}</p>`;
                    hidePagination();
                }
            })
            .catch(error => {
                console.error("Erro na requisição:", error);
                resultsContainer.innerHTML = `<p>${translations.search.search_error}</p>`;
                hidePagination();
            })
            .finally(() => {
                hideLoadingScreen();
            });
    }

    function fetchAdditionalResults() {
        const offset = allResults.length;
        const url = `/api/search?title=${encodeURIComponent(searchInput.value.trim())}&offset=${offset}&limit=${maxResultsPerPage}`;

        showLoadingScreen();

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.mangas && data.mangas.length > 0) {
                    allResults = [...allResults, ...data.mangas];
                    totalPages = Math.ceil(allResults.length / maxResultsPerPage);
                    hasMoreResults = data.hasMore;

                    displayResultsForPage(currentPage);
                    updatePagination();

                    saveStateToSession(searchInput.value.trim(), currentPage, allResults, totalPages, hasMoreResults);
                } else {
                    hasMoreResults = false;
                    updatePagination();
                }
            })
            .catch(error => {
                console.error("Erro na requisição:", error);
            })
            .finally(() => {
                hideLoadingScreen();

                // Faz a página subir para o topo
                scrollToTop();
            });
    }

    function displayResultsForPage(page) {
        const start = (page - 1) * maxResultsPerPage;
        const end = start + maxResultsPerPage;

        allResults.forEach((manga, index) => {
            const mangaId = manga.id;
            let mangaElement = document.querySelector(`.manga-result[data-manga-id="${mangaId}"]`);

            if (mangaElement) {
                const isVisible = index >= start && index < end;
                mangaElement.style.display = isVisible ? "block" : "none";
                mangaElement.dataset.show = isVisible;
            } else {
                mangaElement = document.createElement("div");
                mangaElement.className = "manga-result";
                mangaElement.dataset.mangaId = mangaId;
                mangaElement.dataset.page = Math.ceil((index + 1) / maxResultsPerPage);
                mangaElement.dataset.show = index >= start && index < end;

                mangaElement.innerHTML = `
                    <img src="${manga.cover_url}" alt="${manga.title}" class="cover-image">
                    <h3>${manga.title}</h3>
                `;

                mangaElement.style.display = mangaElement.dataset.show === "true" ? "block" : "none";

                mangaElement.addEventListener("click", function () {
                    const mangaId = this.dataset.mangaId;
                    if (mode === "download") {
                        window.location.href = `/details/${mangaId}`;
                    } else {
                        window.location.href = `/edit_details/${mangaId}`;
                    }
                });

                resultsContainer.appendChild(mangaElement);
            }
        });
    }

    function updatePagination() {
        const maxVisiblePages = 5;
        pageNumbersContainer.innerHTML = "";

        const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        for (let i = startPage; i <= endPage; i++) {
            const pageNumber = document.createElement("span");
            pageNumber.textContent = i;

            if (i === currentPage) {
                pageNumber.classList.add("current-page");
            }

            pageNumber.onclick = function () {
                currentPage = i;
                displayResultsForPage(currentPage);
                updatePagination();
            };

            pageNumbersContainer.appendChild(pageNumber);
        }

        if (startPage > 1) {
            const prevDots = document.createElement("span");
            prevDots.textContent = "...";
            prevDots.classList.add("dots");
            prevDots.onclick = function () {
                currentPage = Math.max(1, startPage - maxVisiblePages);
                displayResultsForPage(currentPage);
                updatePagination();
            };
            pageNumbersContainer.insertBefore(prevDots, pageNumbersContainer.firstChild);
        }

        if (endPage < totalPages) {
            const nextDots = document.createElement("span");
            nextDots.textContent = "...";
            nextDots.classList.add("dots");
            nextDots.onclick = function () {
                currentPage = Math.min(totalPages, endPage + maxVisiblePages);
                displayResultsForPage(currentPage);
                updatePagination();
            };
            pageNumbersContainer.appendChild(nextDots);
        }

        prevPageBtn.style.opacity = currentPage === 1 ? "0.5" : "1";
        prevPageBtn.style.pointerEvents = currentPage === 1 ? "none" : "auto";
        prevPageBtn.disabled = currentPage === 1;

        if (currentPage === totalPages && hasMoreResults) {
            nextPageBtn.textContent = translations.search.load_more;
            nextPageBtn.style.pointerEvents = "auto";
            nextPageBtn.disabled = false;
        } else if (currentPage < totalPages) {
            nextPageBtn.textContent = translations.search.next;
            nextPageBtn.style.pointerEvents = "auto";
            nextPageBtn.disabled = false;
        } else {
            nextPageBtn.style.pointerEvents = "none";
            nextPageBtn.disabled = true;
        }

        // Faz a página subir para o topo
        scrollToTop();
    }

    function showPagination() {
        paginationContainer.style.display = "flex";
    }

    function hidePagination() {
        paginationContainer.style.display = "none";
    }

    function showLoadingScreen() {
        searchInput.disabled = true;
        loadingScreen.style.display = "flex";
        progressContainer.style.opacity = '0';
    }

    function hideLoadingScreen() {
        searchInput.disabled = false;
        loadingScreen.style.display = "none";
        progressBar.style.width = '0%';
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: "smooth" // Faz a rolagem suave
        });
    }

    function saveStateToSession(query, page, results, totalPages, hasMore) {
        const state = {
            query,
            page,
            results,
            totalPages,
            hasMore
        };
        sessionStorage.setItem('searchState', JSON.stringify(state));
    }    

    socket.on('progress_update_search', (data) => {
        // Verifica se o progresso é maior que 0%
        if (data.percentage > 0) {
            progressContainer.style.opacity = '1'; // Mostra a barra com fade-in
        } else {
            progressContainer.style.opacity = '0'; // Oculta a barra
        }

        console.log(`${translations.search.progress} ${data.percentage}% (${data.completed}/${data.total})`);
        progressBar.style.width = `${data.percentage}%`;
    });
});
