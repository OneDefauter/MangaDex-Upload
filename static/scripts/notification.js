// Variável para rastrear a sequência de teclas pressionadas
let keySequence = [];

// Sequência específica de teclas (por exemplo: "test" = teclas "t", "e", "s", "t")
const targetSequence = ["t", "e", "s", "t"];

// Evento para capturar as teclas pressionadas
document.addEventListener("keydown", (event) => {
    keySequence.push(event.key.toLowerCase());

    // Verifica se a sequência contém a sequência alvo
    if (keySequence.slice(-targetSequence.length).join("") === targetSequence.join("")) {
        // Mostra uma notificação de teste
        showNotifications([`${translations.script.notification.test_message}`]);
        keySequence = []; // Reseta a sequência após a detecção
    }

    // Limita o tamanho da sequência rastreada para evitar crescimento desnecessário
    if (keySequence.length > targetSequence.length) {
        keySequence.shift();
    }
});

// Função para garantir que o container de notificações exista
function ensureNotificationContainer() {
    let notificationsContainer = document.getElementById("notifications");
    if (!notificationsContainer) {
        notificationsContainer = document.createElement("div");
        notificationsContainer.id = "notifications";
        notificationsContainer.className = "notifications";
        document.body.appendChild(notificationsContainer);
    }
}

// Adiciona o container assim que o script é carregado
document.addEventListener("DOMContentLoaded", ensureNotificationContainer);

// Função para exibir notificações
function showNotifications(messages) {
    ensureNotificationContainer(); // Garante que o container existe
    const notificationsContainer = document.getElementById("notifications");

    messages.reverse().forEach((message, index) => {
        const notification = document.createElement("div");
        notification.className = "notification";

        // Adiciona o conteúdo da mensagem e a barra de progresso
        notification.innerHTML = `
        <p>${message}</p>
        <div class="progress-bar"></div>
        `;

        // Anexa a notificação ao container
        notificationsContainer.appendChild(notification);

        // Adiciona a classe para exibir a notificação
        setTimeout(() => {
            notification.classList.add("show");
        }, 100);

        // Remove a notificação após o tempo definido
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
                notification.remove();
            }, 500); // Tempo para a animação de saída
        }, 5000 + index * 3000); // Tempo total da notificação
    });
}

socket.on("get_notification", (data) => {
    let message = "";
    switch (data.status) {
        case 0:
            message = translations.script.notification.upload.success
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter);
            break;
        case 1:
            message = translations.script.notification.upload.error
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter)
                .replace("{error}", data.error);
            break;
        case 2:
            message = translations.script.notification.upload.cancelled
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter)
                .replace("{detail}", data.detail);
            break;
        case 3:
            message = translations.script.notification.upload.starting
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter);
            break;
    }

    showNotifications([message]);
});

socket.on("notification_download", (data) => {
    let message = "";
    switch (data.status) {
        case 0:
            message = translations.script.notification.download.success
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter);
            break;
        case 1:
            message = translations.script.notification.download.error
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter)
                .replace("{error}", data.error);
            break;
        case 2:
            message = translations.script.notification.download.cancelled
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter)
                .replace("{details}", data.details);
            break;
        case 3:
            message = translations.script.notification.download.starting
                .replace("{manga_title}", data.manga_title)
                .replace("{chapter}", data.chapter);
            break;
    }

    showNotifications([message]);
});

socket.on("notification_message", (data) => {
    showNotifications([data.message]);
});