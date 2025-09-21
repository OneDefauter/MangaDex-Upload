(() => {
  // ---------- i18n helper ----------
  function T(key, fallback) {
    const sources = [window.I18N_SCRIPT, window.I18N_WEB, window.I18N_LANG];
    for (const src of sources) {
      let obj = src;
      for (const p of String(key||'').split('.')) {
        if (!obj || typeof obj !== 'object' || !(p in obj)) { obj = undefined; break; }
        obj = obj[p];
      }
      if (typeof obj === 'string') return obj;
    }
    return fallback;
  }

  // ---------- SETTINGS ----------
  let settingsJSON = '{}';
  try { settingsJSON = document.getElementById('app-settings')?.textContent || '{}'; } catch {}
  const SETTINGS = JSON.parse(settingsJSON || '{}');

  const API_BASE   = SETTINGS['api.url'] || 'https://api.mangadex.org';
  const API        = '/api/mdx/manga'; // proxy
  const MODE       = document.body.dataset.mode || "download";
  const PAGE_SIZE  = Number(SETTINGS['search.pagination'] ?? 12);
  const MAX_TOTAL  = Number(SETTINGS['search.max_results'] ?? 50);
  const BATCH      = Math.min(100, MAX_TOTAL); // MangaDex máx 100
  const CV_QUALITY = Number(SETTINGS['cv.quality'] ?? 1); // 1=full, 2=512, 3=256

  const FILTERS = {
    status:          SETTINGS['search.filters.status']          || [],
    languages:       SETTINGS['search.filters.languages']       || [],
    demography:      SETTINGS['search.filters.demography']      || [],
    content_rating:  SETTINGS['search.filters.content_rating']  || ['safe','suggestive','erotica','pornographic'],
  };

  // search.sort aceitando [{field, dir}] ou [{key, dir}]
  const SORT_RAW = Array.isArray(SETTINGS['search.sort']) ? SETTINGS['search.sort'] : [{field:'relevance', dir:'desc'}];
  const SORT = SORT_RAW.map(s => ({ field: s.field || s.key, dir: (s.dir || 'desc').toLowerCase() }));

  // ---------- TEXTOS ----------
  const TXT = {
    loading:   T('search.loading', 'Carregando...'),
    noResults: T('search.no_results', 'Nenhum resultado.'),
    minChars:  T('search.min_chars', 'Digite pelo menos 3 caracteres...'),
    next:      T('search.next', 'Próximo'),
    loadMore:  T('search.load_more', 'Carregar mais'),
    prev:      T('search.prev', 'Anterior'),
    pageOf:    T('search.page_of', 'Página {page} de {total}'),
    error:     T('search.error', 'Erro ao buscar.')
  };

  // ---------- DOM ----------
  const $ = s => document.querySelector(s);
  const grid     = $('#grid');
  const prevBtn  = $('#prevBtn');
  const nextBtn  = $('#nextBtn');
  const pageInfo = $('#pageInfo');
  const input    = $('#q');
  const live     = $('#liveStatus'); // opcional

  // ---------- estado ----------
  const state = { q:'', page:1, cache:[], total:0, loading:false };
  let currentAbort = null;

  // ---------- helpers ----------
  function announce(msg){
    if (live) live.textContent = msg;
  }
  function debounce(fn, ms=500){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  function getTitle(attrs){
    const t = attrs.title || {};
    const alts = attrs.altTitles || [];
    const keys = ['pt-br','en','ja-ro','ja'];
    for (const k of keys) if (t[k]) return t[k];
    for (const k of keys){ const hit = alts.find(o=>o[k]); if (hit) return hit[k]; }
    return Object.values(t)[0] || T('search.untitled','Sem título');
  }
  function scrollToTop(){ window.scrollTo({ top: 0, behavior: "smooth" }); }

  function buildCoverUrl(id, file){
    if (!file) return 'https://placehold.co/512x700?text=Sem+Capa';
    switch (CV_QUALITY){
      case 2: return `https://uploads.mangadex.org/covers/${id}/${file}.512.jpg`;
      case 3: return `https://uploads.mangadex.org/covers/${id}/${file}.256.jpg`;
      case 1:
      default: return `https://uploads.mangadex.org/covers/${id}/${file}`;
    }
  }

  function effectiveTotal(){ return Math.min(state.total, MAX_TOTAL); }
  function totalPagesLocal(){ return Math.max(1, Math.ceil(state.cache.length / PAGE_SIZE)); }

  function setLoading(on){
    state.loading = on;
    nextBtn.disabled = on;
    if (on) {
      grid.innerHTML = `<div class="col-12 text-center text-muted">${TXT.loading}</div>`;
      announce(TXT.loading);
    }
  }

  function updateNextButtonMode(){
    const atLastLocal = state.page >= totalPagesLocal();
    const hasRemote   = state.cache.length < effectiveTotal();
    if (atLastLocal && hasRemote){
      nextBtn.textContent = TXT.loadMore;
      nextBtn.dataset.mode = 'load';
      nextBtn.disabled = false;
    } else {
      nextBtn.textContent = TXT.next;
      nextBtn.dataset.mode = 'next';
      nextBtn.disabled = state.page >= totalPagesLocal() && !hasRemote;
    }
  }

  function renderPage(){
    const totalLocal = state.cache.length;
    if (!totalLocal){
      grid.innerHTML = `<div class="col-12 text-center text-muted">${TXT.noResults}</div>`;
      pageInfo.textContent = TXT.pageOf.replace('{page}','0').replace('{total}','0');
      prevBtn.disabled = true;
      updateNextButtonMode();
      return;
    }

    const start = (state.page - 1) * PAGE_SIZE;
    const items = state.cache.slice(start, start + PAGE_SIZE);

    grid.innerHTML = items.map(x => {
      const id = x.id, attrs = x.attributes || {};
      const title = getTitle(attrs);
      const rel = (x.relationships || []).find(r => r.type === 'cover_art');
      const coverFile = rel?.attributes?.fileName;
      const cover = buildCoverUrl(id, coverFile);
      const href = MODE === "edit" ? `/edit/${id}` : `/download/${id}`;
      return `
        <div class="col">
          <a href="${href}" class="text-decoration-none text-reset">
            <div class="card manga-card h-100 shadow-sm border-0">
              <img src="${cover}" alt="${title}">
              <div class="card-body py-3">
                <h6 class="card-title fw-semibold">${title}</h6>
              </div>
            </div>
          </a>
        </div>`;
    }).join('');

    const totalPagesRemoteHint = Math.max(1, Math.ceil(effectiveTotal() / PAGE_SIZE));
    const totalHint = Math.max(totalPagesLocal(), totalPagesRemoteHint);
    pageInfo.textContent = TXT.pageOf.replace('{page}', String(state.page)).replace('{total}', String(totalHint));
    prevBtn.disabled = state.page <= 1;
    updateNextButtonMode();
  }

  // --------- preload das capas ---------
  const preloaded = new Set();
  function preloadImage(url){
    if (!url || preloaded.has(url)) return;
    preloaded.add(url);
    const img = new Image();
    img.decoding = 'async';
    try { img.fetchPriority = 'low'; } catch(_) {}
    img.src = url;
  }
  function coverUrlFromItem(item){
    const id = item.id;
    const rel = (item.relationships || []).find(r => r.type === 'cover_art');
    const file = rel?.attributes?.fileName;
    return file ? buildCoverUrl(id, file) : null;
  }
  function preloadAllFromCache(){ state.cache.forEach(it => { const u = coverUrlFromItem(it); if (u) preloadImage(u); }); }
  function preloadOnly(arr){ arr.forEach(it => { const u = coverUrlFromItem(it); if (u) preloadImage(u); }); }

  // ---------- query params ----------
  function orderParams(params) {
    SORT.forEach(s => {
      if (!s || !s.field) return;
      const dir = (s.dir || 'desc') === 'asc' ? 'asc' : 'desc';
      params.append(`order[${s.field}]`, dir);
    });
  }

  function buildParams({ title, limit, offset }){
    const p = new URLSearchParams();
    p.set('title', title);
    p.set('limit', String(limit));
    p.set('offset', String(offset));
    p.append('includes[]', 'cover_art');

    // filtros do settings
    FILTERS.content_rating.forEach(v => p.append('contentRating[]', v));

    // ATENÇÃO: atualmente usando idioma original do mangá:
    FILTERS.languages.forEach(v => p.append('originalLanguage[]', v));
    // Se preferir filtrar por idiomas traduzidos, troque a linha acima por:
    // FILTERS.languages.forEach(v => p.append('availableTranslatedLanguage[]', v));

    FILTERS.demography.forEach(v => p.append('publicationDemographic[]', v));
    FILTERS.status.forEach(v => p.append('status[]', v));

    orderParams(p);
    return p;
  }

  // ---------- buscas ----------
  function cancelOngoing(){
    try { currentAbort?.abort(); } catch {}
    currentAbort = new AbortController();
    return currentAbort.signal;
  }

  async function searchOnce(){
    if (state.q.length < 3){
      state.cache = []; state.total = 0; state.page = 1;
      grid.innerHTML = `<div class="col-12 text-center text-muted">${TXT.minChars}</div>`;
      pageInfo.textContent = TXT.pageOf.replace('{page}','0').replace('{total}','0');
      prevBtn.disabled = true;
      updateNextButtonMode();
      return;
    }
    setLoading(true);
    const signal = cancelOngoing();
    try{
      const params = buildParams({ title: state.q, limit: BATCH, offset: 0 });
      const r = await fetch(`${API}?${params}`, { signal });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      state.cache = data?.data || [];
      state.total = Number.isFinite(data?.total) ? data.total : state.cache.length;

      if (state.cache.length > MAX_TOTAL) state.cache = state.cache.slice(0, MAX_TOTAL);
      preloadAllFromCache();

      state.page = 1;
      renderPage();
      input.blur();
      announce(T('search.announce_results', 'Resultados atualizados.'));
    }catch(err){
      if (err?.name === 'AbortError') return; // ignorar requisição cancelada
      console.error(err);
      grid.innerHTML = `<div class="col-12 text-center text-danger">${TXT.error}</div>`;
      pageInfo.textContent = TXT.pageOf.replace('{page}','0').replace('{total}','0');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      announce(T('search.announce_error', 'Falha ao buscar.'));
    }finally{
      setLoading(false);
    }
  }

  async function loadMore(){
    if (state.loading) return;
    if (state.cache.length >= effectiveTotal()) return;

    state.loading = true;
    nextBtn.disabled = true;
    const prevLabel = nextBtn.textContent;
    nextBtn.textContent = TXT.loading;

    const signal = cancelOngoing();
    try{
      const offset = state.cache.length;
      const remaining = effectiveTotal() - state.cache.length;
      const limit = Math.min(BATCH, remaining);
      const params = buildParams({ title: state.q, limit, offset });
      const r = await fetch(`${API}?${params}`, { signal });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      const more = (data?.data || []).slice(0, limit);
      state.total = Number.isFinite(data?.total) ? data.total : state.total;
      state.cache = state.cache.concat(more);
      preloadOnly(more);

      renderPage(); // mantém a mesma página
    }catch(err){
      if (err?.name !== 'AbortError') {
        console.error(err);
        nextBtn.textContent = prevLabel;
      }
    }finally{
      state.loading = false;
      nextBtn.disabled = false;
    }
  }

  // ---------- eventos ----------
  input.addEventListener('input', debounce(e => {
    state.q = e.target.value.trim();
    searchOnce();
  }, 500));

  // Enter força busca imediata
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.q = input.value.trim();
      searchOnce();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (state.page > 1){ state.page--; renderPage(); scrollToTop(); }
  });

  nextBtn.addEventListener('click', () => {
    if (state.loading) return;
    if (nextBtn.dataset.mode === 'load'){
      loadMore();
    } else if (state.page < totalPagesLocal()){
      state.page++; renderPage(); scrollToTop();
    }
  });

  function isTyping(el){ if(!el) return false; const tag = el.tagName?.toLowerCase(); return tag==='input'||tag==='textarea'||el.isContentEditable; }
  function handleKeyNav(e){
    if (isTyping(document.activeElement)) return;
    if (state.loading) return;
    switch (e.key){
      case 'ArrowLeft':
        if (state.page > 1){ e.preventDefault(); state.page--; renderPage(); scrollToTop(); }
        break;
      case 'ArrowRight': {
        const mode = nextBtn.dataset.mode;
        if (mode==='next'){
          const tp = totalPagesLocal();
          if (state.page < tp){ e.preventDefault(); state.page++; renderPage(); scrollToTop(); }
        } else if (mode==='load'){ e.preventDefault(); loadMore(); }
        break;
      }
    }
  }
  window.addEventListener('keydown', handleKeyNav);

  // ---------- inicialização ----------
  // suporta ?q= na URL (pré-popula e busca)
  try {
    const u = new URL(window.location.href);
    const q0 = (u.searchParams.get('q') || '').trim();
    if (q0) {
      input.value = q0;
      state.q = q0;
      searchOnce();
      return;
    }
  } catch {}

  grid.innerHTML = `<div class="col-12 text-center text-muted">${TXT.minChars}</div>`;
  pageInfo.textContent = TXT.pageOf.replace('{page}','0').replace('{total}','0');
  prevBtn.disabled = true;
  updateNextButtonMode();
})();
