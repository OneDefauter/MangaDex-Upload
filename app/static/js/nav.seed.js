(() => {
  const STORAGE_KEY = 'nav.cfg.v1';

  // Não guardamos "text" para impedir edição do rótulo.
  const DEFAULT_NAV = [
    { id:'home',           href:'/',               enabled:true,  order:0 },
    { id:'settings',       href:'/settings',       enabled:true,  order:1 },
    { id:'queue',          href:'/queue',          enabled:false, order:2 },
    { id:'upload',         href:'/upload',         enabled:false, order:3 },
    { id:'upload-complex', href:'/upload/complex', enabled:false, order:4 },
    { id:'download',       href:'/download',       enabled:false, order:5 },
    { id:'edit',           href:'/edit',           enabled:false, order:6 },
    // { id:'create',      href:'/create',         enabled:false, order:7 },
    { id:'logs',           href:'/logs',           enabled:false, order:8 },
    { id:'updates',        href:'/updates',        enabled:false, order:9 }
  ];

  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const save = (cfg) => localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));

  // Remove qualquer "text" legado de configs antigas
  const stripText = (arr) => {
    for (const it of arr) {
      if ('text' in it) delete it.text;
    }
    return arr;
  };

  function get() {
    let cfg = read();
    if (!Array.isArray(cfg) || cfg.length === 0) {
      cfg = DEFAULT_NAV.map(x => ({...x}));
      save(cfg);
    } else {
      // saneador/migrador: remove "text", garante itens padrão e campos mínimos
      cfg = stripText(cfg);
      const byId = new Map(cfg.map(x => [x.id, x]));
      for (const def of DEFAULT_NAV) if (!byId.has(def.id)) cfg.push({...def});
      for (let i=0;i<cfg.length;i++){
        const it = cfg[i];
        const def = DEFAULT_NAV.find(d => d.id === it.id) || {};
        if (typeof it.order   !== 'number') it.order   = def.order ?? i;
        if (typeof it.enabled !== 'boolean') it.enabled = !!def.enabled;
        if (!it.href) it.href = def.href || '#';
        // garantimos que text não fique salvo
        if ('text' in it) delete it.text;
      }
      cfg.sort((a,b)=>a.order-b.order);
      save(cfg); // persiste migração (sem text)
    }
    return cfg;
  }

  window.NavConfig = {
    STORAGE_KEY, DEFAULT_NAV, read, save, get,
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      const cfg = DEFAULT_NAV.map(x=>({...x}));
      save(cfg);
      window.dispatchEvent(new Event('nav:config-changed'));
      return cfg;
    },
    update(mutator){
      const cfg = get();
      mutator?.(cfg);
      stripText(cfg);
      save(cfg);
      window.dispatchEvent(new Event('nav:config-changed'));
      return cfg;
    }
  };

  // seed na primeira carga
  document.addEventListener('DOMContentLoaded', () => { void NavConfig.get(); });
})();
