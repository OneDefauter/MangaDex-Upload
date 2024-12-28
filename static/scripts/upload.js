window.onload = function() {
    const tipOverlay = document.getElementById('tip-overlay');
    const tipText = document.getElementById('tip-text');
    const tipGif = document.getElementById('tip-gif');
    const tipNextBtn = document.getElementById('tip-next-btn');
    const tipPrevBtn = document.getElementById('tip-prev-btn');
    const tipIndicators = document.getElementById('tip-indicators');

    const tips = [
        { id: 'project', text: translations.project, gif: '/static/tips/upload/project.gif' },
        { id: 'group', text: translations.group, gif: '/static/tips/upload/group.gif' },
        { id: 'language', text: translations.language, gif: '/static/tips/upload/language.gif' },
        { id: 'title', text: translations.title, gif: '/static/tips/upload/title.gif' },
        { id: 'volume', text: translations.volume, gif: '/static/tips/upload/volume.gif' },
        { id: 'chapter', text: translations.chapter, gif: '/static/tips/upload/chapter.gif' },
        { 
            id: 'single_chapter', 
            text: translations.single_chapter, 
            gif: '/static/tips/upload/single_chapter.gif' 
        },
        { id: 'folder-path', text: translations.folder, gif: '/static/tips/upload/folder.gif' },
        { 
            id: 'datetime', 
            text: translations.datetime, 
            gif: '/static/tips/upload/datetime.gif' 
        },
    ];

    let currentTipIndex = -1;

    // Verificar se a dica já foi vista
    fetch('/api/check_tip_seen?tip_name=upload_page')
        .then(response => response.json())
        .then(data => {
            if (!data.tip_seen) {
                showTipOverlay();
            } else {
                tipOverlay.style.display = 'none';
            }
        });

    function updateIndicators() {
        tipIndicators.innerHTML = ''; // Limpar os indicadores
        for (let i = 0; i < tips.length; i++) {
            const indicator = document.createElement('span');
            if (i === currentTipIndex) {
                indicator.classList.add('active');
            }
            tipIndicators.appendChild(indicator);
        }
    }

    function showTip(index) {
        if (index >= 0 && index < tips.length) {
            const currentField = document.getElementById(tips[index].id);
            if (currentField) {
                currentField.classList.add('highlight');
            }
            tipText.innerHTML = tips[index].text;
            tipGif.src = tips[index].gif;

            tipPrevBtn.style.display = index > 0 ? 'inline-block' : 'none'; // Esconder "Voltar" na primeira dica
            tipNextBtn.textContent = index < tips.length - 1 ? translations.next : translations.finish;

            updateIndicators();
        }
    }

    function showTipOverlay() {
        tipOverlay.style.display = 'flex'; // Mostrar as dicas
        currentTipIndex = 0;
        showTip(currentTipIndex);
    }

    if (isAndroid) {
        const folderBtn = document.getElementById('folder-btn');
        const lb_folder = document.querySelector('label[for="folder"]');
        lb_folder.textContent = 'Arquivo:'
        folderBtn.disabled = true;
        folderBtn.style = 'display: none;'
        folderBtn.classList.add('disabled'); // Opcional: Adicione uma classe para estilização
    }

    tipNextBtn.addEventListener('click', function() {
        if (currentTipIndex >= 0) {
            const previousField = document.getElementById(tips[currentTipIndex].id);
            if (previousField) {
                previousField.classList.remove('highlight');
            }
        }

        currentTipIndex++;
        if (currentTipIndex < tips.length) {
            showTip(currentTipIndex);
        } else {
            fetch('/api/mark_tip_as_seen', { // Marcar como vista ao finalizar
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tip_name: 'upload_page' })
            }).then(() => {
                tipOverlay.style.display = 'none'; // Fechar as dicas
            });
        }
    });

    tipPrevBtn.addEventListener('click', function() {
        if (currentTipIndex > 0) {
            const previousField = document.getElementById(tips[currentTipIndex].id);
            if (previousField) {
                previousField.classList.remove('highlight');
            }
            currentTipIndex--;
            showTip(currentTipIndex);
        }
    });

    // Inicia com a primeira dica
    currentTipIndex = 0;
    showTip(currentTipIndex);

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
                        showNotifications([`Pasta selecionada`]);
                    } else {
                        showNotifications(['Nenhuma pasta foi selecionada']);
                    }
                })
                .catch(error => {
                    console.error('Erro ao selecionar a pasta:', error);
                    showNotifications(['Erro ao selecionar a pasta']);
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
                        showNotifications([`Arquivo selecionado`]);
                    } else {
                        showNotifications(['Nenhum arquivo foi selecionado']);
                    }
                })
                .catch(error => {
                    console.error('Erro ao selecionar o arquivo:', error);
                    showNotifications(['Erro ao selecionar o arquivo']);
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
            showNotifications([`Pasta selecionada`]);
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

document.getElementById('project').addEventListener('input', function () {
    const query = this.value;
    if (query.length > 2) {
        fetch(`/search_projects?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const suggestions = data.results.slice(0, 10);
                const suggestionsList = document.getElementById('project-suggestions');
                suggestionsList.innerHTML = '';

                suggestions.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.title} (${item.id})`;
                    listItem.addEventListener('click', function () {
                        document.getElementById('project').value = listItem.textContent;
                        suggestionsList.innerHTML = '';
                    });
                    suggestionsList.appendChild(listItem);
                });
            });
    }
});

document.getElementById('group').addEventListener('input', function () {
    const query = this.value.trim();
    if (query.length > 2) {
        fetch(`/search_groups?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const suggestions = data.results.slice(0, 10);
                const suggestionsList = document.getElementById('group-suggestions');
                suggestionsList.innerHTML = '';

                suggestions.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${item.name} (${item.id})`;
                    listItem.addEventListener('click', function () {
                        addGroupTag(item.name, item.id);
                        document.getElementById('group').value = '';
                        suggestionsList.innerHTML = '';
                    });
                    suggestionsList.appendChild(listItem);
                });
            });
    }
});

document.getElementById('group').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Previne o comportamento padrão do Enter
        const query = this.value.trim();
        if (query) {
            const match = query.match(/^(.*?)\s*\((.*?)\)$/);
            const name = match ? match[1] : null;
            const id = match ? match[2] : query;

            addGroupTag(name, id);
            this.value = ''; // Limpa o campo de entrada
        }
    }
});

function addGroupTag(name, id) {
    const tagContainer = document.getElementById('selected-groups');
    
    // Verifica se o ID já está presente
    const existingTags = Array.from(tagContainer.querySelectorAll('.tag span')).map(span => {
        const text = span.textContent.trim();
        const match = text.match(/^(.*?)\s*\((.*?)\)$/);
        return match ? match[2] : text; // Retorna o ID da tag
    });

    if (existingTags.includes(id)) {
        alert(translations.group_already_added);
        return; // Não adiciona duplicatas
    }

    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<span>${name ? `${name} (${id})` : id}</span><i class="fi fi-rr-cross-small"></i>`;

    // Adiciona o evento de clique para remover a tag
    tag.querySelector('i').addEventListener('click', function () {
        tagContainer.removeChild(tag);
    });

    tagContainer.appendChild(tag);
}

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
    const projectInput = document.getElementById('project').value.trim();
    const title = document.getElementById('title').value.trim();
    
    let projectTitle = null;
    let projectId = null;

    showLoadingScreen();

    if (projectInput.includes('(')) {
        [projectTitle, projectId] = projectInput.match(/^(.*?)\s*\((.*?)\)$/).slice(1, 3);
    } else {
        projectId = projectInput;
    }

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
        alert(translations.need_required_fields);
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
                `Upload enviado para fila<br>` +
                `Projeto: ${projectTitle || 'N/A'} (ID: ${projectId})<br>` +
                `Capítulo: ${chapter || 'N/A'}${volume ? `, Volume: ${volume}` : ''}<br>` +
                `Linguagem: ${language}`
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
        console.error('Erro:', error);
        showNotifications(['Erro ao enviar dados.']);
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