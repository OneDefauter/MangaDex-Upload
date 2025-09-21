(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  // ---------- i18n ----------
  const I18N = (window.I18N_SCRIPT && window.I18N_SCRIPT.logs && window.I18N_SCRIPT.logs.app) || {};
  const DEFAULTS = {
    pageinfo: 'Página {page}/{pages} — {total} linha(s)',
    file_label: 'Arquivo: {path}',
    load_error_row: 'Falha ao carregar logs.',
    ts_fallback: '—'
  };
  const T = (k, vars={}) => {
    let s = I18N[k] || DEFAULTS[k] || '';
    Object.entries(vars).forEach(([key,val])=>{
      s = s.replaceAll(`{${key}}`, String(val));
    });
    return s;
  };

  const state = {
    offset: 0,
    limit: 100,
    total: 0,
    levels: new Set(['info','warning','error','critical']), // default checkeds
    q: ''
  };

  function levelBadge(level){
    const lv = (level||'').toLowerCase();
    const map = {
      debug:   'text-bg-secondary',
      info:    'text-bg-info',
      warning: 'text-bg-warning',
      error:   'text-bg-danger',
      critical:'text-bg-danger'
    };
    const cls = map[lv] || 'text-bg-secondary';
    return `<span class="badge log-level-badge ${cls}">${esc(lv||'—')}</span>`;
  }

  function fmtTs(ts){
    return ts ? esc(ts.replace('T',' ').replace('Z','')) : T('ts_fallback');
  }

  async function fetchAppLogs(){
    const lv = [...state.levels].join(',');
    const params = new URLSearchParams({
      levels: lv,
      q: state.q || '',
      limit: String(state.limit),
      offset: String(state.offset)
    });
    const r = await fetch(`/api/logs/app?${params.toString()}`, { headers:{Accept:'application/json'} });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function render(rows, total, path){
    const tb = $('#app-tbody'); tb.innerHTML = '';
    for (const it of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-mono">${fmtTs(it.ts)}</td>
        <td>${levelBadge(it.level)}</td>
        <td class="pre-wrap">${esc(it.message)}</td>
      `;
      tb.appendChild(tr);
    }
    state.total = total;

    const page = Math.floor(state.offset / state.limit) + 1;
    const pages = Math.max(1, Math.ceil(total / state.limit));
    $('#app-pageinfo').textContent = T('pageinfo', { page, pages, total });
    $('#app-prev').disabled = state.offset <= 0;
    $('#app-next').disabled = state.offset + state.limit >= total;

    $('#app-path').textContent = path ? T('file_label', { path }) : '';
  }

  async function load(){
    try{
      const j = await fetchAppLogs();
      render(j.items || [], j.total || 0, j.path);
    }catch(e){
      console.error(e);
      const tb = $('#app-tbody'); tb.innerHTML = `<tr><td colspan="3" class="text-danger">${esc(T('load_error_row'))}</td></tr>`;
      $('#app-pageinfo').textContent = '';
    }
  }

  function readControls(){
    state.limit = parseInt($('#app-limit').value, 10) || 100;
    state.q = $('#app-q').value.trim();
    const lv = new Set();
    $$('.app-lv:checked').forEach(ch => lv.add(ch.value));
    state.levels = lv;
  }

  document.addEventListener('DOMContentLoaded', () => {
    // eventos
    $('#app-refresh').addEventListener('click', ()=>{ state.offset=0; readControls(); load(); });
    $('#app-clear').addEventListener('click', ()=>{
      $('#app-q').value = '';
      $$('.app-lv').forEach(ch => ch.checked = ['info','warning','error','critical'].includes(ch.value));
      $('#app-limit').value = '100';
      state.offset = 0; readControls(); load();
    });

    $('#app-prev').addEventListener('click', ()=>{ if (state.offset>0){ state.offset = Math.max(0, state.offset-state.limit); load(); }});
    $('#app-next').addEventListener('click', ()=>{ if (state.offset+state.limit<state.total){ state.offset += state.limit; load(); }});

    $('#app-limit').addEventListener('change', ()=>{ state.offset=0; readControls(); load(); });

    const debounced = debounce(()=>{ state.offset=0; readControls(); load(); }, 600);
    $('#app-q').addEventListener('input', debounced);
    $$('.app-lv').forEach(ch => ch.addEventListener('change', ()=>{ state.offset=0; readControls(); load(); }));

    // inicial
    readControls();
    load();
  });
})();
