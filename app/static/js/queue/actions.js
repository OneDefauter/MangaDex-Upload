// --- ACK helper --------------------------------------------------------------
function emitAction(action, params, timeout = 6000){
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) { done = true; reject(new Error("timeout")); }
    }, timeout);

    socket.emit("job_action", { action, ...params }, (resp) => {
      if (done) return;
      clearTimeout(t);
      if (!resp || resp.ok !== true) {
        reject(new Error(resp?.error || "Falha na ação"));
      } else {
        resolve(resp);
      }
    });
  });
}

// --- UI busy em uma linha ----------------------------------------------------
function setRowBusy(table, id, busy = true){
  const tableEl = table === 'downloads' ? $('#tbl-downloads') : $('#tbl-uploads');
  const tr = tableEl?.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
  if (!tr) return;
  tr.style.pointerEvents = busy ? 'none' : '';
  tr.style.opacity = busy ? '0.6' : '';
}

// --- Ações de usuário ---------------------------------------------------------
async function actionBump(table, id, delta){
  setRowBusy(table, id, true);
  try {
    const { item } = await emitAction('bump', { table, id, delta });
    // patch local rápido
    const arr = state[table].cache;
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0 && item) arr[idx] = { ...arr[idx], ...item };
    // re-render imediato + refresh coalescido (ordenar/paginar)
    const shown = applyClientFilters(arr);
    reconcileTable(table, shown);
    updateBadges(); updateMeta(table, { shownCount: shown.length, limit: getPageSize() }); updatePager(table, getPageSize());
    scheduleRefresh(table, 120);
    showToast("Prioridade atualizada", "success");
  } catch (e) {
    showToast(`Erro ao alterar prioridade: ${e.message}`, "danger");
  } finally {
    setRowBusy(table, id, false);
  }
}

async function actionCancel(table, id){
  setRowBusy(table, id, true);
  try {
    const { item } = await emitAction('cancel', { table, id });
    // se filtro atual não inclui 'canceled', some já
    const arr = state[table].cache;
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) {
      if (item) arr[idx] = { ...arr[idx], ...item };
      // se status filtrado, remove da lista local
      const statuses = new Set(getStatuses());
      if (statuses.size && !statuses.has(item?.status)) arr.splice(idx, 1);
    }
    const shown = applyClientFilters(arr);
    reconcileTable(table, shown);
    updateBadges(); updateMeta(table, { shownCount: shown.length, limit: getPageSize() }); updatePager(table, getPageSize());
    scheduleRefresh(table, 120);
    showToast(`${table} cancelado`, "warning");
  } catch (e) {
    showToast(`Erro ao cancelar: ${e.message}`, "danger");
  } finally {
    setRowBusy(table, id, false);
  }
}

async function actionRetry(table, id){
  setRowBusy(table, id, true);
  try {
    const { item } = await emitAction('retry', { table, id });
    const arr = state[table].cache;
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0 && item) arr[idx] = { ...arr[idx], ...item };
    const shown = applyClientFilters(arr);
    reconcileTable(table, shown);
    updateBadges(); updateMeta(table, { shownCount: shown.length, limit: getPageSize() }); updatePager(table, getPageSize());
    scheduleRefresh(table, 120);
    showToast(`${table} re-enfileirado`, "info");
  } catch (e) {
    showToast(`Erro ao re-enfileirar: ${e.message}`, "danger");
  } finally {
    setRowBusy(table, id, false);
  }
}

async function actionRemove(table, id){
  if (!confirm("Remover este job?")) return;
  setRowBusy(table, id, true);
  try {
    const resp = await emitAction('remove', { table, id });
    const arr = state[table].cache;
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) arr.splice(idx, 1);
    state[table].total = Math.max(0, (state[table].total || 0) - 1);
    const shown = applyClientFilters(arr);
    reconcileTable(table, shown);
    updateBadges(); updateMeta(table, { shownCount: shown.length, limit: getPageSize() }); updatePager(table, getPageSize());
    scheduleRefresh(table, 120);
    showToast(`${table} removido`, "success");
  } catch (e) {
    showToast(`Erro ao remover: ${e.message}`, "danger");
  } finally {
    setRowBusy(table, id, false);
  }
}
