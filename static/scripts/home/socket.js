let dataC = '';

socket.on("connect", () => {
    socket.emit("check_on_login")
});

document.addEventListener("DOMContentLoaded", function () {
    // Referências aos elementos do modal
    const modal_queue_confirmation = document.querySelector("#confirmation-modal.custom-modal");
    const backdrop = document.getElementById("modal-backdrop");

    // Função para abrir o modal
    function showModalForConfirmation() {
        modal_queue_confirmation.style.display = "block";
        backdrop.style.display = "block";
    }

    // Função para fechar o modal
    function closeModalForConfirmation() {
        modal_queue_confirmation.style.display = "none";
        backdrop.style.display = "none";
    }

    // Função para ouvir o evento do socket
    socket.on("check_on_login_data", (data) => {
        dataC = data
        showModalForConfirmation(); // Abre o modal automaticamente quando o evento é recebido
    });

    // Fechar o modal ao clicar no fundo escuro
    backdrop.addEventListener("click", () => {
        socket.emit('reset_queue')
        closeModalForConfirmation();
    });

    // Fechar o modal ao apertar Esc
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            socket.emit('reset_queue')
            closeModalForConfirmation();
        }
    });

    // Botão "Apagar Tudo"
    document.getElementById("delete-all").addEventListener("click", () => {
        socket.emit('reset_queue')
        closeModalForConfirmation();
    });

    // Botão "Enviar Novamente"
    document.getElementById("send-again").addEventListener("click", () => {
        socket.emit('send_queue', dataC)
        closeModalForConfirmation();
    });

    socket.on("close_modal_for_confirmation", () => { closeModalForConfirmation(); });
});
