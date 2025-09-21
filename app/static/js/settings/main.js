(() => {
  // i18n helper
  function T(key, fallback){
    const path = String(key||'').split('.');
    let obj = (window.I18N_WEB || {});
    for (const p of path){ if (obj && typeof obj === 'object' && p in obj) obj = obj[p]; else return fallback; }
    return (typeof obj === 'string') ? obj : fallback;
  }

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const jsonEq = (a, b) => stableStringify(a) === stableStringify(b);

  const SETTINGS_ORIG = window.SETTINGS || {};
  const DEFAULTS = window.DEFAULT_SETTINGS || {};
  let working = deepClone(SETTINGS_ORIG);

  const MAPS = {
    status: [
      { id: "status1", value: "ongoing"   },
      { id: "status2", value: "completed" },
      { id: "status3", value: "paused"    },
      { id: "status4", value: "cancelled" },
    ],
    languages: [
      { id: "language1", value: "en"    },
      { id: "language2", value: "pt-br" },
    ],
    demography: [
      { id: "demography1", value: "shounen" },
      { id: "demography2", value: "shoujo"  },
      { id: "demography3", value: "josei"   },
      { id: "demography4", value: "seinen"  },
    ],
    content_rating: [
      { id: "content1", value: "safe"        },
      { id: "content2", value: "suggestive"  },
      { id: "content3", value: "erotica"     },
      { id: "content4", value: "pornographic"},
    ],
    scheme: [
      { key: "lang", label: T('settings.download.scheme.parts.lang','Idioma') },
      { key: "title", label: T('settings.download.scheme.parts.title','Título') },
      { key: "volume", label: T('settings.download.scheme.parts.volume','Volume') },
      { key: "group",  label: T('settings.download.scheme.parts.group','Grupo') },
      { key: "chapter", label: T('settings.download.scheme.parts.chapter','Capítulo') },
    ]
  };

  function loadSettings(cfg) {
    setRangePair("dlRange", "dlInput", cfg["dl.simultaneous"] ?? 5);
    $("#dmPath").value = cfg["dm.path"] ?? "";
    renderPathMode(cfg["dm.path_mode"] ?? DEFAULTS["dm.path_mode"]);

    setRangePair("upRange", "upInput", cfg["up.simultaneous"] ?? 5);
    setRangePair("upRangeRetry", "upInputRetry", cfg["up.max_retries"] ?? 5);
    $("#upError").checked = !!cfg["up.accept_errors"];
    $("#upPrefeth").checked = !!cfg["up.prefetch"];

    $("#cvQuality").value = String(cfg["cv.quality"] ?? 1);

    setRangePair("searchRange", "searchInput", cfg["search.max_results"] ?? 50);
    setRangePair("searchPaginationRange", "searchPaginationInput", cfg["search.pagination"] ?? 8);
    setChecks(MAPS.status, cfg["search.filters.status"] ?? []);
    setChecks(MAPS.languages, cfg["search.filters.languages"] ?? []);
    setChecks(MAPS.demography, cfg["search.filters.demography"] ?? []);
    setChecks(MAPS.content_rating, cfg["search.filters.content_rating"] ?? []);
    renderSortList(cfg["search.sort"] ?? DEFAULTS["search.sort"]);

    $("#apiURL").value  = cfg["api.url"]  ?? DEFAULTS["api.url"];
    $("#apiAuth").value = cfg["api.auth"] ?? DEFAULTS["api.auth"];
    $("#apiToken").value = cfg["api.langdetect_token"] ?? "";

    $("#toolsCut").checked = !!cfg["tools.cut.pillow"];
    $("#extOut").value = (cfg["ext.out"] ?? "jpg");
    setRangePair("qualityImageRange", "qualityImageInput", cfg["quality.image"] ?? 80);
    setRangePair("smImageRange", "smImageInput", cfg["sm.image"] ?? 1);

    updateNavPreview(cfg["nav.config.list"] ?? []);
  }

  function setRangePair(idRange, idInput, val) {
    const r = $("#"+idRange), i = $("#"+idInput);
    if (r) r.value = val;
    if (i) i.value = val;
  }

  function setChecks(map, values) {
    const set = new Set(values || []);
    map.forEach(({id, value}) => { const el = $("#"+id); if (el) el.checked = set.has(value); });
  }

  function renderPathMode(items) {
    const byKey = new Map(items.map(it => [it.key, it]));
    $$("#parts > li").forEach(li => {
      const key = li.getAttribute("data-key");
      const meta = byKey.get(key) || {enabled:false};
      if (!li.classList.contains("fixed")) {
        li.style.cursor = "pointer";
        li.onclick = () => {
          const list = collectPathMode();
          working["dm.path_mode"] = list;
          updatePathPreview(list);
        };
      }
    });
    updatePathPreview(items);
  }

  function collectPathMode() {
    return $$("#parts > li").map(li => {
      const key = li.getAttribute("data-key");
      const fixed = li.classList.contains("fixed");
      const enabled = !li.classList.contains("off") || fixed;
      return { key, enabled, ...(fixed ? {fixed:true} : {}) };
    });
  }

  function updatePathPreview(items) {
    const labelByKey = Object.fromEntries(MAPS.scheme.map(it => [it.key, it.label]));
    $("#preview").textContent = items
      .filter(x => x.enabled || x.fixed)
      .map(x => ` ${labelByKey[x.key] || x.key} `)
      .join("/");
  }

  function renderSortList(list) {
    const ul = $("#sortList");
    if (!ul) return;

    const indexByKey = Object.fromEntries(list.map((it, idx) => [it.key, idx]));
    const lis = $$("#sortList > li");
    lis.sort((a,b) => {
      const ka = $(".js-sort-enable", a)?.dataset.key;
      const kb = $(".js-sort-enable", b)?.dataset.key;
      return (indexByKey[ka] ?? 999) - (indexByKey[kb] ?? 999);
    }).forEach(li => ul.appendChild(li));

    list.forEach(it => {
      const en = $(`.js-sort-enable[data-key="${it.key}"]`);
      const dir = keyToDirCheckbox(it.key);
      if (en) en.checked = !!it.enabled;
      if (dir) dir.checked = String(it.dir||"asc")==="asc";
    });

    updateSortPreview(list);
    if (window.Sortable && !ul._sortableInit) {
      new Sortable(ul, { handle: ".handle", animation: 150, onSort: () => updateSortWorkingFromDOM() });
      ul._sortableInit = true;
    }
    $$(".js-sort-enable").forEach(cb => cb.addEventListener("change", updateSortWorkingFromDOM));
    $$(".js-sort-dir").forEach(cb => cb.addEventListener("change", updateSortWorkingFromDOM));
  }

  function keyToDirCheckbox(key) {
    const map = {
      title: "sortTitleDir",
      year: "sortYearDir",
      createdAt: "sortCreatedAtDir",
      updatedAt: "sortUpdatedAtDir",
      lastChapter: "sortLastChapterDir",
      followers: "sortFollowersDir",
      relevance: "sortRelevanceDir",
    };
    const id = map[key];
    return id ? $("#"+id) : null;
  }

  function updateSortWorkingFromDOM() {
    const items = $$("#sortList > li").map(li => {
      const en = $(".js-sort-enable", li);
      const key = en?.dataset.key;
      const dirCb = $(".js-sort-dir", li);
      return { key, enabled: !!en?.checked, dir: dirCb?.checked ? "asc" : "desc" };
    });
    working["search.sort"] = items;
    updateSortPreview(items);
  }

  function updateSortPreview(items) {
    const ASC = T('settings.search.sort.asc','Crescente');
    const DESC = T('settings.search.sort.desc','Decrescente');
    const prefix = T('settings.search.sort.preview','Ordenação: —');
    const txt = items.filter(it => it.enabled)
      .map(it => `${it.key}(${it.dir === 'asc' ? ASC : DESC})`).join(" → ");
    $("#sortPreview").innerHTML = `<span>${prefix.replace('—', '')} ${txt || "—"}</span>`;
  }

  function updateNavPreview(list) {
    const small = $("#navConfigPreview");
    if (small) small.textContent = list && list.length ? JSON.stringify(list) : "—";
  }

  function collectSettings() {
    const out = {};
    out["dl.simultaneous"] = +$("#dlRange").value;
    out["dm.path"] = $("#dmPath").value || "";
    out["dm.path_mode"] = collectPathMode();

    out["up.simultaneous"] = +$("#upRange").value;
    out["up.max_retries"] = +$("#upRangeRetry").value;
    out["up.accept_errors"] = !!$("#upError").checked;
    out["up.prefetch"] = !!$("#upPrefeth").checked;

    out["cv.quality"] = +$("#cvQuality").value;

    out["search.max_results"] = +$("#searchRange").value;
    out["search.pagination"] = +$("#searchPaginationRange").value;
    out["search.filters.status"] = getChecks(MAPS.status);
    out["search.filters.languages"] = getChecks(MAPS.languages);
    out["search.filters.demography"] = getChecks(MAPS.demography);
    out["search.filters.content_rating"] = getChecks(MAPS.content_rating);
    out["search.sort"] = working["search.sort"] || DEFAULTS["search.sort"];

    out["api.url"]  = $("#apiURL").value.trim();
    out["api.auth"] = $("#apiAuth").value.trim();
    out["api.langdetect_token"] = $("#apiToken").value.trim();

    out["tools.cut.pillow"] = !!$("#toolsCut").checked;
    out["ext.out"] = $("#extOut").value;
    out["quality.image"] = +$("#qualityImageRange").value;
    out["sm.image"] = +$("#smImageRange").value;

    out["nav.config.list"] = DEFAULTS["nav.config.list"] || [];
    return out;
  }

  function getChecks(map) {
    const vals = [];
    map.forEach(({id, value}) => { const el = $("#"+id); if (el?.checked) vals.push(value); });
    return vals;
  }

  function diffSettings(oldCfg, newCfg) {
    const changes = [];
    const keys = new Set([...Object.keys(oldCfg||{}), ...Object.keys(newCfg||{})]);
    for (const k of keys) {
      const a = oldCfg?.[k]; const b = newCfg?.[k];
      if (!jsonEq(a, b)) changes.push({ key: k, from: a, to: b });
    }
    return changes.sort((x,y)=> x.key.localeCompare(y.key));
  }

  function openDiffModal(changes, onConfirm) {
    const ul = $("#diffList");
    const none = $("#noChanges");
    ul.innerHTML = "";
    if (!changes.length) {
      none.style.display = "";
    } else {
      none.style.display = "none";
      changes.forEach(ch => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex flex-column";
        const from = typeof ch.from === "object" ? JSON.stringify(ch.from) : String(ch.from);
        const to   = typeof ch.to   === "object" ? JSON.stringify(ch.to)   : String(ch.to);
        li.innerHTML = `<div><strong>${ch.key}</strong></div>
                        <div class="text-muted">de: <code>${escapeHtml(from)}</code></div>
                        <div class="text-muted">para: <code>${escapeHtml(to)}</code></div>`;
        ul.appendChild(li);
      });
    }
    const modalEl = $("#confirmModal");
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const btn = $("#confirmApply");
    const handler = () => { btn.removeEventListener("click", handler); bsModal.hide(); onConfirm(); };
    btn.addEventListener("click", handler);
    bsModal.show();
  }

  function escapeHtml(s) {
    return (s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  function stableStringify(obj) {
    return JSON.stringify(obj, (k, v) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.keys(v).sort().reduce((acc, key) => { acc[key] = v[key]; return acc; }, {});
      }
      return v;
    });
  }

  async function saveChanges(changes) {
    const payload = Object.fromEntries(changes.map(c => [c.key, c.to]));
    const res = await fetch("/settings", {
      method: "POST",
      headers: {"Content-Type":"application/json","Accept":"application/json"},
      body: JSON.stringify({ changes: payload })
    });
    if (!res.ok) throw new Error(`Falha ao salvar (${res.status})`);
    const data = await res.json().catch(()=>({ok:true}));
    if (data?.restarted) { showToast(T('settings.common.pool_restarted','O pool de workers foi reiniciado.'), "info", {delay: 5000}); }
    return data;
  }

  function applyToUI(cfg) {
    loadSettings(cfg);
    window.refreshSwitchLabels?.();
    working = deepClone(cfg);
  }

  function restoreDefaultsFlow() {
    const now = collectSettings();
    const changes = diffSettings(now, DEFAULTS);
    openDiffModal(changes, async () => {
      try {
        applyToUI(DEFAULTS);
        await saveChanges(diffSettings(SETTINGS_ORIG, DEFAULTS));
        toast(T('common.restored','Configurações restauradas.'), "success");
      } catch (e) {
        toast(T('common.restore_error','Erro ao restaurar: ') + e.message, "danger");
      }
    });
  }

  function toast(msg, type = "info", opts = {}) {
    const map = { danger: "error", warn: "warning" };
    const mapped = map[type] || type;
    if (typeof window.showToast === "function") {
      window.showToast(String(msg), mapped, opts);
    } else {
      if (mapped === "error")       alert("Erro: " + msg);
      else if (mapped === "warning") alert("Aviso: " + msg);
      else                           alert(msg);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const base = Object.keys(SETTINGS_ORIG||{}).length ? SETTINGS_ORIG : DEFAULTS;
    applyToUI(base);

    $("#btnSaveSettings")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      const newCfg = collectSettings();
      const changes = diffSettings(SETTINGS_ORIG, newCfg);
      openDiffModal(changes, async () => {
        try {
          await saveChanges(changes);
          Object.assign(SETTINGS_ORIG, deepClone(newCfg));
          working = deepClone(newCfg);
          toast(T('common.saved','Configurações salvas.'), "success");
        } catch (e) {
          toast(T('common.save_error','Erro ao salvar: ') + e.message, "danger");
        }
      });
    });

    $("#btnRestoreDefaults")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      restoreDefaultsFlow();
    });

    $("#navReset")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      const cfg = collectSettings();
      cfg["nav.config.list"] = deepClone(DEFAULTS["nav.config.list"] || []);
      applyToUI(cfg);
      toast(T('settings.navbar.restored','Navegação restaurada ao padrão.'), "success");
    });
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const isInput = tag === "input" || tag === "textarea" || e.target.isContentEditable;
    if (isInput) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      const newCfg = collectSettings();
      const changes = diffSettings(SETTINGS_ORIG, newCfg);
      openDiffModal(changes, async () => {
        try {
          await saveChanges(changes);
          Object.assign(SETTINGS_ORIG, deepClone(newCfg));
          working = deepClone(newCfg);
          toast(T('common.saved_short','Configurações salvas (Ctrl+S).'), "success");
        } catch (err) {
          toast(T('common.save_error','Erro ao salvar: ') + err.message, "danger");
        }
      });
    }
  });
})();
