// Criar o menu de contexto personalizado
const contextMenu = document.createElement('div');
contextMenu.id = 'context-menu';
contextMenu.style.position = 'absolute';
contextMenu.style.display = 'none';
contextMenu.style.zIndex = '1000';
contextMenu.style.backgroundColor = '#ffffff';
contextMenu.style.border = '1px solid #ccc';
contextMenu.style.borderRadius = '8px';
contextMenu.style.padding = '8px';
contextMenu.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
contextMenu.style.transition = 'opacity 0.3s ease';
contextMenu.style.opacity = '0';
document.body.appendChild(contextMenu);

// Adicionar opções ao menu de contexto
const createGroupOption = document.createElement('div');
createGroupOption.textContent = '${translations.create_group}';
createGroupOption.style.cursor = 'pointer';
createGroupOption.style.padding = '8px';
createGroupOption.style.borderRadius = '4px';
createGroupOption.style.transition = 'background-color 0.3s ease';
createGroupOption.addEventListener('click', () => {
    showGroupModal(); // Abrir o modal para criar um grupo
    hideContextMenu();
});
createGroupOption.addEventListener('mouseenter', () => {
    createGroupOption.style.backgroundColor = '#f0f0f0';
});
createGroupOption.addEventListener('mouseleave', () => {
    createGroupOption.style.backgroundColor = 'transparent';
});
contextMenu.appendChild(createGroupOption);

const editGroupOption = document.createElement('div');
editGroupOption.textContent = '${translations.edit_group}';
editGroupOption.style.cursor = 'pointer';
editGroupOption.style.padding = '8px';
editGroupOption.style.borderRadius = '4px';
editGroupOption.style.transition = 'background-color 0.3s ease';
editGroupOption.addEventListener('click', () => {
    const groupName = contextMenu.dataset.groupName;
    if (groupName) {
        openGroupModal(groupName); // Chamar a função para abrir o modal de edição
    }
    hideContextMenu();
});
editGroupOption.addEventListener('mouseenter', () => {
    editGroupOption.style.backgroundColor = '#f0f0f0';
});
editGroupOption.addEventListener('mouseleave', () => {
    editGroupOption.style.backgroundColor = 'transparent';
});
contextMenu.appendChild(editGroupOption);

// Ocultar menu de contexto
const hideContextMenu = () => {
    contextMenu.style.opacity = '0'; // Aplicar transição de desaparecimento
    setTimeout(() => {
        contextMenu.style.display = 'none';
    }, 300); // Sincronizar com a duração da transição
};

// Mostrar menu de contexto
const showContextMenu = (event, item, groupName) => {
    event.preventDefault();

    // Definir a posição e exibir o menu
    contextMenu.dataset.groupName = groupName || ''; // Guardar o nome do grupo no menu
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.display = 'block';
    setTimeout(() => {
        contextMenu.style.opacity = '1';
    }, 0); // Mostrar com transição

    // Controlar visibilidade das opções
    if (groupName) {
        createGroupOption.style.display = 'none'; // Não mostrar "Criar Grupo"
        editGroupOption.style.display = 'block'; // Mostrar "Editar Grupo"
    } else {
        createGroupOption.style.display = 'block'; // Mostrar "Criar Grupo"
        editGroupOption.style.display = 'none'; // Não mostrar "Editar Grupo"
    }

    // Fechar automaticamente após 3 segundos
    setTimeout(hideContextMenu, 3000);
};

// Fechar o menu de contexto ao clicar fora
document.addEventListener('click', hideContextMenu);

// Adicionar evento de clique com o botão direito em cada item
const contextItemsList = document.querySelector('#items-list');
const observeItems = new MutationObserver(() => {
    document.querySelectorAll('.file-item').forEach(item => {
        item.removeEventListener('contextmenu', onContextMenu); // Evitar múltiplos binds
        item.addEventListener('contextmenu', onContextMenu);
    });
});

// Função para verificar itens selecionados
const getSelectionInfo = () => {
    const selectedItems = document.querySelectorAll('.file-item.selected');
    const groupNames = Array.from(selectedItems).map(item => item.dataset.groupName);
    const hasMixedGroups = groupNames.some(name => name) && groupNames.some(name => !name);
    const uniqueGroupNames = [...new Set(groupNames.filter(name => name))];
    return { hasMixedGroups, groupName: uniqueGroupNames.length === 1 ? uniqueGroupNames[0] : null };
};

// Função para lidar com o clique com o botão direito
const onContextMenu = (event) => {
    event.preventDefault(); // Prevenir o menu de contexto padrão do navegador

    const item = event.currentTarget; // O item que foi clicado com o botão direito
    const groupName = item.dataset.groupName; // Verificar o grupo associado

    if (!item.classList.contains('selected') && !groupName) {
        return; // Não mostrar menu se o item não está selecionado e não pertence a um grupo
    }

    // Mostrar o menu de contexto na posição clicada
    showContextMenu(event, item, groupName);
};

// Observar mudanças na lista de itens
observeItems.observe(contextItemsList, { childList: true });

// Aplicar eventos aos itens já carregados
document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('contextmenu', onContextMenu);
});

// CSS para o menu (adicionar no seu arquivo CSS ou dentro de um <style> no HTML)
const style = document.createElement('style');
style.textContent = `
    #context-menu div:hover {
        background-color: #e0e0e0;
    }
    #context-menu {
        font-family: Arial, sans-serif;
        font-size: 14px;
    }
`;
document.head.appendChild(style);
