window.UploadComplex = window.UploadComplex || {};
(function (NS) {
  const { $, state, ENDPOINTS, toast, _ext, EXT_OK } = NS;

  const naturalCmp = (a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

  function guessChapterFromName(name) {
    const base = name.split("/").pop();
    const m = base.match(/(\d+(?:\.\d+)?)/);
    if (!m) return "";
    const raw = m[1];
    if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
    return raw;
  }

  function scanParent() {
    const inp = $("#parentFolderInput");
    const files = [...(inp.files || [])];
    if (!files.length) {
      toast(T('upload_complex.errors.pick_folder_first', 'Selecione uma pasta primeiro.'), "warning");
      return;
    }

    const IMG_OK = NS.EXT_OK || new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
    const ARC_OK = NS.ARCHIVE_OK || new Set([".zip", ".cbz"]);

    const map = new Map();

    for (const f of files) {
      const rel = f.webkitRelativePath || f.name;
      const parts = rel.split("/");
      if (parts.length < 2) continue;
      const ext = _ext(rel);

      const folderDepth = parts.length - 1;

      // compactados: entrada própria
      if (ARC_OK.has(ext)) {
        map.set(rel, [f]);
        continue;
      }

      // imagens somente em subpastas
      if (IMG_OK.has(ext)) {
        if (folderDepth === 1) continue;
        const dir = parts.slice(0, -1).join("/");
        if (!map.has(dir)) map.set(dir, []);
        map.get(dir).push(f);
        continue;
      }
    }

    state.folders.clear();
    for (const [key, arr] of map) {
      state.folders.set(key, {
        key,
        files: arr,
        count: arr.length,
        title: "",
        chapter: guessChapterFromName(key),
        assigned: null,
        status: "idle",
      });
    }

    state.selection.clear();
    NS.renderSubfolders();
    const msg = T('upload_complex.scan.found_entries', 'Encontradas {n} entrada(s) (subpastas e .zip/.cbz).').replace('{n}', state.folders.size);
    toast(msg, "success");
  }
  NS.scanParent = scanParent;

  function getProjectName() {
    if (typeof window.__getChosenProject === "function") {
      const p = window.__getChosenProject();
      if (p?.title) return p.title.trim();
      if (p?.name) return p.name.trim();
    }
    const lbl = $("#projectLabel");
    if (lbl?.textContent) return lbl.textContent.trim();
    return "";
  }

  function getLongStripFlag() {
    const ds = document.querySelector('#projectChosen')?.dataset.longStrip;
    if (ds != null) return ds === 'true';
    if (typeof window.__getChosenProject === 'function') {
      const p = window.__getChosenProject();
      return !!p?.longStrip;
    }
    return false;
  }

  async function sendFolderAsJob(folderKey, batch, lang, projectId, projectName) {
    const row = state.folders.get(folderKey);
    if (!row) return { ok: false, error: T('upload_complex.errors.subfolder_not_found', 'Subpasta não encontrada.') };
    const chapter = String(row.chapter || "").trim();
    if (!chapter) {
      const e = T('upload_complex.errors.chapter_missing_in', 'Capítulo ausente em "{path}".').replace('{path}', folderKey);
      return { ok: false, error: e };
    }
    const title = String(row.title || "").trim();

    const fd = new FormData();
    fd.append("project_id", projectId);
    if (projectName) fd.append("project", projectName);
    fd.append("lang", lang);
    fd.append("oneshot", "false");
    fd.append("chapter", chapter);
    if (title) fd.append("title", title);
    if (batch.volume) fd.append("volume", batch.volume);
    if (batch.scheduleAt) fd.append("schedule_at", batch.scheduleAt);

    const longStrip = getLongStripFlag();
    fd.append("long_strip", longStrip ? "true" : "false");

    for (const g of batch.groups || []) fd.append("groups[]", g.id);
    if (batch.groups?.length) fd.append("groups_full", JSON.stringify(batch.groups));

    const files = row.files.slice().sort((a, b) => naturalCmp(a.name, b.name));
    for (const f of files) fd.append("files[]", f, f.name);

    const url = (window.ENDPOINTS?.enqueueUpload) || "/upload/enqueue";
    const r = await UploadComplex.http.fetchWithTimeoutRetry(url, { method:'POST', body: fd }, { timeout: 60_000, retries: 10 });
    if (!r.ok) {
      let txt = `HTTP ${r.status}`;
      try {
        const j = await r.json();
        if (j?.error) txt = j.error;
      } catch {}
      return { ok: false, error: txt };
    }
    const data = await r.json().catch(() => ({ ok: true }));
    if (data?.ok === false) return { ok: false, error: data.error || T('common.unknown_error', 'Erro desconhecido') };
    return { ok: true, id: data?.id };
  }
  NS.sendFolderAsJob = sendFolderAsJob;

  async function sendAll() {
    const projectId = $("#projectId").value.trim();
    if (!projectId) {
      toast(T('upload_complex.errors.select_project', 'Selecione um projeto.'), "warning");
      $("#projectInput").focus();
      return;
    }
    const lang = $("#langSelect").value;
    if (!lang) {
      toast(T('upload_complex.errors.select_language', 'Selecione um idioma.'), "warning");
      $("#langSelect").focus();
      return;
    }

    const projectName = getProjectName();
    const fileInput = $("#parentFolderInput");

    const batches = state.batches
      .map((b) => ({
        ...b,
        items: b.items
          .filter((k) => state.folders.get(k)?.assigned === b.id)
          .sort(naturalCmp),
      }))
      .filter((b) => b.items.length);

    if (!batches.length) {
      toast(T('upload_complex.errors.no_assigned_subfolders', 'Nenhuma subpasta atribuída a grupos.'), "warning");
      return;
    }

    $("#btnSendAll").disabled = true;
    fileInput.disabled = true;
    try {
      for (const b of batches) {
        for (const key of b.items) {
          const r = state.folders.get(key);
          if (!r) continue;
          r.status = T('upload_complex.status.sending', 'enviando…');
          NS.renderSubfolders();

          try {
            const res = await sendFolderAsJob(key, b, lang, projectId, projectName);
            r.status = res.ok ? T('upload_complex.status.ok', 'ok')
                              : T('upload_complex.status.error_prefix', 'erro: ') + (res.error || T('common.unknown_error', 'desconhecido'));
          } catch (e) {
            r.status = T('upload_complex.status.error_prefix', 'erro: ') + (e?.message || e);
          }
          NS.renderSubfolders();
        }
      }
      toast(T('upload_complex.done_all', 'Envios finalizados (veja a fila).'), "success");
    } finally {
      $("#btnSendAll").disabled = false;
      fileInput.disabled = false;
    }
  }
  NS.sendAll = sendAll;
})(window.UploadComplex);
