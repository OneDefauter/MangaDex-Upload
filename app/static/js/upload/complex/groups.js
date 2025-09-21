window.UploadComplex = window.UploadComplex || {};
(function(NS){
  const { $, debounce, isUUID, ENDPOINTS, __groupState, renderBatchGroupChips } = NS;

  const input = $('#batchGroupInput');
  const menu  = $('#batchGroupMenu');
  let controller = null, composing = false;

  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function fetchGroups(q, signal){
    const url = (window.ENDPOINTS?.searchGroups?.(q)) || ENDPOINTS.searchGroups(q);
    const r = await fetch(url, { headers:{Accept:'application/json'}, signal });
    if (!r.ok) return [];
    const arr = await r.json().catch(()=>[]);
    const chosen = new Set(__groupState.items.map(g => String(g.id).toLowerCase()));
    return (Array.isArray(arr) ? arr : []).filter(it => it?.id && !chosen.has(String(it.id).toLowerCase()));
  }

  function renderMenuState(state, items=[], q=''){
    if (!menu) return;

    if (state === 'idle'){
      menu.classList.add('d-none');
      menu.innerHTML = '';
      return;
    }
    if (state === 'loading'){
      menu.innerHTML = `<div class="p-2 small text-secondary">${T('common.searching', 'Buscando…')}</div>`;
      menu.classList.remove('d-none'); return;
    }
    if (state === 'error'){
      menu.innerHTML = `<div class="p-2 small text-danger">${T('common.search_error', 'Erro ao buscar grupos.')}</div>`;
      menu.classList.remove('d-none'); return;
    }
    if (state === 'empty'){
      const msg = T('common.no_results_for', 'Nenhum resultado para “{q}”.').replace('{q}', q);
      menu.innerHTML = `<div class="p-2 small text-secondary">${esc(msg)}</div>`;
      menu.classList.remove('d-none'); return;
    }
    // items
    menu.innerHTML = items.map((it,i)=>`
      <div class="ac-item p-2 border-bottom" data-i="${i}" style="cursor:pointer">
        <div class="fw-semibold">${esc(it.name||it.title||'—')}</div>
        <div class="text-secondary small">${esc(it.id)}</div>
      </div>
    `).join('');
    menu._items = items;
    menu.classList.remove('d-none');
  }

  // IME guard
  input.addEventListener('compositionstart', ()=> composing=true);
  input.addEventListener('compositionend',   ()=> { composing=false; debounced(); });

  // ENTER com UUID
  input.addEventListener('keydown', (e)=>{
    if (e.key !== 'Enter') return;
    const txt = input.value.trim();
    if (!txt) return;
    if (isUUID(txt)){
      if (!__groupState.items.some(g => String(g.id).toLowerCase() === txt.toLowerCase())){
        __groupState.items.push({ id: txt, name: txt });
        renderBatchGroupChips();
      }
      renderMenuState('idle');
      input.value = '';
      e.preventDefault();
    }
  });

  // click em sugestão
  menu.addEventListener('mousedown', (e)=>{
    const el = e.target.closest('.ac-item'); if (!el) return;
    const idx = +el.dataset.i;
    const it  = (menu._items||[])[idx];
    if (it && !__groupState.items.some(g => String(g.id).toLowerCase() === String(it.id).toLowerCase())){
      __groupState.items.push({ id: it.id, name: it.name||it.title||it.id });
      renderBatchGroupChips();
    }
    renderMenuState('idle');
  });

  // fechar ao clicar fora
  document.addEventListener('click', (e)=>{
    if (!menu.contains(e.target) && e.target !== input) renderMenuState('idle');
  });

  const debounced = debounce(async ()=>{
    if (composing) return;
    const q = input.value.trim();
    if (!q){ renderMenuState('idle'); return; }

    renderMenuState('loading');
    if (controller) try{ controller.abort(); } catch {}
    controller = new AbortController();

    try{
      const items = await fetchGroups(q, controller.signal);
      if (items.length) renderMenuState('items', items, q);
      else renderMenuState('empty', [], q);
    }catch(err){
      if (err?.name !== 'AbortError') renderMenuState('error');
    }
  }, 600);

  input.addEventListener('input', debounced);

  // botão LIMPAR
  $('#btnClearBatchGroups')?.addEventListener('click', ()=>{
    __groupState.items = [];
    renderBatchGroupChips();
    renderMenuState('idle');
    input.focus();
  });

})(window.UploadComplex);
