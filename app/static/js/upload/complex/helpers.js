window.UploadComplex = window.UploadComplex || {};

(function (NS) {
  // ───────── shorthands
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // ───────── extensões aceitas
  const EXT_OK     = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']); // imagens
  const ARCHIVE_OK = new Set(['.zip', '.cbz']);                           // compactados

  function _ext(name) {
    const i = String(name || '').lastIndexOf('.');
    return i >= 0 ? String(name).slice(i).toLowerCase() : '';
  }

  // ───────── utils
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  // Aceita UUID genérico v4/v5 (8-4-4-4-12), igual ao usado no resto do app
  function isUUID(s){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||'').trim()); }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function toast(msg, type='info'){
    const el = document.createElement('div');
    el.className = 'toast align-items-center text-bg-' + (type === 'error' ? 'danger' : type);
    el.innerHTML =
      `<div class="d-flex">
         <div class="toast-body">${escapeHtml(msg)}</div>
         <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
       </div>`;
    (document.getElementById('toastStack') || document.body).appendChild(el);
    new bootstrap.Toast(el, { delay: 4000 }).show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  // ---- HTTP util com timeout + retry exponencial simples
  async function fetchWithTimeoutRetry(input, init={}, opt={}) {
    const {
      timeout = 60_000,          // 60s por requisição
      retries = 10,               // nº de tentativas extras
      retryDelayBase = 1200,     // backoff base (ms)
      retryOnStatus = [408,429,500,502,503,504], // re-tentáveis
    } = opt;

    let attempt = 0;
    let lastErr = null;

    while (attempt <= retries) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(new Error('timeout')), timeout);
      try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        clearTimeout(id);
        if (!res.ok && retryOnStatus.includes(res.status) && attempt < retries) {
          // backoff
          const wait = retryDelayBase * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, wait));
          attempt++; continue;
        }
        return res; // ok ou erro não-repetível
      } catch (e) {
        clearTimeout(id);
        lastErr = e;
        // Abort/Network -> tenta de novo se ainda temos retries
        if (attempt < retries) {
          const wait = retryDelayBase * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, wait));
          attempt++; continue;
        }
        throw lastErr || e;
      }
    }
    // em teoria nunca cai aqui
    throw lastErr || new Error('fetch failed');
  }

  // ───────── endpoints (fallbacks)
  const ENDPOINTS = NS.ENDPOINTS || {
    searchGroups: (q) => `/api/groups?q=${encodeURIComponent(q)}`,
    enqueueUpload: '/upload/enqueue'
  };

  // ───────── exporta no namespace
  NS.$ = $;
  NS.$$ = $$;
  NS.EXT_OK = EXT_OK;
  NS.ARCHIVE_OK = ARCHIVE_OK;
  NS._ext = _ext;
  NS.debounce = debounce;
  NS.isUUID = isUUID;
  NS.escapeHtml = escapeHtml;
  NS.toast = NS.toast || toast;  // respeita toast global se já existir
  NS.ENDPOINTS = ENDPOINTS;
  NS.http = NS.http || {};
  NS.http.fetchWithTimeoutRetry = fetchWithTimeoutRetry;
})(window.UploadComplex);
