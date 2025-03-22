// Conecta ao WebSocket
let socket = io();

socket.on("connect", () => {
    console.log(translations.script.socket.connect);
    socket.emit('progress_data_mult_upload')
});

socket.on("disconnect", () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'none';
    console.log(translations.script.socket.disconnect);
})