(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  // ---------- i18n ----------
  const I18N = (window.I18N_SCRIPT && window.I18N_SCRIPT.logs && window.I18N_SCRIPT.logs.upload) || {};
  const DEFAULTS = {
    pageinfo: 'Página {page}/{pages} — {total} registro(s)',
    load_error_row: 'Falha ao carregar logs.',
    ts_fallback: '—',
    json_btn: 'ver',
    json_btn_title: 'Ver dados JSON'
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
    q: '',
    upload_id: '',
    levels: new Set(['info','warning','error','critical']),
    stages: [],
    since: null,
    until: null,
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
  function fmtTs(ts){ return ts ? esc(ts.replace('T',' ').replace('Z','')) : T('ts_fallback'); }

  function toIsoLocal(dtLocal){
    // datetime-local -> "YYYY-MM-DDTHH:MM"
    return dtLocal && dtLocal.trim() ? dtLocal.trim() : null;
  }

  async function fetchUploadLogs(){
    const levels = [...state.levels].join(',');
    const stages = state.stages.join(',');
    const params = new URLSearchParams({
      q: state.q || '',
      upload_id: state.upload_id || '',
      levels,
      stages,
      since: state.since || '',
      until: state.until || '',
      limit: String(state.limit),
      offset: String(state.offset)
    });
    const r = await fetch(`/api/logs/uploads?`+params.toString(), { headers:{Accept:'application/json'} });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function render(rows, total){
    const tb = $('#upl-tbody'); tb.innerHTML = '';
    for (const it of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-mono">${fmtTs(it.ts)}</td>
        <td>${levelBadge(it.level)}</td>
        <td class="text-mono">${esc(it.stage || '—')}</td>
        <td class="text-mono">${esc(it.code || '—')}</td>
        <td class="pre-wrap">${esc(it.message || '')}</td>
        <td class="text-mono">${esc(it.upload_id || '')}</td>
        <td class="text-center">
          ${it.data ? `<button class="btn btn-sm btn-outline-secondary btn-view" title="${esc(T('json_btn_title'))}">${esc(T('json_btn'))}</button>` : '—'}
        </td>
      `;
      tb.appendChild(tr);

      if (it.data){
        const dtr = document.createElement('tr');
        dtr.className = 'detail-row d-none';
        const pretty = JSON.stringify(it.data, null, 2);
        dtr.innerHTML = `<td colspan="7"><pre class="pre-wrap text-mono mb-0">${esc(pretty)}</pre></td>`;
        tb.appendChild(dtr);

        const btn = tr.querySelector('.btn-view');
        btn.addEventListener('click', ()=> dtr.classList.toggle('d-none'));
      }
    }
    state.total = total;

    const page = Math.floor(state.offset / state.limit) + 1;
    const pages = Math.max(1, Math.ceil(total / state.limit));
    $('#upl-pageinfo').textContent = T('pageinfo', { page, pages, total });
    $('#upl-prev').disabled = state.offset <= 0;
    $('#upl-next').disabled = state.offset + state.limit >= total;
  }

  async function load(){
    try{
      const j = await fetchUploadLogs();
      render(j.items || [], j.total || 0);
    }catch(e){
      console.error(e);
      const tb = $('#upl-tbody'); tb.innerHTML = `<tr><td colspan="7" class="text-danger">${esc(T('load_error_row'))}</td></tr>`;
      $('#upl-pageinfo').textContent = '';
    }
  }

  function readControls(){
    state.upload_id = $('#upl-upload-id').value.trim();
    state.q = $('#upl-q').value.trim();
    state.limit = parseInt($('#upl-limit').value, 10) || 100;

    const lv = new Set();
    $$('.upl-lv:checked').forEach(ch => lv.add(ch.value));
    state.levels = lv;

    const stages = $('#upl-stages').value.trim();
    state.stages = stages ? stages.split(',').map(s=>s.trim()).filter(Boolean) : [];

    state.since = toIsoLocal($('#upl-since').value);
    state.until = toIsoLocal($('#upl-until').value);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Botões
    $('#upl-refresh').addEventListener('click', ()=>{ state.offset=0; readControls(); load(); });
    $('#upl-clear').addEventListener('click', ()=>{
      $('#upl-upload-id').value = '';
      $('#upl-q').value = '';
      $$('.upl-lv').forEach(ch => ch.checked = ['info','warning','error','critical'].includes(ch.value));
      $('#upl-stages').value = '';
      $('#upl-since').value = '';
      $('#upl-until').value = '';
      $('#upl-limit').value = '100';
      state.offset = 0; readControls(); load();
    });

    // Paginação
    $('#upl-prev').addEventListener('click', ()=>{ if (state.offset>0){ state.offset = Math.max(0, state.offset-state.limit); load(); }});
    $('#upl-next').addEventListener('click', ()=>{ if (state.offset+state.limit<state.total){ state.offset += state.limit; load(); }});

    // Mudanças
    $('#upl-limit').addEventListener('change', ()=>{ state.offset=0; readControls(); load(); });
    $$('.upl-lv').forEach(ch => ch.addEventListener('change', ()=>{ state.offset=0; readControls(); load(); }));

    const debounced = debounce(()=>{ state.offset=0; readControls(); load(); }, 600);
    $('#upl-q').addEventListener('input', debounced);
    $('#upl-upload-id').addEventListener('input', debounced);
    $('#upl-stages').addEventListener('input', debounced);
    $('#upl-since').addEventListener('change', ()=>{ state.offset=0; readControls(); load(); });
    $('#upl-until').addEventListener('change', ()=>{ state.offset=0; readControls(); load(); });

    // inicial
    readControls();
    // Só carrega quando a aba for mostrada pela 1ª vez, para não “puxar” tudo de cara:
    const tabBtn = document.getElementById('tab-upl-btn');
    const handler = () => { load(); tabBtn.removeEventListener('shown.bs.tab', handler); };
    tabBtn.addEventListener('shown.bs.tab', handler);

    // a aba App carrega no app-logs.js ao iniciar a página
  });
})();
