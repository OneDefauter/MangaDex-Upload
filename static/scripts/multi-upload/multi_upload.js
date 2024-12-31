// Definir itemsList e lastSelectedIndex no escopo global para ser acessível por todas as funções
const itemsList = document.getElementById('items-list');
let lastSelectedIndex = null; // Inicialmente nulo
let groupCounter = 1; // Contador para os grupos
const usedColors = new Set();
let groups = {}; // Objeto para armazenar os grupos criados

let temporaryGroupData = {};


// Função para criar botão temporário com animação
function createTemporaryButton(itemElement) {
    console.log('createTemporaryButton called');

    // Remover qualquer botão "Criar Grupo" ou "Editar Grupo" existente
    const existingButtons = document.querySelectorAll('.create-group-btn');
    existingButtons.forEach(button => button.remove());

    // Verificar se o item pertence a um grupo
    const groupName = itemElement.dataset.groupName;

    // Criar o botão "Criar Grupo" ou "Editar Grupo"
    const button = document.createElement('button');
    button.textContent = groupName ? 'Editar Grupo' : 'Criar Grupo';
    button.className = 'create-group-btn';

    // Adicionar o botão acima do item clicado
    itemElement.appendChild(button);

    // Função para remover o botão com animação
    const startFadeOut = () => {
        if (itemElement.contains(button)) {
            button.classList.remove('fade-in');
            button.classList.add('fade-out');

            // Remover o botão após a animação de desaparecimento
            button.addEventListener('animationend', () => {
                if (itemElement.contains(button)) {
                    itemElement.removeChild(button);
                }
            });
        }
    };

    // Adicionar evento para abrir o modal de criação ou edição de grupo
    button.addEventListener('click', function () {
        startFadeOut(); // Inicia a animação de desaparecimento ao clicar
        if (groupName) {
            openGroupModal(groupName); // Editar o grupo existente
        } else {
            showGroupModal(); // Criar um novo grupo
        }
    });

    // Aplicar animação para o botão aparecer
    button.classList.add('fade-in');

    // Remover o botão automaticamente após 3 segundos
    setTimeout(startFadeOut, 3000);
}

// Modificar função de clique para preservar cores dos grupos existentes
function handleItemClick(event, index) {
    const item = event.currentTarget;
    const checkbox = item.querySelector('.item-checkbox');
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';

    // Verificar se é um clique no checkbox ou no item
    const isCheckboxClick = event.target.classList.contains('item-checkbox');

    // Para dispositivos móveis (usando checkboxes)
    if (isAndroid && isCheckboxClick) {
        if (checkbox.checked) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }

    // Para PC (usando Ctrl ou Shift)
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;

    if (isCtrlPressed) {
        // Alternar seleção para o item atual
        item.classList.toggle('selected');
        checkbox.checked = item.classList.contains('selected');
    } else if (isShiftPressed && lastSelectedIndex !== null) {
        // Seleção em intervalo
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
            const listItem = itemsList.children[i];
            listItem.classList.add('selected');
            if (isAndroid) { listItem.querySelector('.item-checkbox').checked = true; }
        }
    } else {
        // Seleção única (limpar outras seleções)
        Array.from(itemsList.children).forEach(child => {
            child.classList.remove('selected');
            if (isAndroid) { child.querySelector('.item-checkbox').checked = false; }
        });
        item.classList.add('selected');
        if (isAndroid) { checkbox.checked = true; }
    }

    // Atualizar o índice do último selecionado
    lastSelectedIndex = index;

    // Criar botão temporário "Criar Grupo"
    createTemporaryButton(item);
}

function openGroupModal(groupName) {
    console.log(`Editing group: ${groupName}`);

    // Obter os dados do grupo existente
    const group = groups[groupName];
    if (!group) {
        console.error(`Group "${groupName}" not found.`);
        return;
    }

    // Criar uma cópia temporária dos dados do grupo
    temporaryGroupData = JSON.parse(JSON.stringify(group));

    // Obter os itens selecionados atualmente na interface
    const selectedItems = document.querySelectorAll('.file-item.selected');

    // Adicionar os itens sem grupo à lista temporária com destaque
    selectedItems.forEach(item => {
        if (!item.dataset.groupName) {
            const filename = item.querySelector('p').textContent;

            // Verificar se o item já está na lista temporária
            if (!temporaryGroupData.items.some(i => i.filename === filename)) {
                const { chapter, title } = extractChapterAndTitle(filename);
                temporaryGroupData.items.push({
                    chapter: chapter,
                    title: title,
                    filename,
                    isNew: true // Indicar que o item foi adicionado recentemente
                });
            }
        }
    });

    // Exibir o modal
    const modal = document.getElementById('group-modal');
    modal.style.display = 'flex';
    modal.classList.remove('hide'); // Remover classe de saída (se presente)
    modal.classList.add('show'); // Adicionar classe de entrada

    // Preencher os campos do modal com os dados do grupo
    document.getElementById('group-name').value = group.groupName;
    document.getElementById('scan-group').value = group.scanGroup || '';
    document.getElementById('volume').value = group.volume || '';

    // Selecionar o grupo correto no <select>
    const groupSelect = document.getElementById('group-select');
    groupSelect.value = groupName;

    // Preencher a lista de itens selecionados
    reloadItemsInModal();

    // Configurar o botão para salvar alterações no grupo
    document.getElementById('create-group-btn').textContent = 'Salvar Alterações';
    document.getElementById('create-group-btn').onclick = function () {
        saveGroupChanges(groupName);
    };

    // Configurar o botão "Excluir Grupo"
    const deleteButton = document.getElementById('delete-group-btn');
    deleteButton.style.display = 'inline-block'; // Mostrar o botão
    deleteButton.onclick = function () {
        deleteButton.style.display = 'none';
        deleteGroup(groupName);
    };

    // Configurar o botão para fechar o modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
}

function removeItemTemporarily(index) {
    console.log(`Attempting to remove item ${index} temporarily`);

    // Verificar se é o último item na lista
    if (temporaryGroupData.items.length === 1) {
        const confirmDeleteGroup = confirm('Remover o último item irá excluir o grupo. Deseja continuar?');
        if (confirmDeleteGroup) {
            deleteGroup(temporaryGroupData.groupName); // Excluir o grupo inteiro
            document.getElementById('delete-group-btn').style.display = 'none';
            document.getElementById('delete-group-btn').addEventListener('click', closeModal); // Fechar o modal
        }
        return; // Interromper a remoção do item
    }

    // Remover o item da cópia temporária
    temporaryGroupData.items.splice(index, 1);

    // Recarregar o modal com os dados temporários
    reloadItemsInModal();
}

function reloadItemsInModal() {
    const selectedItemsList = document.getElementById('selected-items-list');
    selectedItemsList.innerHTML = ''; // Limpar lista anterior

    temporaryGroupData.items.forEach((item, index) => {
        const listItem = document.createElement('li');
        const chapterInput = document.createElement('input');
        const titleInput = document.createElement('input');

        // Configurar inputs de capítulo e título
        chapterInput.type = 'text';
        chapterInput.value = item.chapter || ''; // Capítulo
        chapterInput.placeholder = 'Capítulo';

        titleInput.type = 'text';
        titleInput.value = item.title || ''; // Título
        titleInput.placeholder = 'Título';

        // Adicionar o índice e filename ao dataset do item
        listItem.dataset.index = index;
        listItem.dataset.filename = item.filename; // Configurar filename no dataset

        // Adicionar uma exibição do filename para diferenciar capítulos
        const filenameLabel = document.createElement('span');
        filenameLabel.textContent = ` (${item.filename})`;
        filenameLabel.style.marginLeft = '10px';
        filenameLabel.style.fontSize = '0.9em';
        filenameLabel.style.color = 'gray';

        // Adicionar inputs ao item da lista
        listItem.appendChild(chapterInput);
        listItem.appendChild(titleInput);
        listItem.appendChild(filenameLabel);

        // Criar botão de remoção
        const removeButton = document.createElement('button');
        removeButton.className = 'btn-remove-item';
        removeButton.innerHTML = '<i class="fi fi-rr-cross"></i>'; // Ícone de remoção
        removeButton.onclick = () => removeItemTemporarily(index);

        // Adicionar botão ao item
        listItem.appendChild(removeButton);

        // Adicionar item à lista
        selectedItemsList.appendChild(listItem);
    });
}

function deleteGroup(groupName) {
    console.log(`Deleting group: ${groupName}`);

    // Remover o grupo do objeto groups
    if (groups[groupName]) {
        delete groups[groupName];
    } else {
        console.error(`Group "${groupName}" not found.`);
        return;
    }

    // Atualizar os itens na interface para limpar associações ao grupo excluído
    const items = document.querySelectorAll(`.file-item[data-group-name="${groupName}"]`);
    items.forEach(item => {
        item.removeAttribute('style'); // Remover todos os estilos
        delete item.dataset.groupName; // Remover o dataset do grupo
    });

    // Atualizar o <select> no modal para remover o grupo excluído
    const groupSelect = document.getElementById('group-select');
    const optionToRemove = Array.from(groupSelect.options).find(option => option.value === groupName);
    if (optionToRemove) {
        groupSelect.removeChild(optionToRemove);
    }

    // Fechar o modal com animação
    closeModal();

    console.log(`Group "${groupName}" deleted successfully.`);
}

function saveGroupChanges(groupName) {
    console.log(`Saving changes for group: ${groupName}`);

    // Obter o volume e as tags de scans
    const volume = document.getElementById('volume').value.trim();
    const scanTags = Array.from(document.getElementById('selected-groups').querySelectorAll('.tag span')).map(tag => ({
        name: tag.textContent.trim(),
        id: tag.dataset.id || null // Caso tenha um dataset para ID
    }));

    // Preparar uma lista para os itens atualizados
    const updatedItems = [];
    document.querySelectorAll('#selected-items-list li').forEach(listItem => {
        // Capturar capítulo e título de cada item no modal
        const chapterInput = listItem.querySelector('input[placeholder="Capítulo"]');
        const titleInput = listItem.querySelector('input[placeholder="Título"]');
        const filename = listItem.dataset.filename;

        if (!filename) {
            console.error('Filename not found for list item:', listItem);
            return; // Ignorar itens sem filename
        }

        // Adicionar o item atualizado na lista
        updatedItems.push({
            chapter: chapterInput ? chapterInput.value.trim() : '',
            title: titleInput ? titleInput.value.trim() : '',
            filename
        });

        // Atualizar os valores de capítulo e título no DOM
        const fileItem = Array.from(document.querySelectorAll('.file-item')).find(
            el => el.querySelector('p').textContent.trim() === filename
        );
        if (fileItem) {
            fileItem.dataset.chapter = chapterInput ? chapterInput.value.trim() : '';
            fileItem.dataset.title = titleInput ? titleInput.value.trim() : '';
        }
    });

    console.log('Updated items:', updatedItems);

    // Atualizar o grupo com os novos dados
    groups[groupName] = {
        ...temporaryGroupData, // Manter os dados anteriores
        scans: scanTags, // Atualizar as scans
        volume, // Atualizar o volume
        items: updatedItems // Atualizar os itens com os novos valores
    };

    console.log(`Group "${groupName}" after update:`, groups[groupName]);

    // Atualizar visualmente os itens na interface
    updatedItems.forEach(item => {
        const fileItem = Array.from(document.querySelectorAll('.file-item')).find(
            el => el.querySelector('p').textContent.trim() === item.filename
        );

        if (fileItem) {
            // Aplicar o grupo e cor correspondente
            fileItem.dataset.groupName = groupName;
            fileItem.style.backgroundColor = groups[groupName].color;
        }
    });

    // Limpar o temporaryGroupData após salvar
    temporaryGroupData = {};

    // Fechar o modal
    closeModal();

    console.log(`Group "${groupName}" updated successfully.`);
}

// Função para exibir o modal de grupo
function showGroupModal() {
    console.log('showGroupModal called'); // Log para verificar se a função foi chamada
    const modal = document.getElementById('group-modal');
    const selectedItemsList = document.getElementById('selected-items-list');
    const scanTagsContainer = document.getElementById('selected-groups'); // Container para as tags de scan
    const VolumeContainer = document.getElementById('volume');
    selectedItemsList.innerHTML = '';
    scanTagsContainer.innerHTML = ''; // Limpar grupos/scan selecionados
    VolumeContainer.value = '';

    // Obter todos os itens selecionados
    const selectedItems = document.querySelectorAll('.file-item.selected');

    selectedItems.forEach(item => {
        const listItem = document.createElement('li');
        const chapterInput = document.createElement('input');
        const titleInput = document.createElement('input');

        // Extrair capítulo e título do nome do item
        const { chapter, title } = extractChapterAndTitle(item.textContent);

        chapterInput.type = 'text';
        chapterInput.value = chapter; // Preencher com o capítulo extraído
        chapterInput.placeholder = 'Capítulo';

        titleInput.type = 'text';
        titleInput.value = title; // Preencher com o título extraído
        titleInput.placeholder = 'Título';

        // Adiciona um dataset ao elemento de lista para guardar o nome do arquivo original
        listItem.dataset.filename = item.querySelector('p').textContent;

        listItem.appendChild(chapterInput);
        listItem.appendChild(titleInput);
        selectedItemsList.appendChild(listItem);
    });

    // Incrementar o contador de grupos antes de definir o nome
    const groupName = `Grupo ${groupCounter++}`;
    document.getElementById('group-name').value = groupName;

    // Selecionar "Criar Novo Grupo" no <select>
    const groupSelect = document.getElementById('group-select');
    groupSelect.value = `${translations.create_new_group}`;

    modal.style.display = 'flex'; // Exibir o modal
    modal.classList.remove('hide'); // Remover classe de saída (se presente)
    modal.classList.add('show'); // Adicionar classe de entrada

    // Configurar o botão para fechar o modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);

    // Gerenciar o evento de clique para o botão "Criar Grupo"
    const createGroupButton = document.getElementById('create-group-btn');
    createGroupButton.textContent = `${translations.create_group}`;

    // **Remover event listeners antigos para evitar múltiplas execuções**
    createGroupButton.replaceWith(createGroupButton.cloneNode(true)); // Limpar eventos antigos
    document.getElementById('create-group-btn').addEventListener('click', function () {
        // Coletar dados do modal para salvar o grupo
        const groupName = document.getElementById('group-name').value.trim();
        const volume = document.getElementById('volume').value.trim();

        // Captura as tags de grupos selecionados
        const scanTags = Array.from(scanTagsContainer.querySelectorAll('.tag span')).map(tag => ({
            name: tag.textContent.trim(),
            id: tag.dataset.id || null
        }));

        const color = groups[groupName]?.color || generateUniqueColor();

        // Limpar estilos antigos e preparar itens
        const items = [];
        selectedItemsList.querySelectorAll('li').forEach(listItem => {
            const chapter = listItem.querySelector('input[type="text"]:nth-child(1)').value.trim();
            const title = listItem.querySelector('input[type="text"]:nth-child(2)').value.trim();
            const filename = listItem.dataset.filename;

            // Resetar itens residuais
            const fileItem = Array.from(document.querySelectorAll('.file-item')).find(
                el => el.querySelector('p').textContent === filename
            );
            if (fileItem) {
                fileItem.style.backgroundColor = ''; // Resetar cor
                delete fileItem.dataset.groupName; // Remover grupo antigo
            }

            items.push({ chapter, title, filename });
        });

        console.log(`${translations.created_group}:`, { groupName, scans: scanTags, volume, color, items });

        // Adicionar o grupo na seleção de grupos apenas se ele não existir
        const existingOption = Array.from(groupSelect.options).find(option => option.value === groupName);
        if (!existingOption) {
            const newOption = document.createElement('option');
            newOption.value = groupName;
            newOption.textContent = groupName;
            groupSelect.appendChild(newOption);
        }

        // Aplicar cor e grupo aos itens
        items.forEach(item => {
            const fileItem = Array.from(document.querySelectorAll('.file-item')).find(
                el => el.querySelector('p').textContent === item.filename
            );
            if (fileItem) {
                fileItem.style.backgroundColor = color; // Aplicar nova cor
                fileItem.dataset.groupName = groupName; // Atribuir novo grupo
            }
        });

        // Salvar o grupo no objeto global
        groups[groupName] = { groupName, scans: scanTags, volume, color, items };

        // Fechar o modal
        closeModal();
    });
}

function closeModal() {
    const modal = document.getElementById('group-modal');

    // Adicionar a classe de saída
    modal.classList.remove('show');
    modal.classList.add('hide');

    // Aguardar a animação de saída antes de ocultar
    modal.addEventListener('transitionend', function onTransitionEnd() {
        modal.style.display = 'none'; // Esconder após a animação
        modal.classList.remove('hide'); // Resetar a classe de saída
        modal.removeEventListener('transitionend', onTransitionEnd);
    });

    // Limpar seleção de itens
    document.querySelectorAll('.file-item.selected').forEach(item => {
        item.classList.remove('selected');
    });

    console.log(translations.modal_closed);
}

// Função para extrair o número do capítulo e o título do nome do item
function extractChapterAndTitle(name) {
    const chapterMatch = name.match(/\d+(\.\d+)?/); // Extrair o número do capítulo
    const titleMatch = name.match(/\((.*?)\)/); // Extrair título dentro de parênteses

    return {
        chapter: chapterMatch ? chapterMatch[0] : '', // Retornar capítulo, ou vazio se não encontrado
        title: titleMatch ? titleMatch[1].trim() : '' // Retornar título, ou vazio se não encontrado
    };
}

// Função para gerar uma cor hexadecimal aleatória
function generateUniqueColor() {
    let newColor;

    do {
        // Gerar uma cor aleatória no formato hexadecimal
        newColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    } while (usedColors.has(newColor)); // Garantir que a cor não foi usada anteriormente

    // Armazenar a nova cor no conjunto de cores usadas
    usedColors.add(newColor);

    return newColor;
}

document.addEventListener('DOMContentLoaded', function () {
    const parentFolderInput = document.getElementById('parent-folder');
    const isAndroid = parentFolderInput.getAttribute('data-is-android') === 'true';

    if (isAndroid) {
        // Preenche o campo com a localização padrão
        parentFolderInput.value = 'Download/MangaDex Upload (uploads)';
        // Torna o campo não editável
        parentFolderInput.readOnly = true;
    }
});

// Lógica para enviar o caminho da pasta e carregar os itens
document.getElementById('continue-btn').addEventListener('click', function () {
    const project = document.getElementById('project-id').value.trim();
    const folderPath = document.getElementById('parent-folder').value.trim();
    const sendButton = document.getElementById('upload-btn'); // Botão Enviar Todos
    const noItemsMessage = document.getElementById('no-items-message'); // Mensagem vazia
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';

    if (!project) {
        alert(translations.need_project);
        return;
    }

    if (!folderPath) {
        alert(translations.need_valid_path);
        return;
    }

    // Enviar o caminho para o back-end
    fetch('/multi-upload-step', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_path: folderPath })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                itemsList.innerHTML = ''; // Limpa a lista

                // Verifica se há itens retornados
                if (data.items.length === 0) {
                    // Exibe mensagem de nenhum item encontrado
                    noItemsMessage.style.display = 'block';
                    sendButton.disabled = true; // Desativa botão Enviar Todos

                    // Ocultar o formulário e exibir a lista
                    document.getElementById('folder-input-group').style.display = 'none';
                    document.getElementById('folder-list').style.display = 'block';

                } else {
                    // Oculta mensagem e habilita botão
                    noItemsMessage.style.display = 'none';
                    sendButton.disabled = false;

                    // Adiciona itens à lista
                    data.items.forEach((item, index) => {
                        const listItem = document.createElement('li');
                    
                        // Adicionar classe base
                        listItem.classList.add('file-item');
                    
                        // Ícone e nome do item
                        const icon = document.createElement('i');
                        icon.className = item.is_directory ? 'fi fi-rr-folder' : 'fi fi-rr-file';
                    
                        const itemName = document.createElement('p');
                        itemName.textContent = item.name;
                    
                        if (isAndroid) {
                            // Checkbox para seleção
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'item-checkbox';
                            checkbox.addEventListener('change', () => {
                                if (checkbox.checked) {
                                    listItem.classList.add('selected');
                                } else {
                                    listItem.classList.remove('selected');
                                }
                            });
                    
                            listItem.appendChild(checkbox);
                        }
                    
                        // Adicionar ícone e nome ao item
                        listItem.appendChild(icon);
                        listItem.appendChild(itemName);
                    
                        // Adicionar evento de clique no item
                        listItem.addEventListener('click', (event) => handleItemClick(event, index));
                    
                        // Adicionar o item à lista
                        itemsList.appendChild(listItem);
                    });

                    // Ocultar o formulário e exibir a lista
                    document.getElementById('folder-input-group').style.display = 'none';
                    document.getElementById('folder-list').style.display = 'block';
                }
            } else {
                alert(`${translations.error_proccess_path}: ` + data.error);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert(translations.error_send_path);
        });
});

document.getElementById('upload-btn').addEventListener('click', function () {
    const folderPath = document.getElementById('parent-folder').value.trim();
    const project = document.getElementById('project-id').value.trim();
    const language = document.getElementById('language').value.trim();

    // Mostra o overlay de carregamento
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    fetch('/mult-upload-send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ groups: groups, folder_path: folderPath, project: project, language: language })
    })
        .then(response => response.json())
        .then(data => {
            // Processa a resposta do servidor
            if (data.success) {
                // alert(translations.upload_success);
                showNotifications([translations.upload_success]); // Exibe mensagem de sucesso
                // Verifica se há capítulos pulados
                if (data.skipped_uploads && data.skipped_uploads.length > 0) {
                    const skippedMessages = data.skipped_uploads.map(chapter => `
                        ${translations.chapter_skiped}<br>
                        ${translations.project_} ${chapter.title}<br>
                        ${translations.chapter} ${chapter.chapter}<br>
                        ${translations.language_} ${chapter.language}
                    `);
                    showNotifications(skippedMessages); // Notificações dos capítulos pulados
                }
            } else {
                // alert(`${translations.error_occurred}: ` + data.message);
                showNotifications([`${translations.error_occurred}: ` + data.message]);
            }
        })
        .catch(error => {
            console.error(`${translations.error_send}:`, error);
            alert(translations.error_occurred_upload);
        })
        .finally(() => {
            // Oculta o overlay de carregamento após a operação
            loadingOverlay.style.display = 'none';
        });
});

document.getElementById('reload-btn').addEventListener('click', function() {
    const folderPath = document.getElementById('parent-folder').value.trim();
    const loadingOverlay = document.getElementById('loading-overlay');
    const sendButton = document.getElementById('upload-btn'); // Botão Enviar Todos
    const noItemsMessage = document.getElementById('no-items-message'); // Mensagem vazia
    const isAndroid = document.getElementById('parent-folder').getAttribute('data-is-android') === 'true';

    // Mostra o overlay de carregamento
    loadingOverlay.style.display = 'flex';

    fetch('/multi-upload-step', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_path: folderPath })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                itemsList.innerHTML = ''; // Limpa a lista

                // Verifica se há itens retornados
                if (data.items.length === 0) {
                    // Exibe mensagem de nenhum item encontrado
                    noItemsMessage.style.display = 'block';
                    sendButton.disabled = true; // Desativa botão Enviar Todos
                } else {
                    // Oculta mensagem e habilita botão
                    noItemsMessage.style.display = 'none';
                    sendButton.disabled = false;

                    // Adiciona itens à lista
                    data.items.forEach((item, index) => {
                        const listItem = document.createElement('li');
                    
                        // Adicionar classe base
                        listItem.classList.add('file-item');
                    
                        // Ícone e nome do item
                        const icon = document.createElement('i');
                        icon.className = item.is_directory ? 'fi fi-rr-folder' : 'fi fi-rr-file';
                    
                        const itemName = document.createElement('p');
                        itemName.textContent = item.name;
                    
                        if (isAndroid) {
                            // Checkbox para seleção
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'item-checkbox';
                            checkbox.addEventListener('change', () => {
                                if (checkbox.checked) {
                                    listItem.classList.add('selected');
                                } else {
                                    listItem.classList.remove('selected');
                                }
                            });
                        
                            listItem.appendChild(checkbox);
                        }
                    
                        // Adicionar ícone e nome ao item
                        listItem.appendChild(icon);
                        listItem.appendChild(itemName);
                    
                        // Adicionar evento de clique no item
                        listItem.addEventListener('click', (event) => handleItemClick(event, index));
                    
                        // Adicionar o item à lista
                        itemsList.appendChild(listItem);
                    });

                }
            } else {
                alert(`${translations.error_proccess_path}: ` + data.error);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert(translations.error_send_path);
        })
        .finally(() => {
            loadingOverlay.style.display = 'none';
        });
});
