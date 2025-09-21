// updates.js (i18n-ready)
(() => {
  // URLs
  const CHECK_URL       = "/api/check-update"; // bool JSON
  const MD_URL_PRIMARY  = "/updates.md";       // opcional, se você servir local
  const MD_URL_FALLBACK = "https://raw.githubusercontent.com/OneDefauter/MangaDex-Upload/refs/heads/main/src/doc/changelog.md";

  // I18N ----------------------------------------------------------------------
  const I18N = (window.I18N_SCRIPT && window.I18N_SCRIPT.updates) || {};
  const FALLBACK = {
    meta_failed: "Falha ao carregar o changelog.",
    meta_last_update: "Última atualização: {datetime}",
    meta_source: "fonte: {source}",
    meta_app_version: "app v{version}",
    checking: "Verificando…",
    check_label: "Verificar atualizações",
    apply_label: "Atualizar",
    applying: "Atualizando…",
    toast_available: "Nova atualização disponível!",
    toast_latest: "Você já está na última versão.",
    toast_check_error: "Não foi possível verificar atualizações.",
    toast_apply_success: "Atualização aplicada com sucesso.",
    toast_restart_hint: "O aplicativo será reiniciado em breve.",
    toast_apply_error: "Falha ao aplicar atualização."
  };
  const t = (key, vars = {}) => {
    const tpl = I18N[key] ?? FALLBACK[key] ?? key;
    return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  };

  // DOM -----------------------------------------------------------------------
  const mount    = document.getElementById("md");
  const loader   = document.getElementById("loader");
  const metaEl   = document.getElementById("updatesMeta");
  const errorEl  = document.getElementById("errorBox");
  const btnCheck = document.getElementById("btnCheck");
  const btnApply = document.getElementById("btnApply");

  // versão do app (injetada pelo template)
  const appVer = (window.__APP_VERSION__ || "").trim();

  // estado
  let updateAvailable = false;

  // utils ---------------------------------------------------------------------
  async function fetchText(url, opts = {}) {
    const r = await fetch(url, { cache: "no-store", ...opts });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.text();
  }

  function setMeta(ok, when = Date.now(), from = "", extra = "") {
    if (!ok) { metaEl.textContent = t("meta_failed"); return; }
    const dt = new Date(when);
    const parts = [
      t("meta_last_update", { datetime: dt.toLocaleString() }),
      from && t("meta_source", { source: from }),
      appVer && t("meta_app_version", { version: appVer }),
      extra
    ].filter(Boolean);
    metaEl.textContent = parts.join(" • ");
  }

  function setLoader(v)   { loader?.classList.toggle("d-none", !v); }
  function setError(v)    { errorEl?.classList.toggle("d-none", !v); }
  function setButtons({ checking = false, canApply = false } = {}) {
    if (btnCheck) {
      btnCheck.disabled = checking;
      btnCheck.innerHTML = checking
        ? `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${t("checking")}`
        : t("check_label");
    }
    if (btnApply) {
      btnApply.disabled = !canApply;
      if (!canApply) btnApply.textContent = t("apply_label");
    }
  }

  function showToast(msg, type = "info") {
    if (typeof window.showToast === "function") return window.showToast(msg, type);
    if (type === "error" || type === "danger") alert("Erro: " + msg);
    else alert(msg);
  }

  function applyHTMLFromMarkdown(md, sourceLabel = "local") {
    // marked + DOMPurify + hljs devem estar disponíveis globalmente
    marked.setOptions({ mangle: false, headerIds: true });
    const html = DOMPurify.sanitize(marked.parse(md));
    mount.innerHTML = html;

    mount.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));

    // smooth scroll para âncoras internas
    mount.addEventListener("click", (ev) => {
      const a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      const id = decodeURIComponent(a.getAttribute("href").slice(1));
      const h  = document.getElementById(id);
      if (h) { ev.preventDefault(); history.replaceState(null,"", "#"+id); h.scrollIntoView({behavior:"smooth"}); }
    });

    setMeta(true, Date.now(), sourceLabel);
  }

  // fluxo ---------------------------------------------------------------------
  async function initialLoad() {
    setLoader(true);
    setError(false);
    try {
      // tenta markdown local primeiro; se falhar, usa GitHub
      let md, used = "local";
      try {
        md = await fetchText(MD_URL_PRIMARY);
      } catch {
        md = await fetchText(MD_URL_FALLBACK);
        used = "GitHub RAW";
      }
      applyHTMLFromMarkdown(md, used);

      // checagem silenciosa de updates (apenas habilita botão se tiver)
      void checkForUpdates({ silent: true });
    } catch (err) {
      console.error("updates initial load error:", err);
      setError(true);
      setMeta(false);
    } finally {
      setLoader(false);
    }
  }

  async function checkForUpdates({ silent = false } = {}) {
    try {
      setButtons({ checking: !silent, canApply: false });

      const r = await fetch(CHECK_URL, { cache: "no-store" });
      const data = await r.json(); // true/false do backend
      updateAvailable = !!data;

      setButtons({ checking: false, canApply: updateAvailable });

      if (!silent) {
        if (updateAvailable) {
          showToast(t("toast_available"), "success");
          setMeta(true, Date.now(), "", t("toast_available"));
        } else {
          showToast(t("toast_latest"), "info");
          setMeta(true, Date.now(), "", t("toast_latest"));
        }
      }
    } catch (err) {
      console.error("checkForUpdates error:", err);
      setButtons({ checking: false, canApply: false });
      if (!silent) showToast(t("toast_check_error"), "danger");
    }
  }

  async function applyUpdate() {
    if (!updateAvailable) return;
    try {
      // feedback no botão
      if (btnApply) {
        btnApply.disabled = true;
        btnApply.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${t("applying")}`;
      }

      const r = await fetch("/api/apply-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: true })
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.ok) {
        throw new Error(j.error || `HTTP ${r.status}`);
      }

      showToast(t("toast_apply_success"), "success");
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          showToast(t("toast_restart_hint"), "warning");
        }, i * 800);
      }

      // Recarrega o changelog (mais recente no GitHub)
      const md = await fetchText(MD_URL_FALLBACK);
      applyHTMLFromMarkdown(md, "GitHub RAW");

      updateAvailable = false;
      setButtons({ checking: false, canApply: false });

      setTimeout(() => location.reload(), 10000);

    } catch (err) {
      console.error("applyUpdate error:", err);
      showToast(t("toast_apply_error"), "danger");
      setButtons({ checking: false, canApply: updateAvailable });
    } finally {
      if (btnApply) btnApply.textContent = t("apply_label");
    }
  }

  // wires
  btnCheck?.addEventListener("click", (e) => {
    e.preventDefault();
    checkForUpdates({ silent: false });
  });

  btnApply?.addEventListener("click", (e) => {
    e.preventDefault();
    applyUpdate();
  });

  // init
  document.addEventListener("DOMContentLoaded", () => {
    initialLoad();
  });
})();
