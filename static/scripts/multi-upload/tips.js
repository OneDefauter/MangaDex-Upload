// Configuração das Dicas
const tipOverlay = document.getElementById('tip-overlay');
const tipText = document.getElementById('tip-text');
const tipGif = document.getElementById('tip-gif');
const tipNextBtn = document.getElementById('tip-next-btn');
const tipPrevBtn = document.getElementById('tip-prev-btn');
const tipIndicators = document.getElementById('tip-indicators');

const tips = [
    { id: 'project', text: translations.project || 'Projeto: Identifique o projeto ao qual este upload pertence.', gif: '/static/tips/multi_upload/project.gif' },
    { id: 'language', text: translations.language || 'Linguagem: Escolha o idioma do mangá.', gif: '/static/tips/multi_upload/language.gif' },
    { id: 'parent-folder', text: translations.parent_folder || 'Pasta: Indique a pasta onde os capítulos estão armazenados.', gif: '/static/tips/multi_upload/folder.gif' },
    { id: 'create-group', text: translations.create_group || 'Crie grupos para enviar capítulos.<br>Selecione capítulos com o botão esquerdo do mouse e use CTRL ou SHIFT para selecionar mais de um.', gif: '/static/tips/multi_upload/create_group.gif' },
    { id: 'edit-group', text: translations.edit_group || 'Edite grupos selecionando um capítulo com grupo ou clique com o botão direito do mouse em um capítulo com grupo.', gif: '/static/tips/multi_upload/edit_group.gif' }
];

let currentTipIndex = -1;

function updateIndicators() {
    tipIndicators.innerHTML = ''; // Limpar os indicadores
    for (let i = 0; i < tips.length; i++) {
        const indicator = document.createElement('span');
        if (i === currentTipIndex) {
            indicator.classList.add('active');
        }
        tipIndicators.appendChild(indicator);
    }
}

function showTip(index) {
    if (index >= 0 && index < tips.length) {
        const currentField = document.getElementById(tips[index].id);
        if (currentField) {
            currentField.classList.add('highlight');
        }
        tipText.innerHTML = tips[index].text;
        tipGif.src = tips[index].gif;

        tipPrevBtn.style.display = index > 0 ? 'inline-block' : 'none'; // Esconder "Voltar" na primeira dica
        tipNextBtn.textContent = index < tips.length - 1 ? translations.next || 'Continuar' : translations.finish || 'Finalizar';

        updateIndicators();
    }
}

function showTipOverlay() {
    tipOverlay.style.display = 'flex'; // Mostrar as dicas
    currentTipIndex = 0;
    showTip(currentTipIndex);
}

tipNextBtn.addEventListener('click', function () {
    if (currentTipIndex >= 0) {
        const previousField = document.getElementById(tips[currentTipIndex].id);
        if (previousField) {
            previousField.classList.remove('highlight');
        }
    }

    currentTipIndex++;
    if (currentTipIndex < tips.length) {
        showTip(currentTipIndex);
    } else {
        fetch('/api/mark_tip_as_seen', { // Marcar como vista ao finalizar
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tip_name: 'multi_upload_page' })
        }).then(() => {
            tipOverlay.style.display = 'none'; // Fechar as dicas
        });
    }
});

tipPrevBtn.addEventListener('click', function () {
    if (currentTipIndex > 0) {
        const previousField = document.getElementById(tips[currentTipIndex].id);
        if (previousField) {
            previousField.classList.remove('highlight');
        }
        currentTipIndex--;
        showTip(currentTipIndex);
    }
});

// Mostrar as dicas se ainda não foram vistas
fetch('/api/check_tip_seen?tip_name=multi_upload_page')
    .then(response => response.json())
    .then(data => {
        if (!data.tip_seen) {
            showTipOverlay();
        } else {
            tipOverlay.style.display = 'none';
        }
    });
