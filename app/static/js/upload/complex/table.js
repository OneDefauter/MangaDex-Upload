window.UploadComplex = window.UploadComplex || {};
(function (NS) {
  const { $, $$, state, escapeHtml } = NS;

  function fmtStatus(s) {
    const v = String(s || '').trim().toLowerCase();
    if (!v || v === 'idle')           return [T('upload_complex.status.idle', 'Idle'), 'text-secondary'];
    if (v === 'ok' || v === 'done')   return [T('upload_complex.status.done', 'done'), 'text-success'];
    if (v.includes('enviando'))       return [T('upload_complex.status.sending', 'enviando…'), 'text-info'];
    if (v.startsWith('erro'))         return [s, 'text-danger'];
    return [s || T('upload_complex.status.idle', 'Idle'), 'text-secondary'];
  }

  function applyRangeSelection(fromKey, toKey, check) {
    const keys = state.visibleKeys || [];
    const i = keys.indexOf(fromKey);
    const j = keys.indexOf(toKey);
    if (i === -1 || j === -1) return;
    const [a, b] = i < j ? [i, j] : [j, i];
    for (let k = a; k <= b; k++) {
      const key = keys[k];
      if (check) state.selection.add(key);
      else state.selection.delete(key);
    }
  }

  function selectAllVisible() {
    state.selection = new Set(state.visibleKeys || []);
    renderSubfolders();
  }
  NS.selectAllVisible = selectAllVisible;

  function getSelectedKeys() { return Array.from(state.selection || []); }
  NS.getSelectedKeys = getSelectedKeys;

  function renderSubfolders() {
    const tb = $('#tbl-subfolders tbody');
    tb.innerHTML = '';

    const rows = [...state.folders.values()].sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' })
    );
    state.visibleKeys = rows.map(r => r.key);

    for (const r of rows) {
      const [stText, stClass] = fmtStatus(r.status);
      const tr = document.createElement('tr');
      tr.dataset.key = r.key;
      tr.innerHTML = `
        <td>
          <input class="form-check-input rowcheck" type="checkbox"
                 ${state.selection.has(r.key) ? 'checked' : ''}>
        </td>
        <td><div class="truncate" title="${escapeHtml(r.key)}">${escapeHtml(r.key)}</div></td>
        <td>${r.count}</td>
        <td>
          <input class="form-control form-control-sm ttl-input"
                 value="${escapeHtml(r.title || '')}"
                 placeholder="${escapeHtml(T('upload_complex.table.title_ph', 'título (opcional)'))}">
        <td>
          <input class="form-control form-control-sm ch-input"
                 value="${escapeHtml(r.chapter || '')}"
                 placeholder="${escapeHtml(T('upload_complex.table.chapter_ph', 'ex.: 1, 10.5'))}">
        </td>
        <td>
          ${r.assigned
            ? `<span class="badge text-bg-primary badge-assigned" data-batch="${escapeHtml(r.assigned)}" title="${escapeHtml(T('upload_complex.table.unassign_hint', 'Clique para remover a atribuição'))}">
                ${escapeHtml(T('upload_complex.table.group_label', 'Grupo: '))}${escapeHtml(NS.getBatchById?.(r.assigned)?.name || r.assigned)}
                <span class="x ms-1" role="button" aria-label="${escapeHtml(T('common.remove', 'Remover'))}">✕</span>
              </span>`
            : `<span class="text-secondary">—</span>`}
          <div class="small mt-1 status ${stClass}" data-status="${escapeHtml(r.status || '')}">
            ${escapeHtml(stText)}
          </div>
        </td>
      `;
      tb.appendChild(tr);
    }

    $$('.rowcheck', tb).forEach(chk => {
      chk.addEventListener('click', e => {
        const key = e.target.closest('tr').dataset.key;
        const checked = e.target.checked;

        if (e.shiftKey && state._lastAnchorKey) {
          applyRangeSelection(state._lastAnchorKey, key, checked);
        } else {
          if (checked) state.selection.add(key);
          else state.selection.delete(key);
          state._lastAnchorKey = key;
        }
        renderSubfolders();
      });
    });

    $$('.ttl-input', tb).forEach(inp => {
      inp.addEventListener('input', e => {
        const key = e.target.closest('tr').dataset.key;
        const row = state.folders.get(key);
        if (row) row.title = e.target.value;
      });
    });

    $$('.ch-input', tb).forEach(inp => {
      inp.addEventListener('input', e => {
        const key = e.target.closest('tr').dataset.key;
        const row = state.folders.get(key);
        if (row) row.chapter = e.target.value.trim();
      });
    });

    tb.addEventListener('click', (e) => {
      const close = e.target.closest('.badge-assigned .x');
      if (!close) return;

      const tr = e.target.closest('tr');
      const key = tr?.dataset.key;
      if (!key) return;

      const keysToClear = (state.selection.size && state.selection.has(key))
        ? [...state.selection]
        : [key];

      for (const k of keysToClear) {
        const row = state.folders.get(k);
        if (row) row.assigned = null;
      }

      if (keysToClear.length > 1) state.selection.clear();

      renderSubfolders();
      NS.renderBatches?.();
    });
  }
  NS.renderSubfolders = renderSubfolders;

  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const isEditable =
      (document.activeElement && (document.activeElement.isContentEditable ||
       tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'));

    if (!isEditable && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAllVisible();
    }
  });

})(window.UploadComplex);
