(function(){
  function T(key, fallback){
    const path = String(key||'').split('.');
    let obj = (window.I18N_WEB || {});
    for (const p of path){ if (obj && typeof obj === 'object' && p in obj) obj = obj[p]; else return fallback; }
    return (typeof obj === 'string') ? obj : fallback;
  }

  const $ = (sel, root=document) => root.querySelector(sel);

  async function fetchStats(table){
    const res = await fetch(`/api/queue/stats?table=${encodeURIComponent(table)}`);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderStats(table, counts){
    const prefix = table === 'downloads' ? 'dl' : 'ul';
    const get = (k) => counts[k] || 0;
    const ids = [
      ['queued',   `${prefix}-count-queued`],
      ['running',  `${prefix}-count-running`],
      ['done',     `${prefix}-count-done`],
      ['error',    `${prefix}-count-error`],
      ['canceled', `${prefix}-count-canceled`],
    ];
    ids.forEach(([status, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(get(status));
    });
  }

  async function refreshAll(){
    try {
      const [dl, ul] = await Promise.all([fetchStats('downloads'), fetchStats('uploads')]);
      if (dl?.ok) renderStats('downloads', dl.counts || {});
      if (ul?.ok) renderStats('uploads',   ul.counts || {});
    } catch(e){
      console.error(e);
      window.showToast?.(T('settings.queue.err_fetch','Erro ao buscar contagens: ') + e.message, 'danger');
    }
  }

  // trava global para não rodar duas vezes simultâneas
  const busy = { downloads:false, uploads:false };

  async function purge(table, btn, ev){
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    if (busy[table]) return; // já rodando

    const statuses = ['queued','error','done','canceled'];

    let current;
    try { const s = await fetchStats(table); current = s?.counts || {}; } catch {}

    const sumToDelete = statuses.reduce((acc, st) => acc + (current?.[st] || 0), 0);

    if (sumToDelete === 0) {
      window.showToast?.(
        T('settings.queue.nothing_to_purge', 'Não há itens para remover.'), 
        'info'
      );
      return;
    }

    const msg = T(
      'settings.queue.confirm_purge',
      `Remover ${sumToDelete} item(ns) de "${table}" com status: ${statuses.join(', ')}?\n(Itens em execução NÃO serão removidos)`
    );
    if (!confirm(msg)) return;

    busy[table] = true;
    btn?.setAttribute('disabled','disabled');
    try {
      const res = await fetch('/api/queue/purge', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Accept':'application/json'},
        body: JSON.stringify({ table, statuses })
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || 'Falha ao limpar');

      window.showToast?.(
        T('settings.queue.removed_n','Removidos {n} item(ns) de {table}.')
          .replace('{n}', String(data.deleted))
          .replace('{table}', table),
        'success'
      );

      renderStats(table, data.counts || {});
    } catch(e){
      console.error(e);
      window.showToast?.(T('settings.queue.err_purge','Erro ao limpar: ') + e.message, 'danger');
    } finally {
      busy[table] = false;
      btn?.removeAttribute('disabled');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // evita re-anexar handlers se o script for avaliado mais de uma vez
    if (window.__QUEUE_HANDLERS_BOUND__) return;
    window.__QUEUE_HANDLERS_BOUND__ = true;

    refreshAll();

    const btnDl = $('#btnPurgeDownloads');
    const btnUl = $('#btnPurgeUploads');

    btnDl?.setAttribute('type','button'); // garante que não submete form
    btnUl?.setAttribute('type','button');

    btnDl?.addEventListener('click', (ev) => purge('downloads', ev.currentTarget, ev), { passive:false });
    btnUl?.addEventListener('click', (ev) => purge('uploads',   ev.currentTarget, ev), { passive:false });
  });
})();
