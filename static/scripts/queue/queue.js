let isAutoScrollEnabled = true; // Auto-scroll está ativado por padrão
let appliedFilters = {
    names: [],
    statuses: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Configura os botões de navegação
    document.querySelector("button[onclick='showSection(\"downloads\")']").addEventListener('click', () => showSection('downloads'));
    document.querySelector("button[onclick='showSection(\"uploads\")']").addEventListener('click', () => showSection('uploads'));
});

document.addEventListener('keydown', function(event) {
    if (event.shiftKey && event.key === 'D') {
        window.location.href = "/download";
    }
});

document.addEventListener('keydown', function(event) {
    if (event.shiftKey && event.key === 'U') {
        window.location.href = "/upload";
    }
});

let isReversed = false; // Estado inicial do botão "Reverso"

function toggleReverse() {
    isReversed = !isReversed; // Alterna o estado

    const reverseBtn = document.getElementById('reverse-btn');
    if (isReversed) {
        reverseBtn.classList.remove('reverse-off');
        reverseBtn.classList.add('reverse-on');
    } else {
        reverseBtn.classList.remove('reverse-on');
        reverseBtn.classList.add('reverse-off');
    }

    socket.emit('get_queue_data');
}

function toggleAutoScroll() {
    isAutoScrollEnabled = !isAutoScrollEnabled; // Alterna o estado

    const autoScrollBtn = document.getElementById('auto-scroll-btn');
    if (isAutoScrollEnabled) {
        autoScrollBtn.classList.remove('auto-scroll-off');
        autoScrollBtn.classList.add('auto-scroll-on');

        const inProgressItem = document.querySelector('li[data-type][class="Processando"]');
        if (inProgressItem) {
            inProgressItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
    } else {
        autoScrollBtn.classList.remove('auto-scroll-on');
        autoScrollBtn.classList.add('auto-scroll-off');
    }
}

// Verifica a fila
socket.on("connect", function() { socket.emit('get_queue_data'); });
socket.on("check_queue_data", function() { socket.emit('get_queue_data'); });

socket.on("queue_data_send", function (data) {
    const downloadList = document.getElementById('download-list');
    const uploadList = document.getElementById('upload-list');
    let count_download = 0;
    let count_upload = 0;

    // Limpa as listas antes de popular
    downloadList.innerHTML = '';
    uploadList.innerHTML = '';

    // Populando a lista de downloads
    if (data.queue_download && data.queue_download.length > 0) {
        let downloadItems = isReversed ? [...data.queue_download].reverse() : data.queue_download;
        downloadItems.forEach(item => {
            if (item.status.showing == 1) {
                const listItem = createListItem(item.key, item, 'download');
                downloadList.appendChild(listItem);
                count_download++;
            }
        });
    } else {
        downloadList.innerHTML = `<li class="empty-message">${translations.queue.no_download_items}</li>`;
    }

    // Populando a lista de uploads
    if (data.queue_upload && data.queue_upload.length > 0) {
        let uploadItems = isReversed ? [...data.queue_upload].reverse() : data.queue_upload;
        uploadItems.forEach(item => {
            if (item.status.showing == 1) {
                const listItem = createListItem(item.key, item, 'upload');
                uploadList.appendChild(listItem);
                count_upload++;
            }
        });
    } else {
        uploadList.innerHTML = `<li class="empty-message">${translations.queue.no_upload_items}</li>`;
    }

    if (count_download === 0) {
        downloadList.innerHTML = `<li class="empty-message">${translations.queue.no_download_items}</li>`;
    }

    if (count_upload === 0) {
        uploadList.innerHTML = `<li class="empty-message">${translations.queue.no_upload_items}</li>`;
    }

    // Reaplicar os filtros após a atualização da lista
    filterItems();

    // Rolar para o item que está em progresso se o auto-scroll estiver ativado e visível
    if (isAutoScrollEnabled) {
        const inProgressItems = document.querySelectorAll('li[data-type][class="Processando"]');
        for (const item of inProgressItems) {
            if (item.style.display !== 'none') { // Verifica se o item está visível
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break; // Para no primeiro item visível
            }
        }
    }
});

socket.on("send_progress_update", function(data) {
    const li = document.querySelector(`li[data-key="${data.key}"]`);
    if (li) {
        const progressBar = li.querySelector('.progress-bar');
        progressBar.style.width = `${data.progress.percentage}%`;

        setTimeout(() => {
            if (data.progress.percentage === 100) {
                li.querySelector('.progress-bar-container').remove();
            }
        }, 1000);
    }
});

function createListItem(key, item, type) {
    const li = document.createElement('li');
    li.setAttribute('class', item.status.type); // Usando o campo 'type' de 'status'
    li.setAttribute('data-key', key);
    li.setAttribute('data-type', type);
    li.addEventListener('click', () => removeItem(type, key));

    const strong = document.createElement('strong');
    strong.textContent = item.project?.manga_title || 'Sem título'; // Obtendo o título do mangá

    const ul = document.createElement('ul');
    const scanNames = item.chapter?.groups?.map(group => group.name).join(', ') || 'Nenhuma scan'; // Nomes das scans

    ul.innerHTML = `
        <li>${translations.queue.script.main.language} ${item.chapter?.language || `${translations.queue.script.main.unknow}`}</li>
        <li>${translations.queue.script.main.chapter} ${item.chapter?.chapter || 'N/A'}</li>
        ${item.chapter?.volume ? `<li>Volume: ${item.chapter.volume}</li>` : ''}
        <li>${translations.queue.script.main.scan} ${scanNames}</li> <!-- Adicionando os nomes das scans -->
        <li>${translations.queue.script.main.status} ${item.status?.type || 'Indefinido'}</li>
        ${item.status?.detail ? `<li>${translations.queue.script.main.detail} ${item.status.detail}</li>` : ''}
        ${item.status?.error ? `<li>${translations.queue.script.main.error} ${item.status.error}</li>` : ''}
    `;

    // Adiciona barra de progresso para itens em processamento
    if (item.status?.type === 'Processando') {
        const progressBarContainer = document.createElement('div');
        progressBarContainer.classList.add('progress-bar-container');

        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        progressBar.style.width = `${item.status?.progress || 0}%`; // Largura inicial da barra

        progressBarContainer.appendChild(progressBar);
        li.appendChild(progressBarContainer);
    }

    li.appendChild(strong);
    li.appendChild(ul);

    return li;
}

function removeItem(type, key) {
    fetch('/delete_item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: type, key: key })
    })
    .then(response => {
        if (response.ok) {
            socket.emit('get_queue_data');
        } else {
            alert(translations.queue.console_and_alert.alert.error_delete_item);
        }
    })
    .catch(error => console.error(translations.queue.console_and_alert.console.delete_item_error, error));
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

socket.on("disconnect", () => {
    socket.emit('get_queue_data');
})

function openFilterModal() {
    let modal = document.getElementById("filter-modal");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10); // Animação de abertura

    // Primeiro, popula as checkboxes (recria as checkboxes).
    populateFilterNames();

    // Agora, re-checka as checkboxes que já estavam salvas em appliedFilters
    // 1) Nomes
    let nameCheckboxes = document.querySelectorAll(".filter-name");
    nameCheckboxes.forEach(cb => {
        if (appliedFilters.names.includes(cb.value)) {
            cb.checked = true;
        }
    });

    // 2) Status
    let statusCheckboxes = document.querySelectorAll(".filter-status");
    statusCheckboxes.forEach(cb => {
        if (appliedFilters.statuses.includes(cb.value)) {
            cb.checked = true;
        }
    });
}

function closeFilterModal() {
    let modal = document.getElementById("filter-modal");
    modal.classList.remove("show");
    setTimeout(() => modal.style.display = "none", 300); // Aguarda a animação antes de esconder
}

function clickOutsideToClose(event) {
    let modal = document.getElementById("filter-modal");
    let modalContent = document.querySelector(".modal-content");
    if (event.target === modal) {
        closeFilterModal();
    }
}

function populateFilterNames() {
    const filterNamesContainer = document.getElementById("filter-names");
    filterNamesContainer.innerHTML = "";

    let titleCounts = {}; // Armazena a contagem de cada obra

    // Percorre os títulos das obras na lista e conta quantas vezes aparecem
    document.querySelectorAll(".item-list li strong").forEach(titleElement => {
        let title = titleElement.textContent.trim();
        titleCounts[title] = (titleCounts[title] || 0) + 1;
    });

    // Adiciona os títulos ao modal com a contagem ao lado
    Object.entries(titleCounts).forEach(([title, count]) => {
        let label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" class="filter-name" value="${title}"> ${title} (${count})`;
        filterNamesContainer.appendChild(label);
    });

    populateFilterStatuses(); // Chama a função para atualizar os status
}

function populateFilterStatuses() {
    let statusCounts = { "Aguardando": 0, "Concluído": 0, "Cancelado": 0, "Erro": 0 }; 

    // Percorre os status na lista e conta quantas vezes aparecem (exceto "Processando")
    document.querySelectorAll(".item-list li").forEach(item => {
        let status = item.classList[0]; // A primeira classe define o status
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });

    // Atualiza os checkboxes do modal de status com a contagem
    document.querySelectorAll(".filter-status").forEach(checkbox => {
        let status = checkbox.value;
        if (status in statusCounts) {
            checkbox.parentElement.innerHTML = `<input type='checkbox' class='filter-status' value='${status}'> ${status} (${statusCounts[status]})`;
        }
    });
}

function applyFilter() {
    appliedFilters.names = Array.from(document.querySelectorAll(".filter-name:checked")).map(cb => cb.value);
    appliedFilters.statuses = Array.from(document.querySelectorAll(".filter-status:checked")).map(cb => cb.value);

    filterItems();
    closeFilterModal();
}

function filterItems() {
    // Remove qualquer .empty-message que tenha sido criada anteriormente
    document.querySelectorAll('.empty-message').forEach(msg => msg.remove());

    // Para cada lista (downloads e uploads)...
    document.querySelectorAll('.item-list').forEach(list => {
        // Seleciona todos os <li> que não são .empty-message
        let items = list.querySelectorAll('li:not(.empty-message)');
        let countVisible = 0;

        items.forEach(item => {
            // Pegando o título (nome da obra)
            let titleElement = item.querySelector('strong');
            let title = titleElement ? titleElement.textContent.trim() : '';

            // Pegando a linha que começa com "Status: "
            let statusLi = Array.from(item.querySelectorAll('ul li'))
                .find(li => li.textContent.trim().startsWith('Status: '));

            let statusText = statusLi
                ? statusLi.textContent.replace('Status: ', '').trim()
                : '';

            // Verifica se passa no filtro de nomes
            let matchesName = appliedFilters.names.length > 0
                ? appliedFilters.names.includes(title)
                : true;

            // Verifica se passa no filtro de status
            let matchesStatus = appliedFilters.statuses.length > 0
                ? appliedFilters.statuses.includes(statusText)
                : true;

            // Se corresponde ao filtro, exibe; senão, esconde
            if (matchesName && matchesStatus) {
                item.style.display = 'block';
                countVisible++;
            } else {
                item.style.display = 'none';
            }
        });

        // Se nenhum item ficou visível, adiciona a mensagem de "vazio"
        if (countVisible === 0) {
            let emptyLi = document.createElement('li');
            emptyLi.classList.add('empty-message');

            // Decide qual texto exibir, baseado no ID da lista
            if (list.id === "download-list") {
                emptyLi.textContent = translations.queue.no_download_items;
            } else if (list.id === "upload-list") {
                emptyLi.textContent = translations.queue.no_upload_items;
            } else {
                emptyLi.textContent = "Nenhum item encontrado para esse filtro.";
            }

            list.appendChild(emptyLi);
        }
    });
}