document.addEventListener('DOMContentLoaded', function () {
    const isDebugEnabled = localStorage.getItem('debugEnabled') === 'true';
    const debugShowUI = localStorage.getItem('debugShowUI') === 'true';

    // Todos os eventos disponíveis para monitorar
    const allEvents = [
        // Mouse events
        'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 
        'mouseleave', 'mouseover', 'mouseout', 'contextmenu',
    
        // Touch events
        'touchstart', 'touchend', 'touchmove', 'touchcancel',
    
        // Pointer events
        'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave', 
        'pointerover', 'pointerout', 'gotpointercapture', 'lostpointercapture',
    
        // Keyboard events
        'keydown', 'keyup', 'keypress',
    
        // Focus events
        'focus', 'blur', 'focusin', 'focusout',
    
        // Form events
        'change', 'input', 'submit', 'reset', 'invalid',
    
        // Drag and drop events
        'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop',
    
        // Clipboard events
        'copy', 'cut', 'paste',
    
        // Media events
        'play', 'pause', 'playing', 'timeupdate', 'ended', 'volumechange', 'seeking', 'seeked',
    
        // Miscellaneous events
        'wheel', 'scroll', 'resize', 'error', 'load', 'unload', 'beforeunload', 
        'visibilitychange', 'select'
    ];

    // Valor padrão para eventos ativos
    const defaultEvents = [
        'click', 'touchstart', 'mousedown', 'mouseup', 'touchend', 'pointerdown', 'pointerup'
    ];

    // Recupera os filtros do localStorage ou usa o padrão
    let activeEvents = [];
    try {
        const storedFilters = JSON.parse(localStorage.getItem('debugFilters'));
        if (Array.isArray(storedFilters)) {
            activeEvents = storedFilters;
        } else {
            activeEvents = defaultEvents;
        }
    } catch (e) {
        console.warn('Erro ao carregar filtros do localStorage. Usando padrão.', e);
        activeEvents = defaultEvents;
    }

    // Criação da UI do painel de debug
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.width = '300px';
    debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.border = '1px solid #ccc';
    debugPanel.style.borderRadius = '8px';
    debugPanel.style.zIndex = 9999;
    debugPanel.style.display = isDebugEnabled && debugShowUI ? 'block' : 'none';
    debugPanel.style.overflow = 'hidden';
    debugPanel.style.transition = 'height 0.3s';
    debugPanel.style.height = '40px'; // Inicialmente minimizado
    debugPanel.style.cursor = 'grab';
    debugPanel.innerHTML = `
        <div id="debug-header" style="display: flex; justify-content: space-between; align-items: center; padding: 5px; cursor: grab; background-color: #333;">
            <span style="font-weight: bold;">Debug Logs</span>
            <button id="toggle-debug" style="background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; padding: 2px 5px;">+</button>
        </div>
        <div id="debug-content" style="max-height: 150px; overflow-y: auto; display: none;"></div>
    `;
    document.body.appendChild(debugPanel);

    const debugHeader = document.getElementById('debug-header');
    const debugContent = document.getElementById('debug-content');
    const toggleDebugButton = document.getElementById('toggle-debug');

    toggleDebugButton.addEventListener('click', function () {
        const isExpanded = debugContent.style.display === 'block';
        debugContent.style.display = isExpanded ? 'none' : 'block';
        debugPanel.style.height = isExpanded ? '40px' : '200px';
        toggleDebugButton.textContent = isExpanded ? '+' : '-';
    });

    // Sincroniza o estado do debug com o checkbox (se existir)
    const debugCheckbox = document.getElementById('debug_mode');
    if (debugCheckbox) {
        debugCheckbox.checked = isDebugEnabled;

        debugCheckbox.addEventListener('change', function () {
            const isChecked = this.checked;
            localStorage.setItem('debugEnabled', isChecked);
            debugPanel.style.display = isChecked && debugShowUI ? 'block' : 'none';
        });
    }

    // Alterna a visibilidade da UI
    const uiToggleCheckbox = document.getElementById('debug_ui_toggle');
    if (uiToggleCheckbox) {
        uiToggleCheckbox.checked = debugShowUI;

        uiToggleCheckbox.addEventListener('change', function () {
            const isChecked = this.checked;
            localStorage.setItem('debugShowUI', isChecked);
            debugPanel.style.display = isDebugEnabled && isChecked ? 'block' : 'none';
        });
    }

    // Sai se o debug não estiver ativado
    if (!isDebugEnabled) return;

    // Função para permitir mover o painel de debug
    let isDragging = false;
    let startX, startY, initialX, initialY;

    debugHeader.addEventListener('mousedown', function (event) {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
        const rect = debugPanel.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        debugHeader.style.cursor = 'grabbing';

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    });

    function onDrag(event) {
        if (!isDragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        debugPanel.style.left = `${initialX + dx}px`;
        debugPanel.style.top = `${initialY + dy}px`;
        debugPanel.style.bottom = 'auto'; // Remove "bottom" para permitir o movimento vertical
        debugPanel.style.right = 'auto'; // Remove "right" para permitir o movimento horizontal
    }

    function stopDrag() {
        isDragging = false;
        debugHeader.style.cursor = 'grab';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    // Função para criar e gerenciar o modal de filtros
    function createFilterModal() {
        const modal = document.createElement('div');
        modal.id = 'filter-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';
        modal.style.display = 'none'; // Inicialmente oculto
    
        const groupedEvents = {
            'Mouse events': ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'contextmenu'],
            'Touch events': ['touchstart', 'touchend', 'touchmove', 'touchcancel'],
            'Pointer events': ['pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerleave', 'pointerover', 'pointerout', 'gotpointercapture', 'lostpointercapture'],
            'Keyboard events': ['keydown', 'keyup', 'keypress'],
            'Focus events': ['focus', 'blur', 'focusin', 'focusout'],
            'Form events': ['change', 'input', 'submit', 'reset', 'invalid'],
            'Drag and drop events': ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'],
            'Clipboard events': ['copy', 'cut', 'paste'],
            'Media events': ['play', 'pause', 'playing', 'timeupdate', 'ended', 'volumechange', 'seeking', 'seeked'],
            'Miscellaneous events': ['wheel', 'scroll', 'resize', 'error', 'load', 'unload', 'beforeunload', 'visibilitychange', 'select']
        };
    
        const defaultEvents = ['click', 'touchstart', 'mousedown', 'mouseup', 'touchend', 'pointerdown', 'pointerup'];
    
        let modalContent = `
            <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 100%; text-align: center; overflow-y: auto; max-height: 80%;">
                <h3>Configurar Filtros de Eventos</h3>
                <form id="filter-form" style="text-align: left;">
        `;
    
        for (const [category, events] of Object.entries(groupedEvents)) {
            modalContent += `<h4>${category}</h4>`;
            events.forEach(event => {
                modalContent += `
                    <div>
                        <label>
                            <input type="checkbox" value="${event}" ${activeEvents.includes(event) ? 'checked' : ''}> ${event}
                        </label>
                    </div>
                `;
            });
        }
    
        modalContent += `
                </form>
                <button id="save-filters-btn" style="margin-top: 10px; background-color: #007bff; color: white; border: none; padding: 5px 10px; cursor: pointer;">Salvar Filtros</button>
                <button id="default-filters-btn" style="margin-top: 10px; background-color: #28a745; color: white; border: none; padding: 5px 10px; cursor: pointer;">Padrão</button>
                <button id="close-filter-modal" style="margin-top: 10px; background-color: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">Fechar</button>
            </div>
        `;
    
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    
        // Eventos para fechar o modal
        document.getElementById('close-filter-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    
        // Salvar filtros selecionados
        document.getElementById('save-filters-btn').addEventListener('click', () => {
            const selectedEvents = Array.from(
                document.querySelectorAll('#filter-form input[type="checkbox"]:checked')
            ).map((input) => input.value);
    
            localStorage.setItem('debugFilters', JSON.stringify(selectedEvents));
            updateEventListeners(selectedEvents);
            modal.style.display = 'none';
        });
    
        // Aplicar filtros padrão
        document.getElementById('default-filters-btn').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#filter-form input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = defaultEvents.includes(checkbox.value);
            });
        });
    
        return modal;
    }
    
    const filterModal = createFilterModal();

    // Botão de filtro
    const filterEventsBtn = document.getElementById('filter-events-btn');
    if (filterEventsBtn) {
        filterEventsBtn.addEventListener('click', () => {
            filterModal.style.display = 'flex';
        });
    }

    // Atualiza os eventos monitorados
    function updateEventListeners(events) {
        allEvents.forEach((eventType) => {
            document.body.removeEventListener(eventType, logEvent, true);
        });

        events.forEach((eventType) => {
            document.body.addEventListener(eventType, logEvent, true);
        });
    }

    function logEvent(event) {
        const t = translations.script.debug;  // Atalho para simplificar o acesso
    
        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '5px';
        logEntry.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        logEntry.style.paddingBottom = '5px';
    
        logEntry.innerHTML = `
            <div><strong>${t.event}:</strong> ${event.type}</div>
            <div><strong>${t.element}:</strong> ${event.target.tagName}</div>
            <div><strong>${t.id}:</strong> ${event.target.id || t.no_id}</div>
            <div><strong>${t.class}:</strong> ${event.target.className || t.no_class}</div>
            <div><strong>${t.coordinates}:</strong> (${event.clientX}, ${event.clientY})</div>
        `;
    
        debugContent.appendChild(logEntry);
        debugContent.scrollTop = debugContent.scrollHeight;
    
        // Logs no console
        console.groupCollapsed(`${t.event}: ${event.type}`);
        console.log(`${t.target_element}:`, event.target);
        console.log(`${t.element_id}: ${event.target.id || t.no_id}`);
        console.log(`${t.element_class}: ${event.target.className || t.no_class}`);
        console.log(`${t.element_type}: ${event.target.tagName}`);
        console.log(`${t.click_coordinates}: (${event.clientX}, ${event.clientY})`);
        console.groupEnd();
    }    

    // Inicializa os eventos ativos
    updateEventListeners(activeEvents);
});
