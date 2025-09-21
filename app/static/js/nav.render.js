(() => {
  const UL_ID = 'mainNavList';

  // i18n helper: busca em window.I18N_WEB por caminho "a.b.c"
  const tr = (key, fallback = '') => {
    let cur = (window.I18N_WEB || {});
    for (const p of String(key).split('.')) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else { cur = undefined; break; }
    }
    return (typeof cur === 'string' && cur) ? cur : fallback;
  };

  const escapeHtml = (s='') =>
    s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function makeItem(it){
    // rótulo SEMPRE vem do i18n, não do storage
    const label = tr(`navbar.items.${it.id}`, it.id);
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.dataset.navId = it.id;
    li.innerHTML = `<a class="nav-link" href="${it.href}">${escapeHtml(label)}</a>`;
    return li;
  }

  function markActive(ul){
    const path = (location.pathname || '/').replace(/\/+$/,'') || '/';
    ul.querySelectorAll(':scope > li.nav-item > a.nav-link').forEach(a=>{
      const href = (a.getAttribute('href') || '').replace(/\/+$/,'') || '/';
      a.classList.toggle('active', href === path);
    });
  }

  function applyOverflow(ul){
    const moreLi = ul.querySelector('#moreNav');
    const moreMenu = moreLi.querySelector('.dropdown-menu');

    function layout(){
      // reset
      moreMenu.innerHTML = '';
      moreLi.classList.add('d-none');
      ul.querySelectorAll(':scope > li.nav-item:not(#moreNav)').forEach(li => li.classList.remove('nav-overflow','d-none'));

      // mobile: não usa "Mais"
      if (window.innerWidth < 768) return;

      const items = [...ul.querySelectorAll(':scope > li.nav-item:not(#moreNav)')];
      if (!items.length) return;

      let used = items.reduce((sum,li)=> sum + Math.ceil(li.getBoundingClientRect().width), 0);
      const host = ul.parentElement || ul;
      let avail = host.clientWidth - 8; // folga

      if (used <= avail) return;

      moreLi.classList.remove('d-none');
      avail -= Math.ceil(moreLi.getBoundingClientRect().width);

      for (let i = items.length - 1; i >= 0 && used > avail; i--){
        const li = items[i];
        const w  = Math.ceil(li.getBoundingClientRect().width);
        const a  = li.querySelector('a.nav-link');
        li.classList.add('nav-overflow','d-none');
        const dd = document.createElement('li');
        dd.innerHTML = `<a class="dropdown-item" href="${a.getAttribute('href')}">${a.textContent}</a>`;
        moreMenu.prepend(dd);
        used -= w;
      }

      moreLi.classList.toggle('d-none', moreMenu.children.length === 0);
    }

    const ro = new ResizeObserver(()=>layout());
    ro.observe(ul.parentElement || ul);
    window.addEventListener('resize', layout);
    layout();
  }

  function render(){
    const ul = document.getElementById(UL_ID);
    if (!ul) return;
    const cfg = window.NavConfig?.get?.() || [];

    // limpa e renderiza APENAS habilitados
    ul.innerHTML = '';
    cfg.filter(x=>x.enabled).sort((a,b)=>a.order-b.order).forEach(it => ul.appendChild(makeItem(it)));

    // cria "Mais" (rótulo via i18n)
    const moreLabel = tr('navbar.more', 'More');
    const moreLi = document.createElement('li');
    moreLi.id = 'moreNav';
    moreLi.className = 'nav-item dropdown d-none';
    moreLi.innerHTML = `
      <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">${escapeHtml(moreLabel)}</a>
      <ul class="dropdown-menu"></ul>
    `;
    ul.appendChild(moreLi);

    markActive(ul);
    applyOverflow(ul);
  }

  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('nav:config-changed', () => render());
  window.NavRender = { render };
})();
