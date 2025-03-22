const initialConfig = {
    upload: parseInt(document.getElementById('upload').value, 10),
    retry: parseInt(document.getElementById('retry').value, 10),
    log: document.getElementById('log').checked,
    api_url: document.getElementById('api_url').value,
    auth_url: document.getElementById('auth_url').value,
    max_results: parseInt(document.getElementById('max_results').value, 10),
    max_results_page: parseInt(document.getElementById('max_results_page').value, 10),
    download_folder: document.getElementById('download_folder').value,
    download_folder_scheme: document.getElementById('download_folder_scheme').value,
    cover_image_quality: document.getElementById('cover_image_quality').value,
    upload_on_error: document.getElementById('upload_on_error').checked,
    preprocess_images: document.getElementById('preprocess_images').checked,
    auto_adapt_cutting_tool: document.getElementById('auto_adapt_cutting_tool').checked,
    cutting_tool: document.getElementById('cutting_tool').checked ? 'SmartStitch' : 'Pillow',
    output_file_type: document.getElementById('output_file_type').value,
    output_image_quality: parseInt(document.getElementById('output_image_quality').value, 10),
    queue_operations: parseInt(document.getElementById('queue_operations').value, 10),
    image_operations: parseInt(document.getElementById('image_operations').value, 10),
    loading_animation: document.getElementById('loading_animation').checked ? 'ball' : 'spinner',
    API_KEY_DETECTLANGUAGE: document.getElementById('api_key').value,
};

const defaultConfig = {
    upload: 5,
    retry: 3,
    log: false,
    api_url: "https://api.mangadex.org",
    auth_url: "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token",
    API_KEY_DETECTLANGUAGE: "",
    max_results: 50,
    max_results_page: 8,
    download_folder: "",
    download_folder_scheme: "scheme1",
    cover_image_quality: "reduced",
    upload_on_error: false,
    preprocess_images: false,
    auto_adapt_cutting_tool: false,
    cutting_tool: 'Pillow',
    output_file_type: "JPG",
    output_image_quality: 85,
    queue_operations: 1,
    image_operations: 1,
    loading_animation: 'spinner'
};

let blackScreen = document.getElementById("black-screen");

const confirmationModal = document.getElementById('confirmation-modal');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeModalConfirmation = document.querySelector('#confirmation-modal .close-btn');



const filterModal = document.getElementById('search-filter-modal');
const closeFilterModal = filterModal.querySelector('.close-btn');

closeFilterModal.onclick = function() {
    hideModal(filterModal);
};

function getFormData() {
    return {
        upload: parseInt(document.getElementById('upload').value, 10),
        retry: parseInt(document.getElementById('retry').value, 10),
        log: document.getElementById('log').checked,
        api_url: document.getElementById('api_url').value,
        auth_url: document.getElementById('auth_url').value,
        max_results: parseInt(document.getElementById('max_results').value, 10),
        max_results_page: parseInt(document.getElementById('max_results_page').value, 10),
        download_folder: document.getElementById('download_folder').value,
        download_folder_scheme: document.getElementById('download_folder_scheme').value,
        cover_image_quality: document.getElementById('cover_image_quality').value,
        upload_on_error: document.getElementById('upload_on_error').checked,
        preprocess_images: document.getElementById('preprocess_images').checked,
        auto_adapt_cutting_tool: document.getElementById('auto_adapt_cutting_tool').checked,
        cutting_tool: document.getElementById('cutting_tool').checked ? 'SmartStitch' : 'Pillow',
        output_file_type: document.getElementById('output_file_type').value,
        output_image_quality: parseInt(document.getElementById('output_image_quality').value, 10),
        queue_operations: parseInt(document.getElementById('queue_operations').value, 10),
        image_operations: parseInt(document.getElementById('image_operations').value, 10),
        loading_animation: document.getElementById('loading_animation').checked ? 'ball' : 'spinner',
        API_KEY_DETECTLANGUAGE: document.getElementById('api_key').value
    };
}

function generateChangesMessage(changes) {
    let message = `${translations.config.modal.confirmation.changes_detected_message}<br>`;
    for (const [key, value] of Object.entries(changes)) {
        const friendlyName = translations.config.friendlynames[key] || key; // Nome amigável ou técnico
        const oldValue = typeof value.oldValue === "boolean" ? (value.oldValue ? translations.config.enabled : translations.config.disabled) : value.oldValue;
        const newValue = typeof value.newValue === "boolean" ? (value.newValue ? translations.config.enabled : translations.config.disabled) : value.newValue;

        message += `${friendlyName}: ${oldValue} -> ${newValue}<br>`;
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
        alert(translations.config.console_and_alert.alert.no_changes_detected);
        return;
    }

    confirmationMessage.innerHTML = generateChangesMessage(changes);
    showModal(confirmationModal);

    confirmBtn.onclick = function() {
        hideModal(confirmationModal);
        document.getElementById("black-screen").classList.remove("fade-out");
        document.getElementById('config-form').submit();
    };
};

document.getElementById('restore-defaults-btn').onclick = function() {
    const currentConfig = getFormData();
    const changes = {};

    for (const [key, value] of Object.entries(defaultConfig)) {
        const currentValue = currentConfig[key];
        const isDifferent = currentValue !== value;
        if (isDifferent) {
            changes[key] = {
                oldValue: currentValue,
                newValue: value
            };
        }
    }

    if (Object.keys(changes).length === 0) {
        alert(translations.config.console_and_alert.alert.no_restore_changes);
        return;
    }

    confirmationMessage.innerHTML = `${translations.config.modal.confirmation.restore_defaults_message}<br>` +
    Object.entries(changes)
        .map(([key, change]) => {
            const friendlyName = translations.config.friendlynames[key] || key; // Usa o nome traduzido se disponível
            const oldValue = typeof change.oldValue === "boolean" ? 
                (change.oldValue ? translations.config.enabled : translations.config.disabled) : change.oldValue;
            const newValue = typeof change.newValue === "boolean" ? 
                (change.newValue ? translations.config.enabled : translations.config.disabled) : change.newValue;
            
            return `${friendlyName.replace(/:$/, '')}: ${oldValue} -> ${newValue}`; // Remove ":" extra no final
        })
        .join('<br>');

        showModal(confirmationModal);

    confirmBtn.onclick = function() {
        // Restaura os valores padrões
        Object.keys(defaultConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === "checkbox") {
                    element.checked = defaultConfig[key];
                } else {
                    element.value = defaultConfig[key];
                }
            }
        });

        document.getElementById('config-form').submit();
        showModal(tipsModal);
        hideModal(confirmationModal);
    };
};

cancelBtn.onclick = closeModalConfirmation.onclick = function() {
    hideModal(confirmationModal);
};

// Atualize a lista de dicas dinamicamente
const tipsBtn = document.getElementById('tips-btn');
const tipsModal = document.getElementById('tips-modal');
const closeTipsModal = tipsModal.querySelector('.close-btn');

closeTipsModal.onclick = function() {
    hideModal(tipsModal);
};

tipsBtn.onclick = function () {
    fetch('/api/get_tips_status')
        .then(response => response.json())
        .then(tipsStatus => {
            const tipsList = document.getElementById('tips-list');
            tipsList.innerHTML = '';

            Object.entries(tipsStatus).forEach(([tipName, seen]) => {
                const tipItem = document.createElement('li');
                tipItem.innerHTML = `
                    ${translations.config.friendlynames[tipName] || tipName}
                    <button class="${seen ? 'tip-seen' : 'tip-not-seen'}">
                        ${seen ? translations.config.modal.tips.seen : translations.config.modal.tips.not_seen}
                    </button>
                `;

                const button = tipItem.querySelector('button');
                button.addEventListener('click', function () {
                    toggleTipStatus(tipName, this);
                });

                tipsList.appendChild(tipItem);
            });

            showModal(tipsModal);
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
                button.textContent = newStatus ? translations.config.modal.tips.seen : translations.config.modal.tips.not_seen;
            } else {
                alert(translations.config.console_and_alert.alert.update_tip_status);
            }
        })
        .catch(error => {
            console.error(translations.config.console_and_alert.console.update_tip_status, error);
            alert(translations.config.console_and_alert.alert.update_tip_status);
        });
}

document.getElementById('folder-btn-config').addEventListener('click', function () {
    showLoadingScreen()
    fetch('/select_folder')  // Supondo que você tenha uma rota para selecionar a pasta
        .then(response => response.json())
        .then(data => {
            if (data.folder) {
                document.getElementById('download_folder').value = data.folder;
                alert(translations.config.console_and_alert.alert.selected_folder + data.folder);
            } else {
                alert(translations.config.console_and_alert.alert.folder_not_selected);
            }
        })
        .catch(error => {
            console.error(translations.config.console_and_alert.console.selected_folder, error);
            alert(translations.config.console_and_alert.alert.folder_error);
        })
        .finally(() => {
            hideLoadingScreen();
        });
});

document.getElementById('delete-folder-btn').addEventListener('click', function () {
    if (confirm(translations.config.console_and_alert.alert.confirm_delete_folder)) {
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
                alert(translations.config.console_and_alert.alert.folder_deleted);
                updateFolderSizes();
            } else {
                alert(translations.config.console_and_alert.alert.folder_delete_error);
            }
        })
        .catch(error => {
            console.error(translations.config.console_and_alert.console.delete_folder_error, error);
            alert(translations.config.console_and_alert.alert.folder_delete_error);
        });
    }
});

document.getElementById('delete-temp-folders-btn').addEventListener('click', function () {
    if (confirm(translations.config.console_and_alert.alert.confirm_delete_folder)) {
        fetch('/delete_temp_folders', {  // Supondo que você tenha uma rota para exclusão
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(translations.config.console_and_alert.alert.folder_deleted);
                updateFolderSizes();
            } else {
                alert(translations.config.console_and_alert.alert.folder_delete_error);
            }
        })
        .catch(error => {
            console.error(translations.config.console_and_alert.console.delete_temp_folders_error, error);
            alert(translations.config.console_and_alert.alert.folder_delete_error);
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
        const container = document.querySelector('.container');

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

// Abrir o modal
document.getElementById('search-filter-btn').addEventListener('click', function () {
    showModal(filterModal);
});

// Alternar a direção da ordenação para cada grupo
document.querySelectorAll('.toggle input').forEach(toggle => {
    toggle.addEventListener('change', function () {
        const label = this.closest('.order-group').querySelector('.order-direction-label');
        if (this.checked) {
            label.textContent = translations.config.filter_modal.order.desc;
            this.value = 'desc';
        } else {
            label.textContent = translations.config.filter_modal.order.asc;
            this.value = 'asc';
        }
    });
});

document.getElementById("apply-filter-btn").addEventListener("click", () => {
    const searchFilterData = {
        status: Array.from(document.querySelectorAll("input[name='status']:checked")).map(el => el.value),
        availableTranslatedLanguage: Array.from(document.querySelectorAll("input[name='availableTranslatedLanguage']:checked")).map(el => el.value),
        publicationDemographic: Array.from(document.querySelectorAll("input[name='publicationDemographic']:checked")).map(el => el.value),
        contentRating: Array.from(document.querySelectorAll("input[name='contentRating']:checked")).map(el => el.value),
        order: {}
    };

    const orderFields = ["title", "year", "createdAt", "updatedAt", "latestUploadedChapter", "followedCount", "relevance"];
    orderFields.forEach(field => {
        const isEnabled = document.querySelector(`input[name="order_${field}"]`).checked;
        const directionToggle = document.querySelector(`input[name="order_direction_${field}"]`);

        searchFilterData.order[field] = {
            enable: isEnabled,
            type: directionToggle.checked ? "desc" : "asc"
        };
    });

    showBlackScreenAndRedirect(false);

    console.log(translations.config.console_and_alert.console.send_filter_save, searchFilterData);

    document.getElementById("black-screen").classList.remove("fade-out");

    // Envia o filtro para a rota '/update_filter'
    socket.emit('update_filter', searchFilterData)
});

document.addEventListener("DOMContentLoaded", () => {
    if (savedFilter) {
        console.log(translations.config.console_and_alert.console.filter_loaded, savedFilter);

        // Preenche os campos de status
        savedFilter.status.forEach(value => {
            const checkbox = document.querySelector(`input[name="status"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Preenche idiomas
        savedFilter.availableTranslatedLanguage.forEach(value => {
            const checkbox = document.querySelector(`input[name="availableTranslatedLanguage"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Preenche demografia
        savedFilter.publicationDemographic.forEach(value => {
            const checkbox = document.querySelector(`input[name="publicationDemographic"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Preenche classificação de conteúdo
        savedFilter.contentRating.forEach(value => {
            const checkbox = document.querySelector(`input[name="contentRating"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Preenche ordenação
        Object.entries(savedFilter.order).forEach(([key, { enable, type }]) => {
            const fieldCheckbox = document.querySelector(`input[name="order_${key}"]`);
            const directionToggle = document.querySelector(`input[name="order_direction_${key}"]`);

            if (fieldCheckbox) fieldCheckbox.checked = enable;
            if (directionToggle) directionToggle.checked = (type === "desc");
        });
    }
});

document.addEventListener('keydown', function (event) {
    // Verifica se o Ctrl (ou Command no Mac) e a tecla 'S' foram pressionados
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Impede o comportamento padrão (salvar a página)

        const saveButton = document.getElementById('save-btn');
        if (saveButton) {
            saveButton.click(); // Aciona o clique do botão
        }
    }

    // Verifica se o Ctrl (ou Command no Mac) e a tecla 'R' foram pressionados
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();

        const restoreButton = document.getElementById('restore-defaults-btn');
        if (restoreButton) {
            restoreButton.click(); // Aciona o clique do botão
        }
    }

    // Verifica se o Ctrl (ou Command no Mac) e a tecla 'D' foram pressionados
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();

        const tipsButton = document.getElementById('tips-btn');
        if (tipsButton) {
            tipsButton.click(); // Aciona o clique do botão
        }
    }
});

socket.on("reload", () => {
    // Recarregar a página
    location.reload();
})

function updateFolderSizes() {
    socket.emit('calculate_folder');  // Envia solicitação para calcular os tamanhos das pastas
}

updateFolderSizes();

socket.on('get_folder_size', function () { updateFolderSizes(); });
socket.on('folder_size', function (data) {
    let folderSizeMB = (data.folder_size / (1024 * 1024)).toFixed(2);
    let tempFoldersSizeMB = (data.temp_folders_size / (1024 * 1024)).toFixed(2);

    // Atualiza os valores no HTML
    document.querySelector('.config-item.storage p').textContent = folderSizeMB + " MB";
    document.querySelectorAll('.config-item.storage p')[1].textContent = tempFoldersSizeMB + " MB";
});

function showBlackScreenAndRedirect(up) {
    blackScreen.classList.remove("fade-out"); // Torna a tela preta visível novamente

    if (up) {
        setTimeout(() => {
            window.location.href = `/home`;
        }, 1000); // Espera a animação antes de redirecionar
    }

    setTimeout(() => {
        blackScreen.classList.add("fade-out");
    }, 2000); // Tempo de espera antes da animação
}

document.getElementById('exit-label').onclick = function() { showBlackScreenAndRedirect(true); };

function showModal(modal) {
    modal.style.display = 'block'; // Exibe o modal (fundo preto)
    const modalContent = modal.querySelector('.modal-content'); // Seleciona o conteúdo do modal

    if (modalContent) {
        modalContent.classList.remove('hide');  // Remove a animação de saída
        modalContent.classList.add('show');     // Adiciona a animação de entrada
    }
}

function hideModal(modal) {
    const modalContent = modal.querySelector('.modal-content'); // Seleciona o conteúdo do modal

    if (modalContent) {
        modalContent.classList.remove('show');  // Remove a animação de entrada
        modalContent.classList.add('hide');     // Adiciona a animação de saída

        setTimeout(() => {
            modal.style.display = 'none'; // Oculta o modal (fundo preto) após a animação
        }, 300); // Tempo igual à duração da animação
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loadingAnimationCheckbox = document.getElementById('loading_animation');
    const loadingAnimationLabel = document.getElementById('loading_animation_label');

    if (loadingAnimationCheckbox) {
        loadingAnimationCheckbox.addEventListener('change', function() {
            if (this.checked) {
                loadingAnimationLabel.textContent = 'Ball';
            } else {
                loadingAnimationLabel.textContent = 'Spinner';
            }
        });
    }
});