// settings/render_nav.js
(() => {
  // i18n helper
  function T(key, fallback){
    const path = String(key||'').split('.');
    let obj = (window.I18N_WEB || {});
    for (const p of path){ if (obj && typeof obj === 'object' && p in obj) obj = obj[p]; else return fallback; }
    return (typeof obj === 'string') ? obj : fallback;
  }

  const LIST_ID   = 'navConfigList';
  const PREVIEW_ID= 'navConfigPreview';
  const RESET_ID  = 'navReset'; // opcional

  const DEFAULT_HREFS = {
    home: '/', settings: '/settings', queue: '/queue',
    upload: '/upload', 'upload-complex': '/upload/complex',
    download: '/download', edit: '/edit', create: '/create',
    logs: '/logs', updates: '/updates'
  };

  const esc = (s='') => String(s).replace(/[&<>"']/g, m => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;' }[m]
  ));

  function lockHrefs(cfg){
    let changed = false;
    cfg.forEach(it => {
      if (DEFAULT_HREFS[it.id] && it.href !== DEFAULT_HREFS[it.id]) {
        it.href = DEFAULT_HREFS[it.id]; changed = true;
      }
    });
    if (changed) NavConfig.save(cfg);
  }

  function buildItem(it){
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-start gap-3';
    li.dataset.id = it.id;

    li.innerHTML = `
      <div class="handle pt-1" title="${esc(T('settings.navbar.drag','Arraste'))}" style="cursor:grab">⋮⋮</div>
      <div class="flex-grow-1 min-w-0">
        <div class="d-flex align-items-center justify-content-between">
          <div class="form-check m-0">
            <input class="form-check-input js-enable" type="checkbox" ${it.enabled ? 'checked' : ''} id="en-${esc(it.id)}">
            <label class="form-check-label fw-semibold" for="en-${esc(it.id)}">${esc(it.text || it.id)}</label>
          </div>
          <small class="text-secondary">id: <code>${esc(it.id)}</code></small>
        </div>

        <div class="row g-2 mt-2">
          <div class="col-sm-6">
            <label class="form-label small mb-1">${esc(T('settings.navbar.label','Rótulo'))}</label>
            <input class="form-control js-text" type="text" value="${esc(it.text || it.id)}" disabled />
          </div>
        </div>
      </div>
    `;

    li.querySelector('.js-enable')?.addEventListener('change', (ev) => {
      NavConfig.update(cfg => {
        const item = cfg.find(x => x.id === it.id);
        if (item) item.enabled = !!ev.target.checked;
      });
      updatePreview();
      window.dispatchEvent(new Event('nav:config-changed'));
    });

    li.querySelector('.js-text')?.addEventListener('input', (ev) => {
      const txt = ev.target.value;
      const label = li.querySelector(`label[for="en-${it.id}"]`);
      if (label) label.textContent = txt || it.id;
      NavConfig.update(cfg => {
        const item = cfg.find(x => x.id === it.id);
        if (item) item.text = txt;
      });
      updatePreview();
      window.dispatchEvent(new Event('nav:config-changed'));
    });

    return li;
  }

  function renderList(){
    const ul = document.getElementById(LIST_ID);
    if (!ul) return;
    const cfg = NavConfig.get();
    lockHrefs(cfg);

    ul.innerHTML = '';
    cfg.sort((a,b)=> a.order - b.order).forEach(it => ul.appendChild(buildItem(it)));

    if (window.Sortable && !ul._sortableInit) {
      new Sortable(ul, {
        animation: 150,
        handle: '.handle',
        onEnd: () => {
          const ids = [...ul.querySelectorAll('li[data-id]')].map((li)=> li.dataset.id);
          NavConfig.update(cfg => {
            ids.forEach((id, idx) => { const item = cfg.find(x => x.id === id); if (item) item.order = idx; });
          });
          updatePreview();
          window.dispatchEvent(new Event('nav:config-changed'));
        }
      });
      ul._sortableInit = true;
    }

    updatePreview();
  }

  function updatePreview(){
    const small = document.getElementById(PREVIEW_ID);
    if (!small) return;
    const cfg = NavConfig.get();
    const visible = cfg.filter(x => x.enabled).sort((a,b)=>a.order-b.order).map(x => x.text || x.id);
    small.textContent = visible.length
      ? `${T('settings.navbar.visible','Visíveis:')} ${visible.join(' → ')}`
      : T('settings.navbar.none','Nenhum item visível');
  }

  function wireReset(){
    const btn = document.getElementById(RESET_ID);
    if (!btn) return;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault?.();
      NavConfig.reset();
      lockHrefs(NavConfig.get());
      renderList();
      try { window.showToast?.(T('settings.navbar.restored','Navegação restaurada.'), 'success'); } catch {}
    });
  }

  function init(){
    if (!window.NavConfig) {
      console.warn('[render_nav] NavConfig (nav.seed.js) não encontrado.');
      return;
    }
    renderList();
    wireReset();
    window.addEventListener('nav:config-changed', () => renderList());
  }

  window.initNavConfigPage = init;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById(LIST_ID)) init();
  });
})();
