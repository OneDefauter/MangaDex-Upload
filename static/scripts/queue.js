document.addEventListener('DOMContentLoaded', () => {
    updateQueue();

    setInterval(updateQueue, 5000); // Atualiza a lista a cada 5 segundos

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

function updateQueue() {
    fetch('/get_queue_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        const downloadList = document.getElementById('download-list');
        const uploadList = document.getElementById('upload-list');

        // Limpa as listas antes de popular
        downloadList.innerHTML = '';
        uploadList.innerHTML = '';

        // Populando a lista de downloads (em ordem reversa)
        if (data.queue_download && Object.keys(data.queue_download).length > 0) {
            const reversedDownloadKeys = Object.keys(data.queue_download).reverse();
            reversedDownloadKeys.forEach(key => {
                const listItem = createListItem(key, data.queue_download[key], 'download');
                downloadList.appendChild(listItem);
            });
        } else {
            downloadList.innerHTML = `<li class="empty-message">${emptyDownloadMessage}</li>`;
        }

        // Populando a lista de uploads (em ordem reversa)
        if (data.queue_upload && Object.keys(data.queue_upload).length > 0) {
            const reversedUploadKeys = Object.keys(data.queue_upload).reverse();
            reversedUploadKeys.forEach(key => {
                const listItem = createListItem(key, data.queue_upload[key], 'upload');
                uploadList.appendChild(listItem);
            });
        } else {
            uploadList.innerHTML = `<li class="empty-message">${emptyUploadMessage}</li>`;
        }
    })
    .catch(error => console.error('Erro ao atualizar a fila:', error));
}

function createListItem(key, item, type) {
    const li = document.createElement('li');
    li.setAttribute('class', item.status);
    li.setAttribute('data-key', key);
    li.setAttribute('data-type', type);
    li.addEventListener('click', () => removeItem(type, key));

    const strong = document.createElement('strong');
    strong.textContent = key;

    const ul = document.createElement('ul');
    ul.innerHTML = `
        <li>Idioma: ${item.language}</li>
        <li>Capítulo: ${item.chapter}</li>
        <li>Status: ${item.status}</li>
        ${item.error ? `<li>Erro: ${item.error}</li>` : ''}
    `;

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
            updateQueue();
        } else {
            alert(errorDeleteMessage);
        }
    })
    .catch(error => console.error('Erro ao excluir o item:', error));
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}
