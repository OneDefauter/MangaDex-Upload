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
    upload_on_error: document.getElementById('upload_on_error').checked,
    preprocess_images: document.getElementById('preprocess_images').checked,
    cutting_tool: document.getElementById('cutting_tool').checked ? 'SmartStitch' : 'Pillow',
    output_file_type: document.getElementById('output_file_type').value,
    output_image_quality: parseInt(document.getElementById('output_image_quality').value, 10),
    queue_operations: parseInt(document.getElementById('queue_operations').value, 10),
    image_operations: parseInt(document.getElementById('image_operations').value, 10)
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
    upload_on_error: false,
    preprocess_images: false,
    cutting_tool: 'Pillow',
    output_file_type: "JPG",
    output_image_quality: 100,
    queue_operations: 1,
    image_operations: 1
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
        upload_on_error: document.getElementById('upload_on_error').checked,
        preprocess_images: document.getElementById('preprocess_images').checked,
        cutting_tool: document.getElementById('cutting_tool').checked ? 'SmartStitch' : 'Pillow',
        output_file_type: document.getElementById('output_file_type').value,
        output_image_quality: parseInt(document.getElementById('output_image_quality').value, 10),
        queue_operations: parseInt(document.getElementById('queue_operations').value, 10),
        image_operations: parseInt(document.getElementById('image_operations').value, 10)
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const cuttingToolInput = document.getElementById('cutting_tool');
    const cuttingToolContainer = cuttingToolInput.closest('.config-item'); // Contêiner do toggle

    // Obter o valor de SmartStitchEnabled do atributo data-smartstitch-enabled
    const SmartStitchEnabled = document.body.getAttribute('data-smartstitch-enabled') === 'true';

    if (!SmartStitchEnabled) {
        // Captura eventos em todo o contêiner do toggle
        cuttingToolContainer.addEventListener('click', function (event) {
            // Verificar se o evento ocorreu no toggle ou no span associado
            if (event.target === cuttingToolInput || cuttingToolContainer.contains(event.target)) {
                event.preventDefault(); // Impede o comportamento padrão
                console.log("Evento interceptado no cuttingToolContainer."); // Debug
                showNotificationAbove(cuttingToolInput, "A ferramenta 'SmartStitch' não está disponível no momento.");
            }
        });
    }

    // Função para exibir notificações acima de um elemento
    function showNotificationAbove(element, message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = message; 
    
        const parent = element.closest('.config-item');
        parent.style.position = 'relative';
        parent.appendChild(notification);
    
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.bottom = `${element.offsetHeight + 10}px`;
    
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, 3000);
    }
});

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
        const isDifferent = key === 'log' || key === 'preprocess_images' ? value !== NowValue : value !== NowValue;
        if (isDifferent) {
            changes[key] = {
                oldValue: NowValue,
                newValue: value
            };
        }
    }

    return changes;
}

const cuttingToolCheckbox = document.getElementById('cutting_tool');
const cuttingToolLabel = document.getElementById('cutting_tool_label');

document.getElementById('cutting_tool').addEventListener('change', function () {
    const cuttingToolLabel = document.getElementById('cutting_tool_label');

    if (this.checked) {
        // Atualiza para SmartStitch com link
        cuttingToolLabel.innerHTML = `
            <a href="https://github.com/MechTechnology/SmartStitch" target="_blank" class="smartstitch-link">
                SmartStitch
            </a>
        `;
    } else {
        // Atualiza para texto simples Pillow
        cuttingToolLabel.innerHTML = 'Pillow';
    }
});

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
        document.getElementById('preprocess_images').checked = defaultConfig.preprocess_images;
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

// Atualize a lista de dicas dinamicamente
const tipsBtn = document.getElementById('tips-btn');
const tipsModal = document.getElementById('tips-modal');

tipsBtn.onclick = function () {
    fetch('/api/get_tips_status') // Supondo que essa rota retorna o status das dicas
        .then(response => response.json())
        .then(tipsStatus => {
            const tipsList = document.getElementById('tips-list');
            tipsList.innerHTML = ''; // Limpar a lista antes de preencher

            Object.entries(tipsStatus).forEach(([tipName, seen]) => {
                const tipItem = document.createElement('li');
                tipItem.innerHTML = `
                    ${translations.tip} ${tipName}
                    <button class="${seen ? 'tip-seen' : 'tip-not-seen'}">
                        ${seen ? translations.seen : translations.not_seen}
                    </button>
                `;

                // Adiciona evento de clique ao botão
                const button = tipItem.querySelector('button');
                button.addEventListener('click', function () {
                    toggleTipStatus(tipName, this); // Função para alternar o status
                });

                tipsList.appendChild(tipItem);
            });

            tipsModal.style.display = 'block';
        });
};

// Função para alternar o status da dica
function toggleTipStatus(tipName, button) {
    const currentStatus = button.classList.contains('tip-seen');
    const newStatus = !currentStatus;

    // Envia a atualização para o backend
    fetch('/api/update_tip_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipName, seen: newStatus })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Atualiza o botão na interface
                button.classList.toggle('tip-seen', newStatus);
                button.classList.toggle('tip-not-seen', !newStatus);
                button.textContent = newStatus ? translations.seen : translations.not_seen;
            } else {
                alert('Erro ao atualizar o status da dica.');
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar o status da dica:', error);
            alert('Erro ao atualizar o status da dica.');
        });
}

// Fechar o modal de dicas
const closeTipsModal = document.querySelector('.close-btn');
closeTipsModal.onclick = function () {
    tipsModal.style.display = 'none';
};

window.onclick = function (event) {
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

document.getElementById('delete-temp-folders-btn').addEventListener('click', function () {
    if (confirm(translations.confirm_delete_folder)) {
        fetch('/delete_temp_folders', {  // Supondo que você tenha uma rota para exclusão
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
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
            console.error('Erro ao excluir pastas temporárias:', error);
            alert(translations.folder_delete_error);
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const configItems = document.querySelectorAll('.config-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' ao botão clicado
            button.classList.add('active');

            const filter = button.getAttribute('data-filter');

            // Filtra os itens de configuração
            configItems.forEach(item => {
                if (filter === 'all') {
                    // Mostra todos os itens
                    item.style.display = 'block';
                } else if (item.classList.contains(filter)) {
                    // Mostra apenas os itens que possuem a classe correspondente ao filtro
                    item.style.display = 'block';
                } else {
                    // Oculta os itens que não correspondem ao filtro
                    item.style.display = 'none';
                }
            });
        });
    });

    // Inicializa com todos os itens visíveis
    document.querySelector('.filter-btn[data-filter="all"]').click();
});

// Função para alternar itens com animações
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function () {
        // Remove a classe "active" de todos os botões
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

        // Adiciona a classe "active" no botão clicado
        this.classList.add('active');

        // Obtém o filtro selecionado
        const filter = this.dataset.filter;

        // Alterna os itens de acordo com o filtro
        document.querySelectorAll('.config-item').forEach(item => {
            if (filter === 'all' || item.classList.contains(filter)) {
                item.style.display = 'block'; // Garante que o item esteja visível antes da animação
                setTimeout(() => {
                    item.classList.add('active'); // Adiciona a classe para iniciar a animação
                }, 10); // Tempo para o navegador processar o display
            } else {
                item.classList.remove('active'); // Remove a classe para iniciar a transição de saída
                setTimeout(() => {
                    item.style.display = 'none'; // Esconde o item após a transição
                }, 400); // Tempo para a transição terminar (igual ao definido no CSS)
            }
        });
    });
});

function showLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'none';
}
