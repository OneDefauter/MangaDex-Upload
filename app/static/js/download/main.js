// Mostrar mais / menos descrição
(function () {
  const tS = (k, params = {}) => {
    const dict = (window.I18N_SCRIPT || {});
    let s = dict[k] || (
      k === 'download.desc.more' ? 'Mostrar mais' :
      k === 'download.desc.less' ? 'Mostrar menos' :
      k
    );
    for (const [p, v] of Object.entries(params)) {
      s = s.replaceAll(`{${p}}`, v);
    }
    return s;
  };

  const btn = document.getElementById('toggleDesc');
  const desc = document.getElementById('desc');
  if (!btn || !desc) return;

  let expanded = false;
  // estado inicial do label
  btn.textContent = tS('download.desc.more');

  btn.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      desc.classList.remove('truncate-2');
      btn.textContent = tS('download.desc.less');
    } else {
      desc.classList.add('truncate-2');
      btn.textContent = tS('download.desc.more');
    }
  });
})();

// Tooltips
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));

// Scroll pro topo quando trocar de aba de idioma
const langTabs = document.getElementById('langTabs');
if (langTabs) {
  langTabs.addEventListener('shown.bs.tab', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}