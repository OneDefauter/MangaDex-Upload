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
        }, index * 2000); // Delay entre notificações
    });
}
