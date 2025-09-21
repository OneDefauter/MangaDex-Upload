(() => {
  const MIN_CHARS = 3;
  let controller = null, composing = false;

  // usa o toast global do app se existir (senão, cai no console)
  const toast = (window.UploadComplex && window.UploadComplex.toast)
    ? window.UploadComplex.toast
    : (msg, type) => (type === 'error' ? console.error(msg) : console.warn(msg));

  let chosenProject = null;
  window.__getChosenProject = () => chosenProject;

  // ─────────────────────────────────────────────────────────────────────
  // Long Strip detection (via resultado da busca)
  // ─────────────────────────────────────────────────────────────────────
  const LONG_STRIP_TAG_ID = '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d';
  const LS_NAMES = new Set(['long strip','longstrip','long-strip']);

  function normalizeTagName(t) {
    try {
      if (!t) return null;
      if (typeof t === 'string') return t;
      // { name: "Long Strip" }
      if (t.name) return String(t.name);
      // { attributes: { name: { en: "Long Strip", "pt-br": "..." } } }
      const n = t.attributes?.name;
      if (n) return n['en'] || n['pt-br'] || Object.values(n)[0];
      return null;
    } catch {
      return null;
    }
  }

  function detectLongStripFromItem(obj) {
    // buscamos em várias formas comuns: attributes.tags, tags, tagIds, tagNames
    const candidates = []
      .concat(obj?.attributes?.tags || [])
      .concat(obj?.tags || [])
      .concat(obj?.attributes?.tagIds || [])
      .concat(obj?.tagIds || [])
      .concat(obj?.attributes?.tagNames || [])
      .concat(obj?.tagNames || []);

    if (!candidates.length) return false;

    for (const t of candidates) {
      // 1) checa por ID direto
      if (typeof t === 'string' && t.toLowerCase() === LONG_STRIP_TAG_ID) return true;
      if (t && typeof t === 'object') {
        if (String(t.id || '').toLowerCase() === LONG_STRIP_TAG_ID) return true;
      }
      // 2) fallback: checa por nome
      const name = normalizeTagName(t);
      if (name && LS_NAMES.has(name.trim().toLowerCase())) return true;
    }
    return false;
  }

  function setLongStripFlag(flag) {
    const chosen = $("#projectChosen");
    if (!chosenProject) return;
    chosenProject.longStrip = !!flag;
    if (chosen) chosen.dataset.longStrip = String(!!flag);
  }

  // ─────────────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────────────
  function renderMenu(menuEl, items){
    if (!items?.length){ menuEl.classList.add("d-none"); menuEl.innerHTML=""; return; }
    menuEl.innerHTML = items.map((it,i)=>`
      <div class="ac-item" data-i="${i}">
        <div class="fw-semibold">${escapeHtml(it.title||it.name||"—")}</div>
        <div class="muted">${escapeHtml(it.id)}</div>
      </div>`).join("");
    menuEl.classList.remove("d-none");
  }

  async function fetchProjects(q, signal){
    const url = ENDPOINTS.searchProjects(q);
    const r = await fetch(url, { headers:{Accept:"application/json"}, signal });
    if (!r.ok) return [];
    return r.json().catch(()=>[]);
  }

  async function pickProject(obj){
    const projId = $("#projectId");
    const chosen = $("#projectChosen");
    const label  = $("#projectLabel");

    $("#projectInput").value = "";
    projId.value = obj.id;

    const title = obj.title || obj.name || obj.id;
    label.textContent = title;

    chosenProject = { id: obj.id, title, name: obj.name || null };
    chosen.dataset.id = obj.id;
    chosen.dataset.title = title;
    if (obj.name) chosen.dataset.name = obj.name;

    // Long Strip direto do item
    const isLS = detectLongStripFromItem(obj);
    setLongStripFlag(isLS);

    chosen.classList.remove("d-none");
    $("#projectMenu").classList.add("d-none");
  }

  // verifica UUID via API; se existir, seleciona
  async function verifyAndPickUUID(id){
    try{
      const items = await fetchProjects(id); // /api/search/projects já valida UUID e traz tags
      if (Array.isArray(items) && items.length){
        await pickProject(items[0]);
        return true;
      }
      toast(T('upload.project.uuid_not_found'), 'warning');
      return false;
    }catch(e){
      toast(T('upload.project.verify_error'), 'error');
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = $("#projectInput");
    const menu  = $("#projectMenu");

    // limpar seleção
    $("#projectClear").addEventListener("click", () => {
      $("#projectId").value = "";
      $("#projectChosen").classList.add("d-none");
      chosenProject = null;
      const ch = $("#projectChosen");
      if (ch) {
        ch.removeAttribute("data-id");
        ch.removeAttribute("data-title");
        ch.removeAttribute("data-name");
        ch.removeAttribute("data-long-strip");
      }
      $("#projectLabel").textContent = "";
    });

    // IME guard
    input.addEventListener("compositionstart", () => composing = true);
    input.addEventListener("compositionend",   () => { composing = false; debounced(); });

    // Enter com UUID → verificar na API antes de selecionar
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const txt = input.value.trim();
        if (isUUID(txt)) {
          e.preventDefault();
          if (controller) { try{ controller.abort(); }catch{}; controller = null; }
          await verifyAndPickUUID(txt);
        }
      }
    });

    // clique no item do menu
    menu.addEventListener("mousedown", (e) => {
      const el = e.target.closest(".ac-item");
      if (!el) return;
      const idx = +el.dataset.i;
      const data = menu._items || [];
      if (Number.isInteger(idx) && data[idx]) pickProject(data[idx]);
      menu.classList.add("d-none");
    });

    // fora do menu -> fecha
    document.addEventListener("click", (e)=> {
      if (!menu.contains(e.target) && e.target !== input) menu.classList.add("d-none");
    });

    const debounced = debounce(async () => {
      if (composing) return;
      const q = input.value.trim();
      if (!q || (q.length < MIN_CHARS && !isUUID(q))) {
        renderMenu(menu, []);
        return;
      }

      // aborta requisição anterior
      if (controller) try { controller.abort(); } catch {}
      controller = new AbortController();

      try {
        const items = await fetchProjects(q, controller.signal);
        menu._items = items;
        renderMenu(menu, items);
      } catch (e) {
        if (e.name !== "AbortError") console.warn(e);
      }
    }, 800);

    input.addEventListener("input", debounced);
  });
})();
