// --- helpers de FLIP (First -> Last -> Invert -> Play) --------------------
function measurePairs(els){ return els.map(el => [el, el.getBoundingClientRect()]); }

function flipFromFirst(firstPairs, duration=600, easing='cubic-bezier(.22,1,.36,1)'){
  // mede o "depois" no próximo frame e anima a diferença
  requestAnimationFrame(() => {
    firstPairs.forEach(([el, first]) => {
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top  - last.top;
      if (!dx && !dy) return;

      // start invert
      el.style.transition = 'none';
      el.style.transform  = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth; // reflow

      // play
      el.style.transition = `transform ${duration}ms ${easing}`;
      el.style.transform  = '';
      const clean = (e)=>{
        if(e.propertyName==='transform'){
          el.style.transition = '';
          el.removeEventListener('transitionend', clean);
        }
      };
      el.addEventListener('transitionend', clean);
    });
  });
}
// -------------------------------------------------------------------------

// type: "success" | "error" | "warning" | "info"
function showToast(message, type="info", opts={}){
  const delay = Number(opts.delay ?? 5000);
  const FADE_MS = 220; // deve bater com seu CSS: opacity 220ms ease
  const container = document.getElementById('toastStack');

  const beforePairs = measurePairs(Array.from(container.children));

  const el = document.createElement('div');
  el.className = `toast toast-${type} toast-enter`;
  el.role = 'alert'; el.setAttribute('aria-live','assertive'); el.setAttribute('aria-atomic','true');
  el.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close ${type==='warning' ? '' : 'btn-close-white'} me-2 m-auto"
              data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>
    <div class="toast-timer"></div>
  `;

  container.prepend(el);
  flipFromFirst(beforePairs);
  requestAnimationFrame(() => { el.classList.remove('toast-enter'); });

  // barra de tempo sincronizada
  const bar = el.querySelector('.toast-timer');
  if (bar) bar.style.animation = `shrink ${delay/1000}s linear forwards`;

  // ⬇️ Mudança principal: autohide OFF e hide manual cronometrado
  const t = new bootstrap.Toast(el, { autohide: false });

  // agendar o hide para que o FADE termine junto com a barra
  const hideAt = Math.max(0, delay - FADE_MS);
  const hideTimer = setTimeout(() => t.hide(), hideAt);

  // se o usuário fechar manualmente, cancelamos o timer
  el.addEventListener('hide.bs.toast', () => clearTimeout(hideTimer));

  // anima pilha ao remover
  let siblingsFirst = null;
  el.addEventListener('hide.bs.toast', () => {
    const siblings = Array.from(container.children).filter(n => n !== el);
    siblingsFirst = measurePairs(siblings);
  });

  el.addEventListener('hidden.bs.toast', () => {
    el.remove();
    if (siblingsFirst) flipFromFirst(siblingsFirst);
  });

  t.show();
}

socket.on('notify', (data) => {
  console.log('[socket] notify', data);
  showToast(data.message, data.type, data.options);
});

// exemplos:
// showToast("Carregando dados...", "info", {delay: 8000});
// showToast("Preencha todos os campos.", "warning");
// showToast("Capítulo salvo com sucesso!", "success");
// showToast("Erro ao salvar capítulo!", "error");