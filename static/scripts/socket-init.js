// Conecta ao WebSocket
let socket = io();

socket.on("connect", () => {
    console.log(translations.script.socket.connect);
});
