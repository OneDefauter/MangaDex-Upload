window.UploadComplex = window.UploadComplex || {};
(function(NS){
  NS.state = {
    folders: new Map(),     // key -> { key, files:File[], count, chapter, assigned, status }
    selection: new Set(),   // keys selecionadas
    batches: [],            // { id, name, volume, scheduleAt, groups:[{id,name}], items:[keys...] }
    editingBatchId: null
  };
})(window.UploadComplex);
