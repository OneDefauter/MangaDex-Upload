// ---------- Estado ----------
const state = {
  downloads: { page: 0, total: 0, cache: [] },
  uploads:   { page: 0, total: 0, cache: [] }
};

// ---------- Socket.IO ----------
socket.on('connect', () => {
  // zera as páginas (garantia) e pede as páginas iniciais
  state.downloads.page = 0;
  state.uploads.page   = 0;
  requestPage('downloads');
  requestPage('uploads');
});

socket.on('disconnect', () => {
  console.log('[socket] disconnected');
  showToast("[socket] disconnected", "warning", { delay: 2000 });
});

// --- resposta do servidor com a página pedida ---
socket.on('jobs_page', ({ table, items, total, limit, offset }) => {
  // guarda cache e total
  state[table].cache = Array.isArray(items) ? items.map(normalizeJob) : [];
  state[table].total = Number.isFinite(total) ? total : 0;

  // aplica filtros locais e concilia DOM por linha
  const shown = applyClientFilters(state[table].cache);
  reconcileTable(table, shown);

  // meta/pager/badges
  updateBadges();
  updateMeta(table, { shownCount: shown.length, limit: limit ?? getPageSize() });
  updatePager(table, limit ?? getPageSize());
});

socket.on('jobs_changed', ({ table, change }) => {
  // change pode ser: { type: 'enqueue'|'update'|'delete'|'refresh', item?|id? }
  if (!state[table]) return;

  const arr = state[table].cache || [];
  const limit = getPageSize();
  const statuses = new Set(getStatuses());

  if (change?.type === 'refresh') {
    scheduleRefresh(table, 50);
    return;
  }

  if (change?.type === 'update' && change.item) {
    const next = change.item;
    const idx  = arr.findIndex(x => x.id === next.id);
    const prev = idx >= 0 ? arr[idx] : null;

    const merged = mergeJob(prev, next);

    // se o novo status não está ativo, some já da lista local e atualize UI
    const statuses = new Set(getStatuses());
    const statusOk = statuses.size === 0 || statuses.has(merged.status);
    if (!statusOk) {
      if (idx >= 0) arr.splice(idx, 1);
      const shown = applyClientFilters(arr);
      reconcileTable(table, shown);
      updateBadges();
      updateMeta(table, { shownCount: shown.length, limit });
      updatePager(table, limit);
      scheduleRefresh(table, 120);
      return;
    }

    // atualiza ou insere provisoriamente
    if (idx >= 0) arr[idx] = merged;
    else arr.unshift(merged);

    const touched = ['status','priority','ordem'];
    if (touched.some(k => next[k] !== undefined && (prev ? prev[k] !== next[k] : true))) {
      scheduleRefresh(table, 120);
    }
  }

  else if (change?.type === 'enqueue' && change.item) {
    const next = normalizeJob(change.item);
    const statuses = new Set(getStatuses());
    const statusOk = statuses.size === 0 || statuses.has(next.status);
    if (statusOk) {
      arr.unshift(next);
      state[table].total = (state[table].total || 0) + 1;
    }
    scheduleRefresh(table, 120);
  }

  else if (change?.type === 'delete' && change.id) {
    const idx = arr.findIndex(x => x.id === change.id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      state[table].total = Math.max(0, (state[table].total || 0) - 1);
    }
    scheduleRefresh(table, 120);
  }

  const shown = applyClientFilters(arr);
  reconcileTable(table, shown);
  updateBadges();
  updateMeta(table, { shownCount: shown.length, limit });
  updatePager(table, limit);
});

// ---------- Utils ----------
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function toPercent(bp){
  const n = Number(bp);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.max(0, Math.min(10000, Math.round(n)));
  return Math.round(clamped / 100); // 4500 -> 45%
}

function parseGrupo(grupo) {
  if (grupo == null) return { text: '', list: [] };

  // vira array
  let arr = null;
  if (Array.isArray(grupo)) {
    arr = grupo;
  } else if (typeof grupo === 'string') {
    try {
      const parsed = JSON.parse(grupo);
      if (Array.isArray(parsed)) arr = parsed;
      else if (parsed && typeof parsed === 'object') arr = [parsed];
      else return { text: String(grupo), list: [] };
    } catch {
      return { text: String(grupo), list: [] };
    }
  } else if (typeof grupo === 'object') {
    arr = [grupo];
  }

  if (!arr) return { text: String(grupo ?? ''), list: [] };

  // normaliza itens
  const norm = arr.map(x => {
    if (typeof x === 'string') return { id: x, name: x };
    return {
      id:   x.id ?? x.groupId ?? x.uuid ?? '',
      name: x.name ?? x.title ?? x.slug ?? x.displayName ?? x.id ?? ''
    };
  });

  const names = norm.map(g => g.name || g.id).filter(Boolean);
  return { text: names.join(', '), list: norm };
}

// ------- Tooltips manager (mantido, mas não usamos render total) -------
const TOOLTIP_SELECTOR = '[data-bs-toggle="tooltip"]';
let tooltipInstances = [];
function disposeAllTooltips() {
  for (const t of tooltipInstances) {
    try { t.hide(); t.dispose(); } catch {}
  }
  tooltipInstances = [];
}
function initTooltips(root = document) {
  const els = root.querySelectorAll(TOOLTIP_SELECTOR);
  for (const el of els) {
    const inst = new bootstrap.Tooltip(el, { container: 'body' });
    tooltipInstances.push(inst);
  }
}

function requestPage(which) {
  const statuses = getStatuses();
  const limit = getPageSize();
  const offset = state[which].page * limit;
  const order  = getOrderBy();
  socket.emit('jobs_list', { table: which, limit, offset, statuses, order });
}

function badgeForStatus(st){
  const map = {
    queued:   'secondary',
    running:  'info',
    done:     'success',
    error:    'danger',
    canceled: 'warning'
  };
  const theme = map[st] || 'secondary';
  return `<span class="badge text-bg-${theme} status-badge">${st}</span>`;
}

function fmtDate(s){
  if(!s) return '-';
  // aceita "YYYY-MM-DD HH:MM:SS" do SQLite; mostramos hh:mm dd/mm
  const d = new Date(String(s).replace(' ', 'T') + 'Z'); // se vier sem TZ, trate como UTC
  if (isNaN(d)) return s;
  return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' +
         d.toLocaleDateString('pt-BR');
}

function encodeQuery(params){
  return Object.entries(params)
   .filter(([,v]) => v !== undefined && v !== null && v !== '')
   .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

function getStatuses(){
  return $$('.status-filter:checked').map(x => x.value);
}
function getOrderBy(){
  return $('#orderSelect').value;
}
function getPageSize(){
  return parseInt($('#pageSize').value, 10) || 50;
}

const refreshTimers = { downloads: null, uploads: null };
function scheduleRefresh(table, delay=120){
  clearTimeout(refreshTimers[table]);
  refreshTimers[table] = setTimeout(() => requestPage(table), delay);
}

function applyClientFilters(rows){
  const q = $('#searchBox').value.trim().toLowerCase();
  const statuses = new Set(getStatuses()); // vazio => "todos" (comporta como o servidor)

  return rows.filter(r => {
    const statusOk = statuses.size === 0 || statuses.has(r.status);
    if (!statusOk) return false;

    if (!q) return true;
    return [r.id, r.projeto, r.titulo, r.grupo_text, r.capitulo, r.volume]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });
}

function _clampBp(v){
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10000, Math.round(n)));
}

function normalizeJob(j){
  const out = { ...j };

  if ((out.status === 'queued' || out.status === 'running') &&
      (out.progress_bp === undefined || out.progress_bp === null)) {
    out.progress_bp = 0;
  }
  if (out.progress_bp !== undefined) out.progress_bp = _clampBp(out.progress_bp);

  const g = parseGrupo(out.grupo);
  out.grupo_text = g.text;   // p/ mostrar e buscar
  out.grupo_list = g.list;   // se precisar no futuro

  return out;
}


function mergeJob(prev, next){
  const merged = { ...prev, ...next };
  if ((next?.status === 'queued' || next?.status === 'running') &&
      (next.progress_bp === undefined || next.progress_bp === null)) {
    merged.progress_bp = 0;
  }
  if (merged.progress_bp !== undefined) merged.progress_bp = _clampBp(merged.progress_bp);
  if ((next?.status === 'queued' || next?.status === 'running') &&
      prev?.last_error && next?.last_error === undefined) {
    merged.last_error = null;
  }
  return merged;
}

// ---------- Reconciliação por linha (sem piscar) ----------
const rowCache = {
  downloads: new Map(), // id -> <tr>
  uploads:   new Map(),
};
const pinnedRows = new Set();
const PIN_TIMEOUT = 1500; // ms sem interação para “desprender”

function tbodyEl(table){
  return table === 'downloads' ? $('#tbl-downloads tbody') : $('#tbl-uploads tbody');
}
function attachInteractionPins(tr){
  let timer = null;
  const touch = () => {
    pinnedRows.add(tr);
    clearTimeout(timer);
    timer = setTimeout(() => pinnedRows.delete(tr), PIN_TIMEOUT);
  };
  ['mousedown','touchstart','focusin'].forEach(ev => tr.addEventListener(ev, touch));
  ['mouseup','mouseleave','touchend','blur'].forEach(ev => tr.addEventListener(ev, () => {
    clearTimeout(timer);
    timer = setTimeout(() => pinnedRows.delete(tr), 300);
  }));
}

function filesCountInfo(files, files_count){
  if (Number.isFinite(files_count)) return `${files_count} arquivo(s)`;
  if (!files) return '-';
  if (Array.isArray(files)) return `${files.length} arquivo(s)`;
  try {
    const arr = JSON.parse(files);
    return Array.isArray(arr) ? `${arr.length} arquivo(s)` : '-';
  } catch { return '-'; }
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function createRowEl(table, r){
  const tr = document.createElement('tr');
  tr.dataset.id = r.id;

  tr.innerHTML = `
    <td data-role="ordem" class="monosmall"></td>
    <td>
      <div data-role="title" class="fw-semibold truncate" title=""></div>
      <div data-role="subtitle" class="truncate text-secondary" title=""></div>
      <div data-role="rid" class="monosmall"></div>
    </td>
    <td data-role="capitulo"></td>
    <td data-role="volume"></td>
    <td data-role="grupo" class="truncate" title=""></td>
    <td data-role="priority" class="monosmall"></td>
    <td data-role="statuswrap"></td>
    <td>
      <div class="d-flex align-items-center gap-2">
        <div class="progress flex-grow-1" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <div data-role="pbar" class="progress-bar"></div>
        </div>
        <span data-role="ppct" class="monosmall" style="min-width:42px; text-align:right;"></span>
      </div>
      <div data-role="filesinfo" class="monosmall text-secondary mt-1"></div>
    </td>
    <td>
      <div class="monosmall"><span class="text-secondary">Criado:</span> <span data-role="created"></span></div>
      <div class="monosmall"><span class="text-secondary">Atualizado:</span> <span data-role="updated"></span></div>
    </td>
    <td>
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-light" title="Aumentar prioridade"><i class="bi bi-arrow-up"></i></button>
        <button class="btn btn-outline-light" title="Diminuir prioridade"><i class="bi bi-arrow-down"></i></button>
        <button data-role="toggle-run" class="btn btn-outline-info" title="Re-tirar"><i class="bi bi-arrow-repeat"></i></button>
        <button class="btn btn-outline-danger" title="Remover"><i class="bi bi-trash"></i></button>
      </div>
    </td>
  `;

  // delega cliques dos botões da linha
  const [btnUp, btnDown, btnToggle, btnDel] = tr.querySelectorAll('.btn-group .btn');
  btnUp.addEventListener('click',  () => actionBump(table, r.id, +1));
  btnDown.addEventListener('click',() => actionBump(table, r.id, -1));
  btnDel.addEventListener('click', () => actionRemove(table, r.id));
  btnToggle.addEventListener('click', () => {
    const isRunning = (tr.dataset.status === 'running');
    if (isRunning) actionCancel(table, r.id);
    else actionRetry(table, r.id);
  });

  attachInteractionPins(tr);
  patchRowEl(tr, r, /*isNew*/ true);
  return tr;
}

function patchRowEl(tr, r, isNew = false){
  if (pinnedRows.has(tr)) return; // usuário interagindo: não mexe

  const $setText = (role, text) => {
    const el = tr.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    const t = String(text ?? '');
    if (el.textContent !== t) el.textContent = t;
  };
  const $setHTML = (role, html) => {
    const el = tr.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  };
  const $setTitle = (role, title) => {
    const el = tr.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    const t = String(title ?? '');
    if (el.title !== t) el.title = t;
  };

  tr.dataset.status = r.status;

  $setText('ordem', r.ordem ?? 0);
  $setText('title', r.projeto || '-');  $setTitle('title', r.projeto || '-');
  $setText('subtitle', r.titulo || '-');$setTitle('subtitle', r.titulo || '-');
  $setText('rid', r.id);

  $setText('capitulo', r.capitulo ?? '-');
  $setText('volume', r.one_shot ? 'One-shot' : (r.volume ?? '-'));

  $setText('grupo',  r.grupo_text || '-');
  $setTitle('grupo', r.grupo_text || '-');

  $setText('priority', r.priority ?? 0);

  // status + erro (tooltip só quando cria ícone)
  const statusWrap = tr.querySelector('[data-role="statuswrap"]');
  const wantHTML = badgeForStatus(r.status) + (r.last_error ? ` <i class="bi bi-exclamation-triangle-fill text-danger" data-bs-toggle="tooltip" data-bs-title="${escapeHtml(r.last_error)}"></i>` : '');
  if (statusWrap && statusWrap.innerHTML !== wantHTML) {
    statusWrap.innerHTML = wantHTML;
    const icon = statusWrap.querySelector('[data-bs-toggle="tooltip"]');
    if (icon) new bootstrap.Tooltip(icon, { container:'body' });
  }

  // progresso
  const pct = toPercent(r.progress_bp);
  const pbar  = tr.querySelector('[data-role="pbar"]');
  const ppct  = tr.querySelector('[data-role="ppct"]');
  const pwrap = tr.querySelector('[role="progressbar"]');

  if (pbar) {
    // remove qualquer estilo/classe que possa animar/transformar
    pbar.classList.remove('progress-bar-striped','progress-bar-animated');
    if (pbar.style.transform !== 'none') pbar.style.transform = 'none';
    if (pbar.style.width !== `${pct}%`) pbar.style.width = `${pct}%`;
  }
  if (ppct && ppct.textContent !== `${pct}%`) ppct.textContent = `${pct}%`;
  if (pwrap && pwrap.getAttribute('aria-valuenow') !== String(pct)) {
    pwrap.setAttribute('aria-valuenow', String(pct));
  }

  $setText('filesinfo', filesCountInfo(r.files, r.files_count));
  $setText('created', fmtDate(r.created_at));
  $setText('updated', fmtDate(r.updated_at));

  // toggle (cancel/retry)
  const btnToggle = tr.querySelector('[data-role="toggle-run"]');
  if (btnToggle) {
    if (r.status === 'running') {
      btnToggle.classList.remove('btn-outline-info');
      btnToggle.classList.add('btn-outline-warning');
      btnToggle.title = 'Cancelar';
      btnToggle.innerHTML = '<i class="bi bi-stop-circle"></i>';
    } else {
      btnToggle.classList.remove('btn-outline-warning');
      btnToggle.classList.add('btn-outline-info');
      btnToggle.title = 'Re-tirar';
      btnToggle.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
    }
  }

  if (isNew) attachInteractionPins(tr);
}

function reconcileTable(table, rows){
  const tbody = tbodyEl(table);
  const cache = rowCache[table];

  const desiredIds = rows.map(r => r.id);
  const desiredSet = new Set(desiredIds);

  // remove linhas não desejadas
  for (const [id, tr] of [...cache.entries()]) {
    if (!desiredSet.has(id)) {
      cache.delete(id);
      tr.remove();
    }
  }

  // cria/move/patch na ordem correta
  let anchor = tbody.firstElementChild;
  for (const r of rows) {
    let tr = cache.get(r.id);
    if (!tr) {
      tr = createRowEl(table, r);
      cache.set(r.id, tr);
      if (anchor) tbody.insertBefore(tr, anchor);
      else tbody.appendChild(tr);
    } else {
      if (tr !== anchor) tbody.insertBefore(tr, anchor);
      patchRowEl(tr, r, /*isNew*/ false);
    }
    anchor = tr.nextElementSibling;
  }
}

function updateBadges() {
  const dlTotal = Number.isFinite(state.downloads.total)
    ? state.downloads.total
    : (state.downloads.cache?.length || 0);

  const ulTotal = Number.isFinite(state.uploads.total)
    ? state.uploads.total
    : (state.uploads.cache?.length || 0);

  const bdl = $('#badge-dl');
  const bul = $('#badge-ul');
  if (bdl) bdl.textContent = String(dlTotal);
  if (bul) bul.textContent = String(ulTotal);
}

function updateMeta(which, { shownCount, limit }) {
  const metaEl = which === 'downloads' ? $('#dl-meta') : $('#ul-meta');
  if (!metaEl) return;

  const { page, total } = state[which];

  const start = total ? (page * limit) + 1 : (state[which].cache.length ? 1 : 0);
  const end   = total ? Math.min((page + 1) * limit, total) : state[which].cache.length;
  const parts = [];

  if (total) parts.push(`${start}–${end} de ${total}`);
  else parts.push(`${shownCount} item(ns)`);

  if (shownCount !== (end - start + 1) && shownCount > 0) {
    parts.push(`(${shownCount} após filtro)`);
  }

  parts.push(`• pág ${page + 1}`);
  metaEl.textContent = parts.join(' ');
}

function updatePager(which, limit) {
  const prevBtn = which === 'downloads' ? $('#dl-prev') : $('#ul-prev');
  const nextBtn = which === 'downloads' ? $('#dl-next') : $('#ul-next');

  const { page, total, cache } = state[which];

  const hasPrev = page > 0;
  const hasNext = Number.isFinite(total) && total > 0
    ? ((page + 1) * limit) < total
    : (cache.length === limit);

  if (prevBtn) prevBtn.disabled = !hasPrev;
  if (nextBtn) nextBtn.disabled = !hasNext;
}

// ---------- Paginação ----------
async function loadPage(which) {
  requestPage(which);
}

// ---------- Eventos UI ----------
$('#dl-prev').addEventListener('click', () => {
  state.downloads.page = Math.max(0, state.downloads.page - 1);
  loadPage('downloads');
});
$('#dl-next').addEventListener('click', () => {
  state.downloads.page = state.downloads.page + 1;
  loadPage('downloads');
});
$('#ul-prev').addEventListener('click', () => {
  state.uploads.page = Math.max(0, state.uploads.page - 1);
  loadPage('uploads');
});
$('#ul-next').addEventListener('click', () => {
  state.uploads.page = state.uploads.page + 1;
  loadPage('uploads');
});

$('#orderSelect').addEventListener('change', () => {
  state.downloads.page = 0;
  state.uploads.page = 0;
  requestPage('downloads');
  requestPage('uploads');
});

$('#pageSize').addEventListener('change', () => {
  state.downloads.page = 0;
  state.uploads.page = 0;
  requestPage('downloads');
  requestPage('uploads');
});

// filtros por status — re-render imediato + fetch
$$('.status-filter').forEach(cb => cb.addEventListener('change', () => {
  state.downloads.page = 0;
  state.uploads.page = 0;

  // re-render imediato com filtro local (sumiço instantâneo)
  reconcileTable('downloads', applyClientFilters(state.downloads.cache));
  reconcileTable('uploads',   applyClientFilters(state.uploads.cache));

  // e já agenda/faz o fetch no servidor
  requestPage('downloads');
  requestPage('uploads');
}));

// busca local (client-side), não pede servidor
$('#searchBox').addEventListener('input', () => {
  reconcileTable('downloads', applyClientFilters(state.downloads.cache));
  reconcileTable('uploads',   applyClientFilters(state.uploads.cache));
});

Object.assign(window, {
  applyClientFilters,
  reconcileTable,
  updateBadges,
  updateMeta,
  updatePager,
  requestPage,
  scheduleRefresh,
});
