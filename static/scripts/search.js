document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const resultsContainer = document.getElementById("results-container");
    const paginationContainer = document.querySelector(".pagination");
    const prevPageBtn = document.getElementById("prev-btn");
    const nextPageBtn = document.getElementById("next-btn");
    const pageNumbersContainer = document.querySelector(".page-numbers");
    const loadingScreen = document.getElementById("loading-screen");
    
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout; // Timeout para controlar o delay
    let allResults = []; // Armazena todos os resultados carregados

    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout); // Limpa o timeout anterior
        currentPage = 1; // Reseta a página quando uma nova busca é iniciada
        const query = searchInput.value.trim();

        // Define um novo timeout para buscar o mangá após 500ms
        if (query.length > 0) {
            searchTimeout = setTimeout(() => {
                showLoadingScreen();
                fetchAllManga(query);
            }, 1000);
        } else {
            resultsContainer.innerHTML = ""; // Limpa resultados se não houver texto
            paginationContainer.style.display = "none"; // Esconde paginação se não houver resultados
            prevPageBtn.style.display = "none"; // Esconde paginação
            nextPageBtn.style.display = "none"; // Esconde paginação
        }
    });

    nextPageBtn.addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            displayResultsForPage(currentPage);
            updatePagination(currentPage, totalPages);
        }
    });

    prevPageBtn.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            displayResultsForPage(currentPage);
            updatePagination(currentPage, totalPages);
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "ArrowRight" && currentPage < totalPages) {
            currentPage++;
            displayResultsForPage(currentPage);
            updatePagination(currentPage, totalPages);
        } else if (event.key === "ArrowLeft" && currentPage > 1) {
            currentPage--;
            displayResultsForPage(currentPage);
            updatePagination(currentPage, totalPages);
        }
    });

    function fetchAllManga(query) {
        fetch(`/api/search?title=${encodeURIComponent(query)}&page=1`)
            .then(response => response.json())
            .then(data => {
                if (data.mangas && data.mangas.length > 0) {
                    allResults = data.mangas;
                    totalPages = Math.ceil(data.totalResults / 12); // Calcula páginas com base em 12 resultados por página
                    displayResultsForPage(1);
                    prevPageBtn.style.display = "block"; // Mostra paginação
                    nextPageBtn.style.display = "block"; // Mostra paginação
                    updatePagination(currentPage, totalPages);
                } else {
                    resultsContainer.innerHTML = `<p>${translations.noResults}</p>`;
                    paginationContainer.style.display = "none"; // Esconde paginação se não houver resultados
                    prevPageBtn.style.display = "none"; // Esconde paginação
                    nextPageBtn.style.display = "none"; // Esconde paginação
                }
            })
            .catch(error => {
                console.error('Erro na requisição:', error);
                resultsContainer.innerHTML = `<p>${translations.searchError}</p>`;
            })
            .finally(() => {
                hideLoadingScreen();
            });
    }

    function displayResultsForPage(page) {
        const start = (page - 1) * 12;
        const end = start + 12;
        const resultsToShow = allResults.slice(start, end);

        resultsContainer.innerHTML = "";
        resultsToShow.forEach((manga) => {
            const mangaElement = document.createElement("div");
            mangaElement.className = "manga-result";
            mangaElement.dataset.mangaId = manga.id; // Adiciona o ID do mangá
    
            mangaElement.innerHTML = `
                <img src="${manga.cover_url}" alt="${manga.title}" class="cover-image">
                <h3>${manga.title}</h3>
            `;
            
            mangaElement.addEventListener("click", function () {
                const mangaId = this.dataset.mangaId;
                if (mode === 'download') {
                    window.location.href = `/details/${mangaId}`; // Redireciona para a página de detalhes
                } else {
                    window.location.href = `/edit_details/${mangaId}`; // Redireciona para a página de detalhes
                }
            });
    
            resultsContainer.appendChild(mangaElement);
        });
    }    

    function updatePagination(currentPage, totalPages) {
        pageNumbersContainer.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const pageNumber = document.createElement("span");
            pageNumber.textContent = i;
            if (i === currentPage) {
                pageNumber.classList.add('current-page'); // Adiciona a classe à página atual
            }
            pageNumber.onclick = function () {
                if (i !== currentPage) {
                    currentPage = i;
                    displayResultsForPage(i);
                    updatePagination(currentPage, totalPages); // Atualiza a paginação após mudar a página
                }
            };
            pageNumbersContainer.appendChild(pageNumber);
        }

        // Show or hide pagination based on the total pages
        paginationContainer.style.display = totalPages > 1 ? "flex" : "none";

        // Enable or disable the buttons based on current page
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    function showLoadingScreen() {
        searchInput.disabled = true; // Desabilita o campo de entrada
        loadingScreen.style.display = 'flex';
    }

    function hideLoadingScreen() {
        searchInput.disabled = false; // Habilita novamente o campo de entrada
        loadingScreen.style.display = 'none';
    }
});
