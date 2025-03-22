document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".interactive-tooltip").forEach(icon => {
        icon.addEventListener("click", function (event) {
            event.stopPropagation(); // Evita que o clique no ícone seja capturado pelo evento de fechar

            let tooltipId = this.getAttribute("data-tooltip-id");
            let tooltip = document.getElementById(tooltipId);

            if (!tooltip) {
                console.error("Tooltip não encontrado para:", tooltipId);
                return;
            }

            // Adiciona um pequeno atraso para evitar conflito com o evento de fechamento
            setTimeout(() => {
                // Fecha todos os outros tooltips antes de abrir o atual
                document.querySelectorAll(".tooltip-box").forEach(t => {
                    if (t.id !== tooltipId) {
                        t.classList.remove("active");
                        t.classList.add("desactive");
                    }
                });

                // Alterna entre active e desactive
                if (tooltip.classList.contains("desactive")) {
                    tooltip.classList.remove("desactive");
                    tooltip.classList.add("active");
                } else {
                    tooltip.classList.remove("active");
                    tooltip.classList.add("desactive");
                }
            }, 50); // Pequeno atraso para evitar conflito com o clique fora
        });
    });

    // Fecha o tooltip ao clicar fora dele
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".tooltip-box") && !event.target.classList.contains("interactive-tooltip")) {
            document.querySelectorAll(".tooltip-box").forEach(tooltip => {
                tooltip.classList.remove("active");
                tooltip.classList.add("desactive");
            });
        }
    });
});
