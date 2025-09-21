window.UploadComplex = window.UploadComplex || {};
(function(NS){
  const { $, $$, escapeHtml, state } = NS;
  const batchModal = new bootstrap.Modal($('#batchModal'));
  const groupState = { items: [] };

  function getBatchById(id){ return state.batches.find(b => b.id === id); }
  NS.getBatchById = getBatchById;

  function renderBatchGroupChips(){
    const box = $('#batchGroupChips');
    box.innerHTML = groupState.items.map((g,i)=>`
      <span class="chip">
        <span>${escapeHtml(g.name||g.title||g.id)}</span>
        <span class="x" data-i="${i}" title="${escapeHtml(T('common.remove','Remover'))}">✕</span>
      </span>
    `).join('');
  }
  NS.renderBatchGroupChips = renderBatchGroupChips;

  function openBatchModal(editId=null){
    groupState.items = [];
    state.editingBatchId = editId;

    if (editId){
      const b = getBatchById(editId);
      $('#batchName').value = b?.name || '';
      $('#batchVolume').value = b?.volume || '';
      $('#batchSchedule').value = b?.scheduleAt || '';
      groupState.items = (b?.groups || []).map(g => ({id:g.id, name:g.name||g.title||g.id}));
    } else {
      $('#batchName').value = `${T('upload_complex.modal.name.placeholder', 'Ex.: Grupo 1').replace('Ex.: ', '').replace(' 1', '')} ${state.batches.length+1}`;
      $('#batchVolume').value = '';
      $('#batchSchedule').value = '';
      groupState.items = [];
    }
    renderBatchGroupChips();
    $('#batchGroupInput').value = '';
    $('#batchGroupMenu').classList.add('d-none');
    batchModal.show();
  }
  NS.openBatchModal = openBatchModal;

  $('#batchGroupChips').addEventListener('click', (e)=>{
    const x = e.target.closest('.x'); if (!x) return;
    const i = +x.dataset.i;
    if (Number.isInteger(i)) { groupState.items.splice(i,1); renderBatchGroupChips(); }
  });
  $('#btnClearBatchGroups').addEventListener('click', ()=>{
    groupState.items = []; renderBatchGroupChips();
  });

  function renderBatches(){
    const box = $('#batchList');
    box.innerHTML = '';
    for (const b of state.batches){
      b.items = [...state.folders.values()].filter(r => r.assigned===b.id).map(r => r.key);

      const el = document.createElement('div');
      el.className = 'p-3 border rounded';
      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${escapeHtml(b.name)}</div>
            <div class="small text-secondary">
              ${escapeHtml(T('upload_complex.batch.volume_label','Volume: '))}${escapeHtml(b.volume||'—')}
              •
              ${escapeHtml(T('upload_complex.batch.schedule_label','Agendamento: '))}${escapeHtml(b.scheduleAt||'—')}
            </div>
            <div class="small mt-1">
              ${escapeHtml(T('upload_complex.batch.groups_label','Grupos: '))}
              ${(b.groups || []).map(g=>`<span class="chip"><span>${escapeHtml(g.name||g.title||g.id)}</span></span>`).join(' ')}
            </div>
            <div class="small mt-2 text-secondary">
              ${String(b.items.length)} ${escapeHtml(T('upload_complex.batch.subfolders_suffix','subpasta(s)'))}
            </div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary btn-edit">${escapeHtml(T('common.edit','Editar'))}</button>
            <button class="btn btn-outline-secondary btn-reassign">${escapeHtml(T('upload_complex.batch.reassign','Reatribuir'))}</button>
            <button class="btn btn-outline-danger btn-del">${escapeHtml(T('common.remove','Remover'))}</button>
          </div>
        </div>
      `;
      // binds
      $('.btn-edit', el).addEventListener('click', ()=> openBatchModal(b.id));

      $('.btn-del', el).addEventListener('click', ()=>{
        for (const r of state.folders.values()) if (r.assigned===b.id) r.assigned=null;
        state.batches = state.batches.filter(x => x.id !== b.id);
        NS.renderSubfolders && NS.renderSubfolders();
        NS.renderBatches && NS.renderBatches();
      });

      $('.btn-reassign', el).addEventListener('click', ()=>{
        const selected = NS.getSelectedKeys ? NS.getSelectedKeys() : Array.from(state.selection || []);
        if (!selected.length) {
          NS.toast?.(T('upload_complex.batch.reassign_tip','Selecione subpastas na lista e clique novamente para reatribuir.'), 'info');
          return;
        }
        let applied = 0;
        for (const key of selected){
          const row = state.folders.get(key);
          if (row) { row.assigned = b.id; applied++; }
        }
        state.selection.clear();
        NS.renderSubfolders && NS.renderSubfolders();
        NS.renderBatches && NS.renderBatches();
        const msg = T('upload_complex.batch.reassigned_n','Reatribuído(s) {n} item(ns) para “{name}”.')
                      .replace('{n}', applied).replace('{name}', b.name);
        NS.toast?.(msg, 'success');
      });

      box.appendChild(el);
    }
  }
  NS.renderBatches = renderBatches;

  NS.__groupState = groupState;
})(window.UploadComplex);
