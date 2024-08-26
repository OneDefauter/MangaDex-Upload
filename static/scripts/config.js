const initialConfig = {
    upload: parseInt(document.getElementById('upload').value, 10),
    retry: parseInt(document.getElementById('retry').value, 10),
    log: document.getElementById('log').checked,
    api_url: document.getElementById('api_url').value,
    auth_url: document.getElementById('auth_url').value,
    max_results: parseInt(document.getElementById('max_results').value, 10),
    download_folder: document.getElementById('download_folder').value,
    download_folder_scheme: document.getElementById('download_folder_scheme').value,
    cover_image_quality: document.getElementById('cover_image_quality').value,
    upload_on_error: document.getElementById('upload_on_error').checked
};

const defaultConfig = {
    upload: 10,
    retry: 3,
    log: false,
    api_url: "https://api.mangadex.org",
    auth_url: "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
    max_results: 12,
    download_folder: "",
    download_folder_scheme: "scheme1",
    cover_image_quality: "reduced",
    upload_on_error: false
};

const modal = document.getElementById('confirmation-modal');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeModal = document.querySelector('.close-btn');

function getFormData() {
    return {
        upload: parseInt(document.getElementById('upload').value, 10),
        retry: parseInt(document.getElementById('retry').value, 10),
        log: document.getElementById('log').checked,
        api_url: document.getElementById('api_url').value,
        auth_url: document.getElementById('auth_url').value,
        max_results: parseInt(document.getElementById('max_results').value, 10),
        download_folder: document.getElementById('download_folder').value,
        download_folder_scheme: document.getElementById('download_folder_scheme').value,
        cover_image_quality: document.getElementById('cover_image_quality').value,
        upload_on_error: document.getElementById('upload_on_error').checked
    };
}

function generateChangesMessage(changes) {
    let message = `${translations.changesDetectedMessage}<br>`;
    for (const [key, value] of Object.entries(changes)) {
        if (key === 'log') {
            message += `${key.charAt(0).toUpperCase() + key.slice(1)}? ${value.oldValue ? translations.enabled : translations.disabled} -> ${value.newValue ? translations.enabled : translations.disabled}<br>`;
        } else {
            message += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.oldValue} -> ${value.newValue}<br>`;
        }
    }
    return message;
}

function checkChanges() {
    const currentConfig = getFormData();
    const changes = {};

    for (const [key, value] of Object.entries(currentConfig)) {
        const NowValue = initialConfig[key];
        const isDifferent = key === 'log' ? value !== NowValue : value !== NowValue;
        if (isDifferent) {
            changes[key] = {
                oldValue: NowValue,
                newValue: value
            };
        }
    }

    return changes;
}

document.getElementById('save-btn').onclick = function() {
    const changes = checkChanges();
    if (Object.keys(changes).length === 0) {
        alert(translations.noChangesMessage);
        return;
    }

    confirmationMessage.innerHTML = generateChangesMessage(changes);
    modal.style.display = 'block';
    confirmBtn.onclick = function() {
        modal.style.display = 'none'; // Fecha o modal após confirmar
        document.getElementById('config-form').submit();
    };
};

document.getElementById('restore-defaults-btn').onclick = function() {
    const currentConfig = getFormData();
    const changes = {};

    for (const [key, value] of Object.entries(defaultConfig)) {
        const currentValue = currentConfig[key];
        const isDifferent = key === 'log' ? currentValue !== value : currentValue !== value;
        if (isDifferent) {
            changes[key] = {
                oldValue: currentValue,
                newValue: value
            };
        }
    }

    if (Object.keys(changes).length === 0) {
        alert(translations.noRestoreChangesMessage);
        return;
    }

    confirmationMessage.innerHTML = `${translations.restoreDefaultsMessage}<br>` +
        Object.entries(changes).map(([key, change]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${change.oldValue} -> ${change.newValue}`).join('<br>');

    modal.style.display = 'block';
    confirmBtn.onclick = function() {
        document.getElementById('upload').value = defaultConfig.upload;
        document.getElementById('retry').value = defaultConfig.retry;
        document.getElementById('log').checked = defaultConfig.log;
        document.getElementById('api_url').value = defaultConfig.api_url;
        document.getElementById('auth_url').value = defaultConfig.auth_url;
        document.getElementById('max_results').value = defaultConfig.max_results;
        document.getElementById('download_folder').value = defaultConfig.download_folder;
        document.getElementById('config-form').submit();
        modal.style.display = 'none';
    };
};

cancelBtn.onclick = closeModal.onclick = function() {
    modal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Código para exibir dicas
const tipsBtn = document.getElementById('tips-btn');
const tipsModal = document.getElementById('tips-modal');

tipsBtn.onclick = function() {
    fetch('/api/get_tips_status')
        .then(response => response.json())
        .then(tipsStatus => {
            const tipsList = document.getElementById('tips-list');
            tipsList.innerHTML = ''; // Limpar a lista antes de preencher

            Object.entries(tipsStatus).forEach(([tipName, seen]) => {
                const tipItem = document.createElement('li');
                tipItem.innerHTML = `
                    ${translations.tip} ${tipName} <button class="${seen ? 'tip-seen' : 'tip-not-seen'}">${seen ? translations.seen : translations.not_seen}</button>
                `;
                tipsList.appendChild(tipItem);
            });

            tipsModal.style.display = 'block';
        });
};

// Fechar modal de dicas
const closeTipsModal = document.querySelector('.close-btn');

closeTipsModal.onclick = function() {
    tipsModal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target === tipsModal) {
        tipsModal.style.display = 'none';
    }
};

document.getElementById('folder-btn-config').addEventListener('click', function () {
    showLoadingScreen()
    fetch('/select_folder')  // Supondo que você tenha uma rota para selecionar a pasta
        .then(response => response.json())
        .then(data => {
            if (data.folder) {
                document.getElementById('download_folder').value = data.folder;
                alert('Pasta selecionada: ' + data.folder);
            } else {
                alert('Nenhuma pasta foi selecionada');
            }
        })
        .catch(error => {
            console.error('Erro ao selecionar a pasta:', error);
            alert('Erro ao selecionar a pasta');
        })
        .finally(() => {
            hideLoadingScreen();
        });
});

document.getElementById('delete-folder-btn').addEventListener('click', function () {
    if (confirm(translations.confirm_delete_folder)) {
        fetch('/delete_folder', {  // Supondo que você tenha uma rota para exclusão de pasta
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folder: document.getElementById('download_folder').value })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(translations.folder_deleted);
                location.reload();  // Recarregar a página para atualizar as informações
            } else {
                alert(translations.folder_delete_error);
            }
        })
        .catch(error => {
            console.error('Erro ao excluir a pasta:', error);
            alert(translations.folder_delete_error);
        });
    }
});

function showLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'none';
}
