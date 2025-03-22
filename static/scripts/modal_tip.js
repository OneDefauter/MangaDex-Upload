document.addEventListener('DOMContentLoaded', function () {
    cB(tipName);
});

function cB(tipName) {
    const tipModal = document.getElementById('tipModal');
    const tipPages = document.querySelectorAll('.tip-page');
    const tipClose = document.querySelector('.tip-close');

    // Seletor de todos os "dots"
    const dots = document.querySelectorAll('.dot');

    let currentPage = 0;

    function showTipModal() {
        tipModal.style.display = 'flex';
        showPage(currentPage);
        updateDots(currentPage);
    }

    function showPage(pageIndex) {
        tipPages.forEach((page, index) => {
            if (index === pageIndex) {
                page.style.display = 'block';
                page.classList.add('fade-in-animation');
                // Remove a classe após a animação para permitir reinserir se necessário
                setTimeout(() => {
                    page.classList.remove('fade-in-animation');
                }, 500);
            } else {
                page.style.display = 'none';
            }
        });
    }    

    // Atualiza a classe "active" nas bolinhas
    function updateDots(pageIndex) {
        dots.forEach(dot => {
            if (parseInt(dot.getAttribute('data-step')) === pageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Botões "Continuar"
    const nextButtons = document.querySelectorAll('.tip-next');
    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentPage < tipPages.length - 1) {
                currentPage++;
                showPage(currentPage);
                updateDots(currentPage);
            }
        });
    });

    // Botões "Voltar"
    const prevButtons = document.querySelectorAll('.tip-prev');
    prevButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                showPage(currentPage);
                updateDots(currentPage);
            }
        });
    });

    // Botão "Finalizar"
    const finishButton = document.querySelector('.tip-finish');
    finishButton.addEventListener('click', () => {
        tipModal.classList.add('fade-out');

        // Quando a animação terminar, ocultar o modal de vez
        tipModal.addEventListener('animationend', () => {
            tipModal.style.display = 'none';
            tipModal.classList.remove('fade-out');
        }, { once: true });

        // Opcional: Marcar a dica como vista na API
        fetch('/api/mark_tip_as_seen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tip_name: tipName })
        });
    });

    // Fechar no "X"
    tipClose.addEventListener('click', () => {
        tipModal.style.display = 'none';
    });

    // Verifica se a dica já foi vista
    fetch(`/api/check_tip_seen?tip_name=${tipName}`)
        .then(response => response.json())
        .then(data => {
            if (!data.tip_seen) {
                showTipModal();
            } else {
                tipModal.style.display = 'none';
            }
        });

    // Adiciona o listener para as teclas de seta
    document.addEventListener('keydown', function (e) {
        // Verifica se o modal está visível
        if (tipModal.style.display === 'flex') {
            if (e.key === "ArrowRight") {
                // Avança para a próxima página
                if (currentPage < tipPages.length - 1) {
                    currentPage++;
                    showPage(currentPage);
                    updateDots(currentPage);
                }
            } else if (e.key === "ArrowLeft") {
                // Volta para a página anterior
                if (currentPage > 0) {
                    currentPage--;
                    showPage(currentPage);
                    updateDots(currentPage);
                }
            }
        }
    });
}