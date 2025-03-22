// Definir itemsList e lastSelectedIndex no escopo global para ser acessível por todas as funções
const itemsList = document.getElementById('items-list');
let lastSelectedIndex = null; // Inicialmente nulo
let groupCounter = 1; // Contador para os grupos
const usedColors = new Set();
let groups = {}; // Objeto para armazenar os grupos criados

let temporaryGroupData = {};

// Previne o menu de contexto (botão direito) em toda a página
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// Mostra o overlay de carregamento
const loadingOverlay = document.getElementById('loading-overlay');
const progressContainer = document.querySelector('.progress');
const progressBar = document.getElementById('progressBar');
const projectTitleElement = document.getElementById('project-title');

window.onload = function () {
    const progressBar = document.getElementById('progressBar');

    socket.on('get_progress_data_mult_upload', (data) => {
        if (data.is_running) {
            loadingOverlay.style.display = 'flex';

            // Verifica se o progresso é maior que 0%
            if (data.percentage > 0) {
                progressContainer.style.opacity = '1'; // Mostra a barra com fade-in
            } else {
                progressContainer.style.opacity = '0'; // Oculta a barra
            }

            progressBar.style.width = `${data.percentage}%`;
            console.log(`${t.script.main.progress} ${data.percentage}% (${data.completed}/${data.total})`);
        }
    });

    // Lida com mensagens de sucesso
    socket.on('success_message', (data) => {
        loadingOverlay.style.display = 'none';
        progressBar.style.width = '0%';

        console.log(data.message);
        showNotifications([t.script.main.upload_success]); // Exibe mensagem de sucesso

        // Verifica se há capítulos pulados
        if (data.skipped_uploads && data.skipped_uploads.length > 0) {
            const skippedMessages = data.skipped_uploads.map(chapter => `
                ${t.script.main.chapter_skiped}<br>
                ${t.script.main.project_} ${chapter.title}<br>
                ${t.script.main.chapter_} ${chapter.chapter}<br>
                ${t.script.main.language_} ${chapter.language}
            `);
            showNotifications(skippedMessages);
        }
    });

    // Lida com mensagens de erro
    socket.on('error_message', (data) => {
        console.error(`${t.script.main.error_occurred}: ${data.message}`);
        alert(`${t.script.main.error_occurred}: ${data.message}`);
    });

    socket.on('progress_update', (data) => {
        // Verifica se o progresso é maior que 0%
        if (data.percentage > 0) {
            progressContainer.style.opacity = '1'; // Mostra a barra com fade-in
        } else {
            progressContainer.style.opacity = '0'; // Oculta a barra
        }

        console.log(`${t.script.main.progress} ${data.percentage}% (${data.completed}/${data.total})`);
        progressBar.style.width = `${data.percentage}%`;
    });

    socket.on('loading_overlay_display', () => {
        loadingOverlay.style.display = 'flex';
        progressContainer.style.opacity = '0'; // Oculta a barra
        progressBar.style.width = '0%'; // Reinicia a barra de progresso
    });
};

// Função para criar botão temporário com animação
function createTemporaryButton(itemElement) {
    console.log(t.script.main.function_createTemporaryButton_called);

    // Remover qualquer botão "Criar Grupo" ou "Editar Grupo" existente
    const existingButtons = document.querySelectorAll('.create-group-btn');
    existingButtons.forEach(button => button.remove());

    // Obter todos os itens atualmente selecionados
    const selectedItems = document.querySelectorAll('.file-item.selected');
    let commonGroupName = null;

    // Verifica se TODOS os itens selecionados que possuem grupo pertencem ao mesmo grupo
    selectedItems.forEach(item => {
        if (item.dataset.groupName) {
            if (commonGroupName === null) {
                commonGroupName = item.dataset.groupName;
            } else if (commonGroupName !== item.dataset.groupName) {
                commonGroupName = null; // Se houver conflitos, não há um grupo comum
            }
        }
    });

    // Se existir um grupo comum entre os itens selecionados, use-o; senão, use o grupo do item clicado
    const groupName = commonGroupName || itemElement.dataset.groupName;

    // Criar o botão "Criar Grupo" ou "Editar Grupo"
    const button = document.createElement('button');
    button.textContent = groupName ? t.script.main.edit_group : t.script.main.create_group;
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

    // Para PC (usando Ctrl ou Shift)
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isShiftPressed = event.shiftKey;

    if (isCtrlPressed) {
        // Alternar seleção para o item atual
        item.classList.toggle('selected');
    } else if (isShiftPressed && lastSelectedIndex !== null) {
        // Seleção em intervalo
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
            const listItem = itemsList.children[i];
            if (!listItem.hasAttribute('data-group-name')) { // Verificação do grupo
                listItem.classList.add('selected');
            }
        }
    } else {
        // Seleção única (limpar outras seleções)
        Array.from(itemsList.children).forEach(child => {
            child.classList.remove('selected');
        });
        item.classList.add('selected');
    }

    // Atualizar o índice do último selecionado
    lastSelectedIndex = index;

    // Criar botão temporário "Criar Grupo"
    createTemporaryButton(item);
}

// Função para verificar se dois retângulos se intersectam
function rectsIntersect(rect1, rect2) {
    return !(
      rect2.left > rect1.right ||
      rect2.right < rect1.left ||
      rect2.top > rect1.bottom ||
      rect2.bottom < rect1.top
    );
}

function isModalOpen() {
    const modal = document.getElementById('group-modal');
    const overlay = document.getElementById('loading-overlay');
  
    return (
      (modal && (modal.style.display === 'flex' || modal.classList.contains('show'))) ||
      (overlay && (overlay.style.display === 'flex' || overlay.classList.contains('show')))
    );
}

(function() {
    const container = document.getElementById('folder-list');
    let isDragging = false;
    let startX, startY;
    let selectionBox = null;
    const buffer = 50; // margem extra para iniciar a seleção
  
    // Inicia a seleção no document
    document.addEventListener('mousedown', function(e) {
      if (isModalOpen()) return;
      if (e.button !== 0) return;
      
      // Verifica se o clique está dentro do container ou próximo dele (zona de buffer)
      const containerRect = container.getBoundingClientRect();
      if (
        e.clientX < containerRect.left - buffer ||
        e.clientX > containerRect.right + buffer ||
        e.clientY < containerRect.top - buffer ||
        e.clientY > containerRect.bottom + buffer
      ) {
        return; // Se estiver fora da área ampliada, não inicia a seleção
      }
  
      isDragging = true;
      startX = e.pageX;
      startY = e.pageY;
  
      // Cria o retângulo de seleção
      selectionBox = document.createElement('div');
      selectionBox.style.position = 'absolute';
      selectionBox.style.border = '1px dashed #0099ff';
      selectionBox.style.backgroundColor = 'rgba(0, 153, 255, 0.1)';
      selectionBox.style.pointerEvents = 'none';
      selectionBox.style.left = startX + 'px';
      selectionBox.style.top = startY + 'px';
      selectionBox.style.zIndex = '1000';
      document.body.appendChild(selectionBox);
  
      e.preventDefault();
    });
  
    document.addEventListener('mousemove', function(e) {
      if (isModalOpen()) return;
      if (!isDragging) return;
      const currentX = e.pageX;
      const currentY = e.pageY;
      const rectLeft = Math.min(startX, currentX);
      const rectTop = Math.min(startY, currentY);
      const rectWidth = Math.abs(startX - currentX);
      const rectHeight = Math.abs(startY - currentY);
  
      selectionBox.style.left = rectLeft + 'px';
      selectionBox.style.top = rectTop + 'px';
      selectionBox.style.width = rectWidth + 'px';
      selectionBox.style.height = rectHeight + 'px';
  
      // Percorre os itens e atualiza a seleção
      document.querySelectorAll('.file-item').forEach(item => {
        // Pula itens que já estão em um grupo
        if (item.hasAttribute('data-group-name')) return;
  
        const itemRect = item.getBoundingClientRect();
        const selectionRect = selectionBox.getBoundingClientRect();
        if (rectsIntersect(itemRect, selectionRect)) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    });
  
    document.addEventListener('mouseup', function(e) {
      if (isModalOpen()) return;
      if (isDragging) {
        isDragging = false;
        if (selectionBox) {
          selectionBox.parentNode.removeChild(selectionBox);
          selectionBox = null;
        }
      }
    });
  
    // Função para verificar se dois retângulos se intersectam
    function rectsIntersect(rect1, rect2) {
      return !(
        rect2.left > rect1.right ||
        rect2.right < rect1.left ||
        rect2.top > rect1.bottom ||
        rect2.bottom < rect1.top
      );
    }
})();  

function openGroupModal(groupName) {
    console.log(`${t.script.main.editing_group} ${groupName}`);

    const scanTagsContainer = document.getElementById('selected-groups'); // Container para as tags de scan
    scanTagsContainer.innerHTML = ''; // Limpar grupos/scan selecionados

    document.getElementById('scan-group').value = '';
    document.getElementById('scan-suggestions').style.display = 'none';

    // Obter os dados do grupo existente
    const group = groups[groupName];
    if (!group) {
        console.error(t.script.main.group_not_found.replace("{group_name}", groupName));
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

    modal.classList.add('edit-mode'); // Adicionar classe para modo de edição

    // Preencher os campos do modal com os dados do grupo
    document.getElementById('group-name').value = group.groupName;

    // Adicionar as tags de scanGroup no contêiner
    if (group.scans && Array.isArray(group.scans)) {
        group.scans.forEach(scan => {
            // Verifica se há um nome e ID antes de adicionar a tag
            if (scan.name && scan.id) {
                addScanTag(scan.name, scan.id);
            }
        });
    }

    document.getElementById('volume').value = group.volume || '';

    // Selecionar o grupo correto no <select>
    const groupSelect = document.getElementById('group-select');
    groupSelect.value = groupName;

    // Preencher a lista de itens selecionados
    reloadItemsInModal();

    // Configurar o botão para salvar alterações no grupo
    document.getElementById('create-group-btn').textContent = t.script.main.save_changes;
    document.getElementById('create-group-btn').onclick = function () {
        if (!modal.classList.contains('edit-mode')) {
            return;
        }
        showNotifications([t.script.main.saving_changes_group.replace("{group_name}", groupName)]);
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
    console.log(t.script.main.remove_item_temporarily.replace("{index}", index));

    // Verificar se é o último item na lista
    if (temporaryGroupData.items.length === 1) {
        const confirmDeleteGroup = confirm(t.script.main.delete_group_exclude_item);
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
        chapterInput.placeholder = t.script.main.chapter;

        titleInput.type = 'text';
        titleInput.value = item.title || ''; // Título
        titleInput.placeholder = t.script.main.title;

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

        // Se o item é novo, aplica um fundo verde (você pode ajustar a cor conforme preferir)
        if (item.isNew) {
            listItem.style.backgroundColor = "#d4edda"; // Verde claro
        }

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
    console.log(`${t.script.main.deleting_group} ${groupName}`);

    // Remover o grupo do objeto groups
    if (groups[groupName]) {
        delete groups[groupName];
    } else {
        console.error(t.script.main.group_not_found.replace("{group_name}", groupName));
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

    showNotifications([t.script.main.group_deleted.replace("{group_name}", groupName)]);

    // Fechar o modal com animação
    closeModal();

    console.log(t.script.main.group_deleted.replace("{group_name}", groupName));
}

function saveGroupChanges(groupName) {
    console.log(t.script.main.save_changes_group.replace("{group_name}", groupName));

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
        const chapterInput = listItem.querySelector(`input[placeholder=${t.script.main.chapter}]`);
        const titleInput = listItem.querySelector(`input[placeholder=${t.script.main.title}]`);
        const filename = listItem.dataset.filename;

        if (!filename) {
            console.error(t.script.main.filename_not_found_in_list, listItem);
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

    console.log(t.script.main.updated_items, updatedItems);

    // Calcular quantos itens foram removidos ou adicionados
    const originalCount = groups[groupName]?.items.length || 0;;
    const newCount = updatedItems.length;
    const removedCount = originalCount > newCount ? originalCount - newCount : 0;
    const addedCount = newCount > originalCount ? newCount - originalCount : 0;

    // Criar mensagens para remoção e adição, se houver
    let changeMessage = "";
    if (removedCount > 0) {
        changeMessage += t.script.main.group_change_remove_item.replace("{removedCount}", removedCount).replace("{group_name}", groupName);
    }
    if (addedCount > 0) {
        changeMessage += t.script.main.group_change_add_item.replace("{addedCount}", addedCount).replace("{group_name}", groupName);
    }

    // Atualizar o grupo com os novos dados
    groups[groupName] = {
        ...temporaryGroupData, // Manter os dados anteriores
        scans: scanTags,        // Atualizar as scans
        volume,                 // Atualizar o volume
        items: updatedItems     // Atualizar os itens com os novos valores
    };

    console.log(t.script.main.group_after_update.replace("{group_name}", groupName), groups[groupName]);

    // Atualizar visualmente os itens na interface
    const allFileItems = document.querySelectorAll('.file-item');
    allFileItems.forEach(fileItem => {
        const filename = fileItem.querySelector('p')?.textContent.trim();
        if (filename && !updatedItems.some(item => item.filename === filename) && fileItem.dataset.groupName === groupName) {
            // Limpar o dataset e a cor
            fileItem.style.backgroundColor = '';
            delete fileItem.dataset.groupName;
        }
    });

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

    // Exibir notificação com a mensagem de atualização, incluindo adições e remoções
    showNotifications([t.script.main.group_updated.replace("{group_name}", groupName)]);
    if (changeMessage) {
        showNotifications([changeMessage]);
    }

    // Fechar o modal
    closeModal();

    console.log(t.script.main.save_changes_group.replace("{group_name}", groupName));
}

// Função para exibir o modal de grupo
function showGroupModal() {
    console.log(t.script.main.function_showGroupModal_called); // Log para verificar se a função foi chamada
    const modal = document.getElementById('group-modal');
    const selectedItemsList = document.getElementById('selected-items-list');
    const scanTagsContainer = document.getElementById('selected-groups'); // Container para as tags de scan
    const VolumeContainer = document.getElementById('volume');
    document.getElementById('scan-group').value = '';
    document.getElementById('scan-suggestions').style.display = 'none';
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
        chapterInput.placeholder = t.script.main.chapter;

        titleInput.type = 'text';
        titleInput.value = title; // Preencher com o título extraído
        titleInput.placeholder = t.script.main.title;

        // Adiciona um dataset ao elemento de lista para guardar o nome do arquivo original
        listItem.dataset.filename = item.querySelector('p').textContent;

        listItem.appendChild(chapterInput);
        listItem.appendChild(titleInput);
        selectedItemsList.appendChild(listItem);
    });

    // Incrementar o contador de grupos antes de definir o nome
    const groupName = `${t.script.main.group_name} ${groupCounter++}`;
    document.getElementById('group-name').value = groupName;

    // Selecionar "Criar Novo Grupo" no <select>
    const groupSelect = document.getElementById('group-select');
    groupSelect.value = `${t.script.main.create_new_group}`;

    modal.style.display = 'flex'; // Exibir o modal
    modal.classList.remove('hide'); // Remover classe de saída (se presente)
    modal.classList.add('show'); // Adicionar classe de entrada

    modal.classList.add('create-mode'); // Adicionar classe para modo de criação

    // Configurar o botão para fechar o modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);

    // Gerenciar o evento de clique para o botão "Criar Grupo"
    const createGroupButton = document.getElementById('create-group-btn');
    createGroupButton.textContent = `${t.script.main.create_group}`;

    // **Remover event listeners antigos para evitar múltiplas execuções**
    createGroupButton.replaceWith(createGroupButton.cloneNode(true)); // Limpar eventos antigos
    document.getElementById('create-group-btn').addEventListener('click', function () {
        if (!modal.classList.contains('create-mode')) {
            return;
        }

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

        console.log(`${t.script.main.created_group}:`, { groupName, scans: scanTags, volume, color, items });

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

        showNotifications([t.script.main.group_created.replace("{group_name}", groupName)]); // Exibir mensagem de sucesso

        // Fechar o modal
        closeModal();
    });
}

function closeModal() {
    const modal = document.getElementById('group-modal');

    // Adicionar a classe de saída
    modal.classList.remove('show');
    modal.classList.add('hide');
    if (modal.classList.contains('create-mode')) {
        modal.classList.remove('create-mode');
    } else if (modal.classList.contains('edit-mode')) {
        modal.classList.remove('edit-mode');
    }

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

    console.log(t.script.main.modal_closed);
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
    } else {
        // Desabilita o botão de criar e editar grupo
        const groupBtn = document.getElementById('group-btn');
        groupBtn.style.display = 'none';
    }
});

document.addEventListener('keydown', function (event) {
    // Verificar se Ctrl + A (ou Cmd + A no macOS) foi pressionado
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        // Obter o elemento ativo no momento
        const activeElement = document.activeElement;

        // Verificar se o elemento ativo é um input, textarea ou está dentro do modal
        if (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.closest('#group-modal') // Substitua '#group-modal' pelo ID do modal, se necessário
        ) {
            // Permitir o comportamento padrão (selecionar o texto no input ou modal)
            return;
        }

        // Impedir o comportamento padrão (selecionar o texto na página)
        event.preventDefault();

        // Seleciona todos os itens na lista que NÃO possuem o atributo data-group-name
        const items = document.querySelectorAll('.file-item:not([data-group-name])');

        items.forEach(item => {
            item.classList.add('selected');
        });
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
        alert(t.script.main.need_project);
        return;
    }

    if (!folderPath) {
        alert(t.script.main.need_valid_path);
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
        .then(response => {
            console.log('Status:', response.status);
            if (!response.ok) {
                throw new Error('response:>' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                itemsList.innerHTML = ''; // Limpa a lista
                let tipName = 'multi_upload_page_2';
                if (isAndroid) {
                    updateModalTipAndroid();
                } else {
                    updateModalTipPC();
                }

                cB(tipName);

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
                alert(`${t.script.main.error_proccess_path}: ` + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(t.script.main.error_send_path);
        });
    
    setTimeout(() => {
        loadItens();
    }
    , 1000);
});

document.getElementById('upload-btn').addEventListener('click', function () {
    const folderPath = document.getElementById('parent-folder').value.trim();
    const project = document.getElementById('project-id').value.trim();
    const language = document.getElementById('language').value.trim();

    if (Object.keys(groups).length === 0) {
        showNotifications([t.script.main.no_groups]);
        return;
    }

    socket.emit('loading_overlay_display');

    socket.emit('mult-upload-send',
        {
            groups: groups,
            folder_path: folderPath,
            project: project,
            language: language,
            long_strip: long_strip
        }
    );
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
                groups = {}; // Limpa os grupos
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
                alert(`${t.script.main.error_proccess_path}: ` + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(t.script.main.error_send_path);
        })
        .finally(() => {
            loadingOverlay.style.display = 'none';
        });
    
    
    setTimeout(() => {
        loadItens();
    }
    , 1000);
});

function updateProjectTitle(title) {
    if (projectTitleElement) {
        projectTitleElement.textContent = `${t.script.main.project_} ${title}`;
    } else {
        console.warn(t.script.main.title_element_not_found);
    }
}

function updateGroupButton() {
    const groupBtn = document.getElementById('group-btn');
    const selectedItems = document.querySelectorAll('.file-item.selected');
    
    if (selectedItems.length === 0) {
        groupBtn.classList.add('disabled');
        groupBtn.textContent = 'Criar Grupo';
    } else {
        groupBtn.classList.remove('disabled');
        // Se pelo menos um item selecionado já possuir grupo, exibe "Editar Grupo"
        const hasGroup = Array.from(selectedItems).some(item => item.dataset.groupName);
        groupBtn.textContent = hasGroup ? 'Editar Grupo' : 'Criar Grupo';
    }
}

document.getElementById('group-btn').addEventListener('click', () => {
    const groupBtn = document.getElementById('group-btn');
    if (groupBtn.classList.contains('disabled')) return; // Se não houver seleção, não faz nada
    
    const selectedItems = document.querySelectorAll('.file-item.selected');
    const hasGroup = Array.from(selectedItems).some(item => item.dataset.groupName);
    
    if (hasGroup) {
        // Se algum item selecionado já possui grupo, abre o modal de edição.
        // Caso queira identificar qual grupo editar, pode pegar o primeiro item com grupo, por exemplo:
        const itemWithGroup = Array.from(selectedItems).find(item => item.dataset.groupName);
        openGroupModal(itemWithGroup.dataset.groupName);
    } else {
        // Se nenhum item possui grupo, abre o modal para criação de um novo grupo.
        showGroupModal();
    }
});
