const initialConfig = {
    upload: parseInt(document.getElementById('upload').value, 10),
    retry: parseInt(document.getElementById('retry').value, 10),
    log: document.getElementById('log').checked,
    api_url: document.getElementById('api_url').value,
    auth_url: document.getElementById('auth_url').value,
    max_results: parseInt(document.getElementById('max_results').value, 10),
    download_folder: document.getElementById('download_folder').value
};

const defaultConfig = {
    upload: 10,
    retry: 3,
    log: false,
    api_url: "https://api.mangadex.org",
    auth_url: "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
    max_results: 12,
    download_folder: ""
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
        download_folder: document.getElementById('download_folder').value
    };
}

function generateChangesMessage(changes) {
    let message = 'Alterações detectadas:<br>';
    for (const [key, value] of Object.entries(changes)) {
        if (key === 'log') {
            message += `${key.charAt(0).toUpperCase() + key.slice(1)}? ${value.oldValue ? 'Ativado' : 'Desativado'} -> ${value.newValue ? 'Ativado' : 'Desativado'}<br>`;
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
        alert('Nenhuma alteração detectada.');
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
        alert('Nenhuma alteração a ser restaurada.');
        return;
    }

    confirmationMessage.innerHTML = 'Você está prestes a restaurar os seguintes valores para o padrão:<br>' +
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
                    Dicas do ${tipName} <button class="${seen ? 'tip-seen' : 'tip-not-seen'}">${seen ? 'Visto' : 'Não Visto'}</button>
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
