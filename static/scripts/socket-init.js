// Conecta ao WebSocket
let socket = io();

socket.on("connect", () => {
    console.log(translations.script.socket.connect);
    // showNotifications([`${translations.script.socket.connect}`]);
});

socket.on('disconnect', (reason) => {
    console.log(translations.script.socket.disconnect, reason);
    showNotifications([`${translations.script.socket.disconnect}`]);
});

socket.on('connect_error', (err) => {
    console.error(translations.script.socket.connect_error, err.message);
});

socket.on('reconnect_attempt', () => {
    console.log(translations.script.socket.reconnect_attempt);
});

socket.on('reconnect', (attemptNumber) => {
    const msg = translations.script.socket.reconnect_success.replace("{attemptNumber}", attemptNumber);
    console.log(msg);
    showNotifications([`${translations.script.socket.msg}`]);
});