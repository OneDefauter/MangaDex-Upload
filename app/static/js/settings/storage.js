(function(){
  if (typeof io !== "function") return;

  function T(key, fallback){
    const path = String(key||'').split('.');
    let obj = (window.I18N_WEB || {});
    for (const p of path){ if (obj && typeof obj === 'object' && p in obj) obj = obj[p]; else return fallback; }
    return (typeof obj === 'string') ? obj : fallback;
  }

  const DONE_MSG = T('settings.storage.cleared','Limpeza concluída.');

  const fmt = (b)=>{
    b = Number(b||0);
    if (b < 1024) return `${b} B`;
    const u = ["KB","MB","GB","TB"];
    let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length-1);
    return `${b >= 10 ? b.toFixed(0) : b.toFixed(1)} ${u[i]}`;
  };

  function setupUsageWidget({sizeElId, btnId, initBytesAttr, requestEvt, sizeEvt, clearEvt, clearedEvt}) {
    const sizeEl = document.getElementById(sizeElId);
    const btn = document.getElementById(btnId);
    if (!sizeEl || !btn || typeof socket === 'undefined') return;

    sizeEl.textContent = fmt(sizeEl.getAttribute(initBytesAttr) || 0);
    socket.on(sizeEvt, (p)=> sizeEl.textContent = fmt(p?.bytes || 0));

    btn.addEventListener("click", ()=>{ btn.disabled = true; socket.emit(clearEvt); });

    socket.on(clearedEvt, ()=>{ btn.disabled = false; window.showToast?.(DONE_MSG, "success"); });
    socket.on("connect", ()=> socket.emit(requestEvt));
  }

  setupUsageWidget({
    sizeElId: "prefetchSize",
    btnId: "btnPrefetchClear",
    initBytesAttr: "data-bytes",
    requestEvt: "prefetch:request_size",
    sizeEvt: "prefetch:size",
    clearEvt: "prefetch:clear",
    clearedEvt: "prefetch:cleared"
  });

  setupUsageWidget({
    sizeElId: "rawSize",
    btnId: "btnRawClear",
    initBytesAttr: "data-bytes",
    requestEvt: "raw:request_size",
    sizeEvt: "raw:size",
    clearEvt: "raw:clear",
    clearedEvt: "raw:cleared"
  });
})();
