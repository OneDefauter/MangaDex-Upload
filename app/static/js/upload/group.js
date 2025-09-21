(() => {
  const MIN_CHARS = 3;
  let controller = null, composing = false;
  const state = { groups: [] }; // [{id,name}]

  const normId = (id) => String(id || '').trim().toLowerCase();
  const isUUIDFn = (s) => (window.isUUID ? window.isUUID(s) :
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||'').trim()));

  // 🔧 NORMALIZA qualquer forma que a API retornar
  function normalizeGroup(it = {}) {
    const id = String(it.id || '').trim();
    const name =
      it.name?.toString().trim() ||
      it.title?.toString().trim() ||
      it.attributes?.name?.toString().trim() ||
      it.attributes?.title?.toString().trim() ||
      it.displayName?.toString().trim() ||
      it.slug?.toString().trim() ||
      it.username?.toString().trim() ||
      it.label?.toString().trim() ||
      id;
    return { id, name };
  }

  // expõe para o send.js
  window.__getGroupsDetailed = () =>
    state.groups.map(g => ({ id: String(g.id), name: String(g.name) }));

  function renderChips(){
    const box = $("#groupChips");
    box.innerHTML = state.groups.map((g,i)=>`
      <span class="chip" data-id="${g.id}" data-name="${escapeHtml(g.name)}">
        <span>${escapeHtml(g.name)}</span>
        <span class="x" data-i="${i}" title="${T('upload.group.remove')}">✕</span>
      </span>`).join("");
  }

  function addGroup(raw){
    const g = normalizeGroup(raw);
    if (!g.id) return;
    if (state.groups.length >= 10) { toast(T("upload.group.limit"), "warning"); return; }
    if (state.groups.some(x => normId(x.id) === normId(g.id))) return;
    state.groups.push(g);
    renderChips();
    $("#groupInput").value = "";
  }

  function renderMenu(menuEl, items){
    if (!items?.length){ menuEl.classList.add("d-none"); menuEl.innerHTML=""; return; }
    menuEl.innerHTML = items.map((it,i)=>`
      <div class="ac-item" data-i="${i}">
        <div class="fw-semibold">${escapeHtml(it.name)}</div>
        <div class="muted">${escapeHtml(it.id)}</div>
      </div>`).join("");
    menuEl.classList.remove("d-none");
  }

  async function fetchGroups(q, signal){
    const url = ENDPOINTS.searchGroups(q);
    const r = await fetch(url, { headers:{Accept:"application/json"}, signal });
    if (!r.ok) return [];
    const arr = await r.json().catch(()=>[]);
    const selected = new Set(state.groups.map(g => normId(g.id)));
    return (Array.isArray(arr) ? arr : [])
      .map(normalizeGroup)
      .filter(it => it.id && !selected.has(normId(it.id)));
  }

  // Resolve uma UUID diretamente no backend (retorna {id,name} ou null)
  async function resolveGroupByUUID(uuid){
    try{
      const r = await fetch(ENDPOINTS.searchGroups(uuid), { headers:{Accept:"application/json"} });
      if (!r.ok) return null;
      const arr = await r.json().catch(()=>[]);
      const items = (Array.isArray(arr)?arr:[]).map(normalizeGroup);
      const hit = items.find(it => normId(it.id) === normId(uuid));
      return hit || null;
    }catch{ return null; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = $("#groupInput");
    const menu  = $("#groupMenu");

    // remover chip
    $("#groupChips").addEventListener("click", (e) => {
      const x = e.target.closest(".x");
      if (!x) return;
      const i = +x.dataset.i;
      if (Number.isInteger(i)) { state.groups.splice(i,1); renderChips(); }
    });

    // IME guard
    input.addEventListener("compositionstart", () => composing = true);
    input.addEventListener("compositionend",   () => { composing = false; debounced(); });

    // Enter com UUID -> valida no backend e adiciona com nome real
    input.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      const txt = input.value.trim();
      if (!txt || !isUUIDFn(txt)) return;

      e.preventDefault();
      input.disabled = true;
      try{
        const found = await resolveGroupByUUID(txt);
        if (found){
          addGroup(found);
          renderMenu(menu, []); // fecha menu
        }else{
          toast(T("upload.group.uuid_not_found"), "warning");
        }
      }finally{
        input.disabled = false;
      }
    });

    // clique em item (usa o item já normalizado em menu._items)
    menu.addEventListener("mousedown", (e) => {
      const el = e.target.closest(".ac-item");
      if (!el) return;
      const idx = +el.dataset.i;
      const data = menu._items || [];
      if (Number.isInteger(idx) && data[idx]) addGroup(data[idx]);
      menu.classList.add("d-none");
    });

    // fora do menu -> fecha
    document.addEventListener("click", (e)=> {
      if (!menu.contains(e.target) && e.target !== input) menu.classList.add("d-none");
    });

    const debounced = debounce(async () => {
      if (composing) return;
      const q = input.value.trim();
      if (!q) { renderMenu(menu, []); return; }
      if (q.length < MIN_CHARS && !isUUIDFn(q)) { renderMenu(menu, []); return; }

      // Busca no backend (funciona tanto para texto quanto para UUID)
      if (controller) try { controller.abort(); } catch {}
      controller = new AbortController();
      try {
        const items = await fetchGroups(q, controller.signal);
        menu._items = items; // já normalizados
        renderMenu(menu, items);
      } catch (e) {
        if (e.name !== "AbortError") console.warn(e);
      }
    }, 700);

    input.addEventListener("input", debounced);
  });
})();
