// Botão e Modal de Upload Avançado
const advancedUploadBtn = document.getElementById('advanced-upload-btn');
const advancedUploadModal = document.getElementById('advanced-upload-modal');
const closeAdvancedUploadModal = advancedUploadModal.querySelector('.close-btn');

// Abrir o modal ao clicar no botão "Upload Avançado"
advancedUploadBtn.addEventListener('click', () => {
    advancedUploadModal.style.display = 'block';
});

// Fechar o modal ao clicar no botão "fechar"
closeAdvancedUploadModal.addEventListener('click', () => {
    advancedUploadModal.style.display = 'none';
});

// Fechar o modal ao clicar fora dele
window.addEventListener('click', (event) => {
    if (event.target === advancedUploadModal) {
        advancedUploadModal.style.display = 'none';
    }
});
