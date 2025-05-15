window.onload = function() {
    if (isAndroid) {
        const folderBtn = document.getElementById('folder-btn');
        const lb_folder = document.querySelector('label[for="folder"]');
        lb_folder.textContent = translations.upload.file
        folderBtn.disabled = true;
        folderBtn.style = 'display: none;'
        folderBtn.classList.add('disabled'); // Opcional: Adicione uma classe para estilização
    }

    document.getElementById('folder-btn').addEventListener('click', function () {
        if (isAndroid) {
            openAndroidFolderSelector();
        } else {
            showLoadingScreen();
            fetch('/select_folder')
                .then(response => response.json())
                .then(data => {
                    if (data.folder) {
                        document.getElementById('folder').value = data.folder;
                        showNotifications([translations.upload.folder_selected]);
                    } else {
                        showNotifications([translations.upload.folder_not_selected]);
                    }
                })
                .catch(error => {
                    console.error(translations.upload.console_and_alert.console.error_select_folder, error);
                    showNotifications([translations.upload.error_select_folder]);
                })
                .finally(() => {
                    hideLoadingScreen();
                });
        }
    });

    document.getElementById('file-btn').addEventListener('click', function () {
        if (isAndroid) {
            openAndroidFileSelector();
        } else {
            showLoadingScreen();
            fetch('/select_file')
                .then(response => response.json())
                .then(data => {
                    if (data.file) {
                        document.getElementById('folder').value = data.file;
                        showNotifications([translations.upload.file_selected]);
                    } else {
                        showNotifications([translations.upload.file_not_selected]);
                    }
                })
                .catch(error => {
                    console.error(translations.upload.console_and_alert.console.error_select_file, error);
                    showNotifications([translations.upload.error_select_file]);
                })
                .finally(() => {
                    hideLoadingScreen();
                });
        }
    });

    function openAndroidFolderSelector() {
        // Aqui você pode usar a API do Android para abrir o seletor de pastas
        // ou usar um input type="file" com o atributo 'webkitdirectory'
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.onchange = function (event) {
            const folderPath = event.target.files[0].webkitRelativePath.split('/')[0];
            document.getElementById('folder').value = folderPath;
            showNotifications([translations.upload.folder_selected]);
        };
        input.click();
    }

    function openAndroidFileSelector() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cbz,.zip'; // Restringe aos arquivos CBZ e ZIP
        input.onchange = function (event) {
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                const allowedExtensions = ['.cbz', '.zip'];
                const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
                if (allowedExtensions.includes(fileExtension)) {
                    // Enviar o nome do arquivo para o backend para verificação
                    fetch('/verify_file', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ filename: file.name })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.exists) {
                            document.getElementById('folder').value = file.name;
                        } else {
                            showNotifications(['Arquivo não encontrado na pasta esperada.']);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao verificar o arquivo no backend:', error);
                        showNotifications(['Erro ao verificar o arquivo. Tente novamente.']);
                    });
                } else {
                    showNotifications([`Formato de arquivo inválido. Apenas arquivos CBZ e ZIP são permitidos.`]);
                }
            } else {
                showNotifications(['Nenhum arquivo foi selecionado']);
            }
        };
        input.click();
    }    
};

function incrementarCapitulo(chapter) {
    const match = chapter.match(/^(\d+)(\.\d+)?$/);
    if (match) {
        let main = parseInt(match[1], 10);
        let decimal = match[2] ? parseFloat(match[2]) : 0;

        if (decimal > 0) {
            decimal += 0.1;
        } else {
            main += 1;
        }

        return decimal > 0 ? `${main}${decimal.toFixed(1).substring(1)}` : `${main}`;
    } else {
        // Caso o formato do capítulo não seja reconhecido, apenas retorne o mesmo valor
        return chapter;
    }
}

document.getElementById('submit-btn').addEventListener('click', function () {
    const projectTitle = document.getElementById('project').value.trim();
    const projectId = document.getElementById('project-id').value.trim();
    const title = document.getElementById('title').value.trim();

    showLoadingScreen();

    const groups = Array.from(document.querySelectorAll('.tags-container .tag span')).map(span => {
        const text = span.textContent.trim();
        let name = null;
        let id = null;

        if (text.includes('(')) {
            const match = text.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                [name, id] = match.slice(1, 3);
            }
        } else {
            id = text;
        }

        return { name, id };
    }).filter(group => group.id !== null);

    const language = document.getElementById('language').value;
    const volume = document.getElementById('volume').value.trim();
    let chapter = document.getElementById('chapter').value.trim();
    let folder = document.getElementById('folder').value.trim();
    const datetime = document.getElementById('datetime').value;
    const singleChapter = document.getElementById('single_chapter').checked;

    if (!projectId || groups.length === 0 || !language || (!chapter && !singleChapter) || !folder) {
        alert(translations.upload.need_required_fields);
        hideLoadingScreen();
        return;
    }

    const data = {
        project: {
            title: projectTitle,
            id: projectId
        },
        title,
        groups: groups,
        language,
        volume,
        chapter,
        folder,
        datetime,
        singleChapter
    };

    fetch('/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            const notifications = [
                `${translations.upload.upload_sended}<br>` +
                `${translations.upload.project} ${projectTitle || 'N/A'} (ID: ${projectId})<br>` +
                `${translations.upload.chapter} ${chapter || 'N/A'}${volume ? `, Volume: ${volume}` : ''}<br>` +
                `${translations.upload.language} ${language}`
            ];

            showNotifications(notifications);

            if (!singleChapter && chapter) {
                chapter = incrementarCapitulo(chapter);
                document.getElementById('chapter').value = chapter;
            }

            // Incrementar o número no nome da pasta ou arquivo, se aplicável
            const folderRegex = /(.*?)(\d+)(\.(cbz|zip))?$/i; // Regex para capturar o caminho, o número, e a extensão opcional .cbz ou .zip
            const folderMatch = folder.match(folderRegex);
            if (folderMatch) {
                const pathWithoutNumber = folderMatch[1]; // Parte inicial do caminho
                const folderNumberStr = folderMatch[2]; // Número capturado como string (para preservar os zeros)
                const folderExtension = folderMatch[3] || ''; // Extensão capturada (ou vazia se não houver)

                const folderNumber = parseInt(folderNumberStr, 10); // Número capturado convertido para inteiro
                const incrementedFolderNumber = folderNumber + 1; // Incrementa o número

                // Pega a quantidade de dígitos que o número original tinha
                const totalDigits = folderNumberStr.length;

                // Formata o novo número com zeros à esquerda
                const incrementedFolderNumberStr = incrementedFolderNumber.toString().padStart(totalDigits, '0');

                // Concatena o novo caminho com o número incrementado e a extensão (se existir)
                folder = `${pathWithoutNumber}${incrementedFolderNumberStr}${folderExtension}`;

                // Atualiza o campo de pasta com o novo valor
                document.getElementById('folder').value = folder;
            }

        } else {
            showNotifications([result.message]);
        }
    })
    .catch(error => {
        console.error('Error: ', error);
        showNotifications([translations.upload.error_send_data]);
    })
    .finally(() => {
        hideLoadingScreen();
    });
});

// Função para mostrar notificações
function showNotifications(messages) {
    const notificationsContainer = document.getElementById('notifications');
    messages.reverse().forEach((message, index) => {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `<p>${message}</p>`;
        notificationsContainer.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000 + index * 1000); // Delay entre notificações
        }, index * 1000); // Delay entre notificações
    });
}

// Função para desativar campos quando "Capítulo Único" estiver marcado
document.getElementById('single_chapter').addEventListener('change', function () {
    const isChecked = this.checked;
    const volumeInput = document.getElementById('volume');
    const chapterInput = document.getElementById('chapter');

    volumeInput.disabled = isChecked;
    chapterInput.disabled = isChecked;
});

function showLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = 'none';
}