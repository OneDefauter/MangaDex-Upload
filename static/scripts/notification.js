// Função para garantir que o container de notificações exista
function ensureNotificationContainer() {
    // Verifica se o container de notificações já existe
    let notificationsContainer = document.getElementById('notifications');

    // Se não existir, cria e adiciona ao final do <body>
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications';
        notificationsContainer.className = 'notifications';
        document.body.appendChild(notificationsContainer); // Adiciona no final do <body>
    }
}

// Adiciona o container assim que o script é carregado
document.addEventListener('DOMContentLoaded', ensureNotificationContainer);

// Função para exibir notificações
function showNotifications(messages) {
    ensureNotificationContainer(); // Garante que o container existe
    const notificationsContainer = document.getElementById('notifications');
    messages.reverse().forEach((message, index) => {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `<p>${message}</p>`;
        notificationsContainer.appendChild(notification);

        // Remove a notificação após um tempo
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000 + index * 1000); // Delay entre notificações
        }, index * 2000); // Delay entre notificações
    });
}

function fetchNotifications() {
    fetch('/get_notifications')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const notifications = data.notifications;

                notifications.forEach(notification => {
                    if (notification.status === 'Concluído') {
                        showNotifications([`✅ Capítulo enviado com sucesso: ${notification.manga_title} - Capítulo ${notification.chapter}`]);
                    } else if (notification.status === 'Erro') {
                        showNotifications([`❌ Erro no envio do capítulo: ${notification.manga_title} - Capítulo ${notification.chapter}<br>Erro: ${notification.error}`]);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Erro ao buscar notificações:', error);
        });
}

// Chamar a função periodicamente
setInterval(fetchNotifications, 5000); // A cada 5 segundos