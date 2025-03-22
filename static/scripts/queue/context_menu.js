document.addEventListener("DOMContentLoaded", () => {
    // Impede o menu de contexto padrão na página
    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    // Cria o menu de contexto
    const contextMenu = document.createElement("div");
    contextMenu.id = "custom-context-menu";
    contextMenu.style.display = "none";
    document.body.appendChild(contextMenu);

    // Usa event delegation para capturar qualquer clique dentro da lista
    document.addEventListener("contextmenu", (event) => {
        let item = event.target.closest(".item-list li"); // Pega o <li> mais próximo

        // Se o clique for dentro de um <li> interno, sobe até o <li> principal que contém o status e data-key
        if (item && !item.classList.length) {
            item = item.closest(".item-list > li");
        }

        if (item && item.hasAttribute("data-key")) { // Garante que é um item principal
            event.preventDefault();
            showContextMenu(event, item);
        }
    });

    // Fecha o menu ao clicar fora dele
    document.addEventListener("click", () => {
        contextMenu.style.display = "none";
    });

    // Exibe o menu de contexto
    function showContextMenu(event, item) {
        const itemStatus = item.classList[0]; // Obtém a primeira classe do item (o status)
        const actions = getActionsForStatus(itemStatus);

        if (!actions.length) return;

        // Preenche o menu com as ações disponíveis
        contextMenu.innerHTML = "";
        actions.forEach(action => {
            const menuItem = document.createElement("div");
            menuItem.className = "context-menu-item";
            menuItem.textContent = action.label;
            menuItem.addEventListener("click", () => {
                handleContextMenuAction(action.action, item);
                contextMenu.style.display = "none";
            });
            contextMenu.appendChild(menuItem);
        });

        // Ajusta a posição do menu
        contextMenu.style.display = "block";
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
    }

    // Define ações disponíveis para cada status
    function getActionsForStatus(status) {
        const actions = {
            "Aguardando": [
                { label: translations.queue.context_menu.cancel, action: "cancel" },
                { label: translations.queue.context_menu.prioritize, action: "prioritize" }
            ],
            "Processando": [
                { label: translations.queue.context_menu.cancel, action: "cancel" }
            ],
            "Concluído": [
                { label: translations.queue.context_menu.retry, action: "retry" },
                { label: translations.queue.context_menu.delete, action: "delete" }
            ],
            "Cancelado": [
                { label: translations.queue.context_menu.retry, action: "retry" },
                { label: translations.queue.context_menu.delete, action: "delete" }
            ],
            "Erro": [
                { label: translations.queue.context_menu.retry, action: "retry" },
                { label: translations.queue.context_menu.delete, action: "delete" }
            ]
        };
        return actions[status] || [];
    }

    // Executa a ação selecionada
    function handleContextMenuAction(action, item) {
        const itemKey = item.getAttribute("data-key");
        const itemType = item.getAttribute("data-type"); // Obtém o tipo do item (ex: "upload", "download")

        if (!itemType) {
            console.error("Erro: item não tem um tipo definido!");
            return;
        }

        const requestBody = JSON.stringify({ type: itemType, key: itemKey });

        if (action === "cancel") {
            fetch("/delete_item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
            }).then(() => {
                // alert("Item cancelado!");
            });
        } else if (action === "delete") {
            fetch("/delete_item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
            }).then(() => {
                // alert("Item excluído!");
            });
        } else if (action === "retry") {
            fetch("/retry_item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
            }).then(() => {
                // alert("Item reenviado!");
            });
        } else if (action === "prioritize") {
            fetch("/prioritize_item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
            }).then(() => {
               // alert("O item foi priorizado!");
            });
        }
    }
});