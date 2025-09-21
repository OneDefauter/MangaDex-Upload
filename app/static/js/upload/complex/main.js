window.UploadComplex = window.UploadComplex || {};
(function(NS){
  const { $, state, openBatchModal, renderSubfolders, renderBatches, scanParent, sendAll, toast } = NS;

  // Selecionar todos / nenhum
  $('#btnSelectAll').addEventListener('click', ()=>{
    state.selection = new Set([...state.folders.keys()]);
    renderSubfolders();
  });
  $('#btnSelectNone').addEventListener('click', ()=>{
    state.selection.clear();
    renderSubfolders();
  });

  // Escanear e enviar
  $('#btnScan').addEventListener('click', scanParent);
  $('#btnSendAll').addEventListener('click', sendAll);

  // Criar grupo
  $('#btnCreateBatch').addEventListener('click', ()=>{
    if (state.selection.size === 0){
      toast(T('upload_complex.errors.select_at_least_one', 'Selecione ao menos uma subpasta para agrupar.'), 'warning');
      return;
    }
    openBatchModal();
  });

  // Salvar grupo
  $('#btnSaveBatch').addEventListener('click', ()=>{
    const defName = T('upload_complex.modal.name.placeholder', 'Ex.: Grupo 1');
    const name = $('#batchName').value.trim() || `Group ${state.batches.length+1}`;
    const volume = $('#batchVolume').value.trim() || '';
    const scheduleAt = $('#batchSchedule').value || '';
    const groups = NS.__groupState.items.slice();

    if (!groups.length){
      NS.toast(T('upload_complex.errors.add_at_least_one_group', 'Adicione ao menos um grupo (scan).'), 'warning');
      return;
    }

    if (state.editingBatchId){
      const b = NS.getBatchById(state.editingBatchId);
      if (b){
        b.name = name; b.volume = volume; b.scheduleAt = scheduleAt; b.groups = groups;
      }
    } else {
      const id = 'b' + Math.random().toString(36).slice(2);
      const items = [...state.selection];
      for (const key of items){
        const row = state.folders.get(key);
        if (row) row.assigned = id;
      }
      state.batches.push({ id, name, volume, scheduleAt, groups, items });
      state.selection.clear();
    }

    renderSubfolders();
    renderBatches();
    bootstrap.Modal.getInstance($('#batchModal')).hide();
  });

  // Primeiro render
  document.addEventListener('DOMContentLoaded', ()=> {
    renderSubfolders();
    renderBatches();
  });

  // Auto-scan ao escolher a pasta
  document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('parentFolderInput');
    if (!inp || !window.UploadComplex?.scanParent) return;

    inp.addEventListener('change', () => {
      if (inp.files && inp.files.length) {
        window.UploadComplex.scanParent();
      }
    });
  });
})(window.UploadComplex);
