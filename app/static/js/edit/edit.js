(function () {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const parseJSON = (id) => { try { return JSON.parse($(id).textContent); } catch { return null; } };

  // ---------- i18n helpers ----------
  const S = (path) => {
    const parts = path.split('.');
    let cur = (window.I18N_SCRIPT && window.I18N_SCRIPT.edit) || {};
    for (const p of parts) cur = (cur && cur[p] !== undefined) ? cur[p] : undefined;
    return cur;
  };
  const t = (path, fallback, vars={}) => {
    let str = S(path);
    if (typeof str !== 'string') str = fallback;
    return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
  };

  // Endpoints
  const ENDPOINTS = window.ENDPOINTS || {
    listChapters: ({ mangaId, lang, limit=100, offset=0 }) =>
      `/api/edit/chapters?manga_id=${encodeURIComponent(mangaId)}&lang=${encodeURIComponent(lang||'')}&limit=${limit}&offset=${offset}`,
    updateChapter: (id) => `/api/edit/chapter/${id}`,
    updateGroups:  (id) => `/api/edit/chapter/${id}/groups`,
    deleteChapter: (id, version) => `/api/edit/chapter/${id}${(version??'')!=='' ? `?version=${encodeURIComponent(version)}` : ''}`,
    searchGroups: (q) => `/api/search/groups?q=${encodeURIComponent(q)}`
  };

  // Toast
  function toast(msg, type='info'){
    const el = document.createElement('div');
    el.className = 'toast align-items-center text-bg-'+(type==='error'?'danger':type);
    el.role='alert'; el.ariaLive='assertive'; el.ariaAtomic='true';
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    $('#toastStack').appendChild(el);
    new bootstrap.Toast(el, { delay: 4000 }).show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate = (iso) => !iso ? '—' : (() => { try { return new Date(iso).toLocaleString(); } catch { return iso; } })();

  const renderGroupChips = (groups) => {
    if (!Array.isArray(groups) || groups.length===0) return '<span class="text-secondary">—</span>';
    return groups.map(g =>
      `<span class="badge rounded-pill bg-secondary me-1 mb-1" data-id="${esc(g.id||'')}">${esc(g.name || g.id || '—')}</span>`
    ).join('');
  };

  const manga = parseJSON('#manga-json') || {};
  const state = {
    lang: (manga.available_langs && manga.available_langs[0]) || 'pt-br',
    limit: 100,
    offset: 0,
    total: 0,
    items: [],
    map: Object.create(null)
  };

  // expõe utilidades p/ modal
  window.EditPage = window.EditPage || {};
  window.EditPage.toast = toast;
  window.EditPage.__chaptersMap = state.map;
  window.EditPage.ENDPOINTS = ENDPOINTS;

  function renderRowGroupChips(chapId, groups){
    const cell = $(`.chapter-groups[data-id="${chapId}"]`);
    if (cell) cell.innerHTML = renderGroupChips(groups);
  }
  window.EditPage.renderRowGroupChips = renderRowGroupChips;

  // remove localmente após delete OK
  function removeLocally(id){
    const idx = state.items.findIndex(x => x.id === id);
    if (idx !== -1) state.items.splice(idx, 1);
    if (state.total > 0) state.total -= 1;
    delete state.map[id];

    // se a página ficou vazia e há anteriores, volta uma página
    if (state.items.length === 0 && state.offset > 0) {
      state.offset = Math.max(0, state.offset - state.limit);
      loadPage();
    } else {
      renderRows();
    }
  }

  function renderRows(){
    const tb = $('#chaptersBody'); tb.innerHTML = '';
    state.map = Object.create(null);
    window.EditPage.__chaptersMap = state.map;

    for (const it of state.items){
      let groups = Array.isArray(it.groups) ? it.groups.slice() : [];
      if (groups.length && typeof groups[0] === 'string') groups = groups.map(x => ({ id: x, name: x }));

      state.map[it.id] = {
        id: it.id, ch: it.ch ?? '', vol: it.vol ?? '', title: it.title ?? '',
        readableAt: it.readableAt ?? '', version: it.version, groups
      };

      const tr = document.createElement('tr');
      tr.dataset.id = it.id;
      tr.dataset.version = it.version ?? '';

      tr.innerHTML = `
        <td><input class="form-control form-control-sm inp-chapter" value="${esc(it.ch || '')}" placeholder="${esc(t('placeholder.chapter','ex.: 10.5'))}"></td>
        <td><input class="form-control form-control-sm inp-volume"  value="${esc(it.vol || '')}" placeholder="${esc(t('placeholder.volume','ex.: 3'))}"></td>
        <td><input class="form-control form-control-sm inp-title"   value="${esc(it.title || '')}" placeholder="${esc(t('placeholder.title','Título opcional'))}"></td>
        <td class="chapter-groups" data-id="${esc(it.id)}">${renderGroupChips(groups)}</td>
        <td class="small text-secondary">${fmtDate(it.readableAt)}</td>
        <td>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-sm btn-primary btn-save">${esc(t('btn.save','Salvar'))}</button>
            <button class="btn btn-sm btn-outline-secondary btn-edit-groups" data-id="${esc(it.id)}">${esc(t('btn.groups','Grupos…'))}</button>
            <a class="btn btn-sm btn-ghost" href="https://mangadex.org/chapter/${esc(it.id)}" target="_blank" rel="noopener">${esc(t('btn.read','Ler'))}</a>
            <button class="btn btn-sm btn-outline-danger btn-del">${esc(t('btn.delete','Excluir'))}</button>
          </div>
        </td>
      `;
      tb.appendChild(tr);
    }

    // salvar
    $$('.btn-save', tb).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = tr.dataset.id;
        const payload = {
          chapter: $('.inp-chapter', tr).value.trim(),
          volume:  $('.inp-volume', tr).value.trim(),
          title:   $('.inp-title', tr).value.trim(),
          version: state.map[id]?.version ?? undefined,
        };
        for (const k of Object.keys(payload)) if (payload[k]==='' || payload[k]==null) delete payload[k];

        btn.disabled = true;
        try{
          const r = await fetch(ENDPOINTS.updateChapter(id), {
            method: 'PUT',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify(payload)
          });
          const j = await r.json().catch(()=>null);
          if (!r.ok || (j && j.ok===false)){
            toast(t('toast.save_error','Falha ao salvar: {{error}}', { error: (j?.error || `HTTP ${r.status}`) }), 'error');
            return;
          }
          if (state.map[id]) state.map[id].version = (state.map[id].version ?? 0) + 1;
          toast(t('toast.saved','Capítulo atualizado.'), 'success');
        }catch{
          toast(t('toast.network_save_error','Erro de rede ao salvar.'), 'error');
        }finally{
          btn.disabled = false;
        }
      });
    });

    // excluir
    $$('.btn-del', tb).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = tr.dataset.id;
        const ch = $('.inp-chapter', tr).value || state.map[id]?.ch || '';
        if (!confirm(t('confirm.delete','Tem certeza que deseja excluir o capítulo {{what}}? Essa ação não pode ser desfeita.', { what: (ch || id) }))) return;

        btn.disabled = true;
        try{
          const version = state.map[id]?.version;
          const r = await fetch(ENDPOINTS.deleteChapter(id, version), { method: 'DELETE' });
          let j = null; try { j = await r.json(); } catch {}
          if (!(r.ok || r.status===204) || (j && j.ok===false)){
            const msg = (j && (j.error || j.detail)) || `HTTP ${r.status}`;
            toast(t('toast.delete_error','Falha ao excluir: {{error}}', { error: msg }), 'error');
            btn.disabled = false;
            return;
          }
          toast(t('toast.deleted','Capítulo excluído.'), 'success');
          // remove imediatamente da UI/estado
          removeLocally(id);
        }catch{
          toast(t('toast.network_delete_error','Erro de rede ao excluir.'), 'error');
        }
      });
    });

    // rebind botões de grupos
    if (window.EditPage?.rebindGroupButtons) window.EditPage.rebindGroupButtons();

    // paginação
    const page = Math.floor(state.offset / state.limit) + 1;
    const pages = Math.max(1, Math.ceil(state.total / state.limit));
    $('#pageInfo').textContent  = t('pager.status','Página {{page}} / {{pages}}', { page, pages });
    $('#totalInfo').textContent = t('pager.total','{{count}} capítulo(s)', { count: state.total });
    $('#btnPrev').disabled = state.offset <= 0;
    $('#btnNext').disabled = state.offset + state.limit >= state.total;
  }

  async function loadPage(){
    const url = ENDPOINTS.listChapters({
      mangaId: manga.id, lang: state.lang, limit: state.limit, offset: state.offset
    });
    try{
      const r = await fetch(url, { headers: { Accept:'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      state.items = Array.isArray(j.items) ? j.items : [];
      state.total = Number.isFinite(j.total) ? j.total : state.items.length;
      renderRows();
    }catch(err){
      state.items = []; state.total = 0; renderRows();
      toast(t('toast.load_error','Erro ao carregar capítulos ({{error}})', { error: (err?.message||err) }), 'error');
    }
  }

  function bindTabs(){
    $$('#langTabs [data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', (e) => {
        const lang = e.target?.dataset?.lang; if (!lang) return;
        state.lang = lang; state.offset = 0; loadPage();
      });
    });
  }

  function bindPaging(){
    $('#btnPrev').addEventListener('click', () => {
      if (state.offset <= 0) return;
      state.offset = Math.max(0, state.offset - state.limit);
      loadPage();
    });
    $('#btnNext').addEventListener('click', () => {
      if (state.offset + state.limit >= state.total) return;
      state.offset += state.limit;
      loadPage();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindTabs();
    bindPaging();
    const active = $('#langTabs .nav-link.active');
    if (active?.dataset?.lang) state.lang = active.dataset.lang;
    loadPage();
  });
})();
