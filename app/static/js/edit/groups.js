window.EditPage = window.EditPage || {};
(function(NS){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||'').trim());
  const debounce = (fn, ms) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // ---- i18n helpers (usa I18N_SCRIPT.edit.groups) -----------------
  const S = (path) => {
    const parts = path.split('.');
    let cur = (window.I18N_SCRIPT && window.I18N_SCRIPT.edit && window.I18N_SCRIPT.edit.groups) || {};
    for (const p of parts) cur = (cur && cur[p] !== undefined) ? cur[p] : undefined;
    return cur;
  };
  const t = (path, fallback, vars={}) => {
    let str = S(path);
    if (typeof str !== 'string') str = fallback;
    return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
  };

  const ENDPOINTS = NS.ENDPOINTS || {
    // se o edit.js já definiu ENDPOINTS, usamos ele; caso contrário, estes fallbacks
    searchGroups: (q) => `/api/groups?q=${encodeURIComponent(q)}`,
    updateGroups: (id) => `/api/edit/chapter/${id}/groups`
  };

  // Estado do modal
  const modalState = { chapterId: null, items: [], version: undefined };
  let grpModal;

  function renderRowChips(chapId, groups){
    if (typeof NS.renderRowGroupChips === 'function') {
      NS.renderRowGroupChips(chapId, groups);
    } else {
      const cell = $(`.chapter-groups[data-id="${chapId}"]`);
      if (cell) cell.innerHTML = (groups||[]).map(g =>
        `<span class="badge rounded-pill bg-secondary me-1 mb-1">${esc(g.name||g.id)}</span>`
      ).join('') || '<span class="text-secondary">—</span>';
    }
  }

  function openGroupsModal(chapId){
    modalState.chapterId = chapId;
    const cur = NS.__chaptersMap?.[chapId];
    modalState.items = (cur?.groups || []).map(g => ({ id: g.id, name: g.name || g.id }));
    modalState.version = cur?.version;
    $('#grpSearch').value = '';
    renderMenuState('idle');
    renderModalChips();
    grpModal.show();
  }

  function renderModalChips(){
    const box = $('#grpChips');
    box.innerHTML = modalState.items.map((g,i)=>`
      <span class="badge rounded-pill bg-primary me-1 mb-1">
        ${esc(g.name || g.id)}
        <button class="btn btn-sm btn-link text-white ms-1 p-0" data-i="${i}" title="${esc(t('chip.remove','Remover'))}">✕</button>
      </span>
    `).join('');
  }

  // ── MENU DE SUGESTÕES
  function renderMenuState(state, items=[], q=''){
    const menu = $('#grpMenu');
    if (state === 'idle'){ menu.classList.add('d-none'); menu.innerHTML=''; return; }

    if (state === 'loading'){
      menu.innerHTML = `<div class="p-2 small text-secondary">${esc(t('menu.loading','Buscando…'))}</div>`;
      menu.classList.remove('d-none'); return;
    }
    if (state === 'error'){
      menu.innerHTML = `<div class="p-2 small text-danger">${esc(t('menu.error','Erro ao buscar grupos.'))}</div>`;
      menu.classList.remove('d-none'); return;
    }
    if (state === 'empty'){
      menu.innerHTML = `<div class="p-2 small text-secondary">${esc(t('menu.empty','Nenhum resultado para “{{q}}”.', { q }))}</div>`;
      menu.classList.remove('d-none'); return;
    }
    if (state === 'items'){
      menu.innerHTML = items.map((it,i)=>`
        <div class="ac-item p-2 border-bottom" data-i="${i}" style="cursor:pointer">
          <div class="fw-semibold">${esc(it.name||it.title||'—')}</div>
          <div class="text-secondary small">${esc(it.id)}</div>
        </div>
      `).join('');
      menu._items = items;
      menu.classList.remove('d-none');
    }
  }

  async function fetchGroups(q, signal){
    const r = await fetch((NS.ENDPOINTS?.searchGroups || ENDPOINTS.searchGroups)(q), { headers:{Accept:'application/json'}, signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await r.json().catch(()=>[]);
    return Array.isArray(arr) ? arr : [];
  }

  function installAutocomplete(){
    let controller=null, composing=false;
    const input = $('#grpSearch');
    const menu  = $('#grpMenu');

    input.addEventListener('compositionstart', ()=> composing=true);
    input.addEventListener('compositionend',   ()=> { composing=false; debounced(); });

    // ENTER com UUID direto
    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter'){
        const txt = input.value.trim();
        if (!txt) return;
        if (isUUID(txt)){
          if (!modalState.items.some(g => String(g.id).toLowerCase() === txt.toLowerCase())){
            modalState.items.push({ id: txt, name: txt });
            renderModalChips();
          }
          renderMenuState('idle');
          input.value=''; e.preventDefault();
        }
      }
    });

    // clique em sugestão
    menu.addEventListener('mousedown', (e)=>{
      const el = e.target.closest('.ac-item'); if (!el) return;
      const idx = +el.dataset.i;
      const it  = (menu._items||[])[idx];
      if (it && !modalState.items.some(g => String(g.id).toLowerCase()===String(it.id).toLowerCase())){
        modalState.items.push({ id: it.id, name: it.name||it.title||it.id });
        renderModalChips();
      }
      renderMenuState('idle');
    });

    // fechar se clicar fora
    document.addEventListener('click', (e)=>{
      if (!menu.contains(e.target) && e.target !== input) renderMenuState('idle');
    });

    const debounced = debounce(async ()=>{
      if (composing) return;
      const q = input.value.trim();
      if (!q){ renderMenuState('idle'); return; }

      // loading
      renderMenuState('loading');

      if (controller) try{ controller.abort(); } catch {}
      controller = new AbortController();
      try{
        const all = await fetchGroups(q, controller.signal);
        const chosen = new Set(modalState.items.map(g => String(g.id).toLowerCase()));
        const items = all.filter(it => it?.id && !chosen.has(String(it.id).toLowerCase()));
        if (items.length) renderMenuState('items', items, q);
        else renderMenuState('empty', [], q);
      }catch(err){
        if (err.name !== 'AbortError'){
          NS.toast?.(t('toast.search_error','Falha ao buscar grupos ({{error}})', { error: (err.message||err) }), 'error');
          renderMenuState('error');
        }
      }
    }, 600);

    input.addEventListener('input', debounced);
  }

  async function saveGroups(){
    const chapId = modalState.chapterId;
    if (!chapId) return;
    const ids = modalState.items.map(g => g.id);
    if (!ids.length){
      NS.toast?.(t('toast.require_one','Informe ao menos um grupo.'), 'warning');
      return;
    }
    try{
      const r = await fetch((NS.ENDPOINTS?.updateGroups || ENDPOINTS.updateGroups)(chapId), {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        body: JSON.stringify({ groups: ids, version: modalState.version })
      });
      const j = await r.json().catch(()=>null);
      if (!r.ok || (j && j.ok===false)){
        const msg = (j && (j.error || j.detail)) || `HTTP ${r.status}`;
        NS.toast?.(t('toast.save_error','Erro ao salvar grupos: {{error}}', { error: msg }), 'error');
        return;
      }
      // atualiza cache local e UI
      if (NS.__chaptersMap?.[chapId]){
        NS.__chaptersMap[chapId].groups  = modalState.items.slice();
        NS.__chaptersMap[chapId].version = (NS.__chaptersMap[chapId].version ?? 0) + 1;
      }
      renderRowChips(chapId, modalState.items);
      NS.toast?.(t('toast.saved','Grupos atualizados.'), 'success');
      grpModal.hide();
    }catch(e){
      NS.toast?.(t('toast.network_save_error','Erro de rede ao salvar grupos.'), 'error');
    }
  }

  function wireRowButtons(){
    $$('.btn-edit-groups').forEach(btn=>{
      btn.addEventListener('click', ()=> openGroupsModal(btn.dataset.id));
    });
    $$('.chapter-groups').forEach(cell=>{
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', ()=> openGroupsModal(cell.dataset.id));
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    grpModal = new bootstrap.Modal($('#groupModal'));
    installAutocomplete();

    // remover chip
    $('#grpChips').addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-i]');
      if (!btn) return;
      const i = +btn.dataset.i;
      if (Number.isInteger(i)){ modalState.items.splice(i,1); renderModalChips(); }
    });

    $('#grpClear').addEventListener('click', ()=>{ modalState.items = []; renderModalChips(); });
    $('#grpSave').addEventListener('click', saveGroups);

    wireRowButtons();
  });

  NS.rebindGroupButtons = wireRowButtons;

})(window.EditPage);
