(() => {
  window.ENDPOINTS = {
    searchProjects: q => `/api/search/projects?q=${encodeURIComponent(q)}`,
    searchGroups:   q => `/api/search/groups?q=${encodeURIComponent(q)}`,
    enqueueUpload:  `/upload/enqueue`
  };

  // Helpers globais
  window.$  = (s, r=document)=>r.querySelector(s);
  window.$$ = (s, r=document)=>[...r.querySelectorAll(s)];
  window.toast = (msg, type="info", opts={})=>{
    if (window.showToast) window.showToast(String(msg), type, opts);
    else alert(`${type.toUpperCase()}: ${msg}`);
  };
  window.isUUID = (s)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||"").trim());
  window.escapeHtml = (s)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  window.nowLocalISO = ()=>{
    const d = new Date(), p=n=>String(n).padStart(2,"0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  window.plusDaysLocalISO = (days)=>{
    const d = new Date(), p=n=>String(n).padStart(2,"0");
    d.setDate(d.getDate()+days);
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  window.debounce = (fn, wait=3000) => {
    let t; const d=(...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); };
    d.cancel=()=>clearTimeout(t); return d;
  };

  window.T = (key, varsOrFallback, maybeFallback) => {
    const path = String(key || '').split('.');
    const sources = [window.I18N_SCRIPT, window.I18N_WEB, window.I18N_LANG];

    // procura a string nos dicionários (em ordem de prioridade)
    let str;
    for (const src of sources) {
      let obj = src;
      for (const p of path) {
        if (!obj || typeof obj !== 'object' || !(p in obj)) { obj = undefined; break; }
        obj = obj[p];
      }
      if (typeof obj === 'string') { str = obj; break; }
    }

    // trata parâmetros
    const isVarsObj = varsOrFallback && typeof varsOrFallback === 'object' && !Array.isArray(varsOrFallback);
    const vars = isVarsObj ? varsOrFallback : undefined;
    const fallback = isVarsObj ? maybeFallback : varsOrFallback;

    if (typeof str !== 'string') str = (typeof fallback === 'string') ? fallback : key;

    // interpolação simples: "Olá, {nome}"
    if (vars && typeof str === 'string') {
      str = str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
    }
    return str;
  };

  // (opcional) alias para evitar erros se algum script antigo chamar window._t
  if (!window._t) window._t = window.T;
})();