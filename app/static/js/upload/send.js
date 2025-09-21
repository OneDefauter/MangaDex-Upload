(() => {
  // helpers existentes
  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---- NOVO: obter nome do projeto escolhido ----
  function getProjectName() {
    // 1) se o project.js expôs:
    if (typeof window.__getChosenProject === "function") {
      const p = window.__getChosenProject();
      if (p?.title) return p.title.trim();
      if (p?.name)  return p.name.trim();
    }
    // 2) pega direto do label
    const lbl = document.getElementById("projectLabel");
    if (lbl?.textContent) return lbl.textContent.trim();

    // 3) fallback via data-attrs do chip (se você aplicou no project.js)
    const chosen = document.getElementById("projectChosen");
    if (chosen?.dataset?.title) return chosen.dataset.title.trim();
    if (chosen?.dataset?.name)  return chosen.dataset.name.trim();

    // 4) último recurso: o que o usuário digitou
    const typed = document.getElementById("projectInput")?.value?.trim();
    return typed || "";
  }

  // ---- NOVO: obter grupos detalhados [{id,name}] ----
  function getGroupObjects() {
    // 1) se já houver um helper no seu UI:
    if (typeof window.__getGroupsDetailed === "function") {
      const arr = window.__getGroupsDetailed();
      if (Array.isArray(arr)) return arr.map(g => ({ id: String(g.id), name: String(g.name) }));
    }
    // 2) se existir chips no DOM com data-id/data-name
    const chips = $("#groupChips");
    if (chips) {
      const items = [];
      chips.querySelectorAll("[data-id]").forEach(el => {
        const id   = (el.dataset.id || "").trim();
        const name = (el.dataset.name || el.textContent || "").trim();
        if (id) items.push({ id, name });
      });
      if (items.length) return items;
    }
    // 3) fallback: derive nomes a partir dos ids (sem nomes reais)
    const ids = (typeof window.__getGroupIds === "function") ? window.__getGroupIds() : [];
    return (ids || []).map(id => ({ id: String(id), name: String(id) }));
  }

  async function doSubmit(ev){
    ev.preventDefault();

    if (!$("#projectId").value) { toast(T("upload.send.select_project"), "warning"); $("#projectInput").focus(); return; }
    const lang = $("#langSelect").value;
    if (!lang) { $("#langSelect").classList.add("is-invalid"); return; }
    $("#langSelect").classList.remove("is-invalid");
    if (!window.__validateNumbers || !window.__validateNumbers()) return;

    const when = window.__getScheduleValue ? window.__getScheduleValue() : null;
    if ($("#scheduleAt").value && !when) return; // inválido

    const fd = new FormData();

    // projeto: id + nome (NOVO: project)
    fd.append("project_id", $("#projectId").value);
    const projectName = getProjectName();
    if (projectName) fd.append("project", projectName);

    // grupos: ids (já existia) + objetos detalhados (NOVO: groups_full)
    const groupIds = (window.__getGroupIds?.() || []);
    groupIds.forEach(id => fd.append("groups[]", id));
    const groupsFull = getGroupObjects();
    if (groupsFull.length) fd.append("groups_full", JSON.stringify(groupsFull));

    // demais campos
    fd.append("lang", lang);

    const oneshot = $("#oneshotCheck").checked;
    fd.append("oneshot", oneshot ? "true" : "false");
    if (!oneshot) {
      fd.append("chapter", $("#chapterInput").value.trim());
      if ($("#volumeInput").value.trim()) fd.append("volume", $("#volumeInput").value.trim());
    }
    if ($("#titleInput").value.trim()) fd.append("title", $("#titleInput").value.trim());
    if (when) fd.append("schedule_at", when);

    // origem (files/path/folder)
    if (!window.__appendSourceToFormData?.(fd)) return;

    try {
      $("#btnSubmit").disabled = true;
      const r = await fetch(ENDPOINTS.enqueueUpload, { method:"POST", body: fd });
      if (!r.ok) throw new Error(`Falha ao enviar (HTTP ${r.status})`);
      const data = await r.json().catch(()=>({ok:true}));
      if (data?.ok === false) throw new Error(data.error || "Erro desconhecido");
      toast(T("upload.send.added_to_queue"), "success");
      // location.href = "/queue";
    } catch (e) {
      toast(T("upload.send.error_prefix") + " " + e.message, "error");
    } finally {
      $("#btnSubmit").disabled = false;
    }
  }

  function doClear(){
    $("#uploadForm").reset();
    $("#projectId").value = "";
    $("#projectChosen").classList.add("d-none");
    const chips = $("#groupChips"); if (chips) chips.innerHTML="";
    if (window.plusDaysLocalISO && window.nowLocalISO) {
      $("#scheduleAt").min = nowLocalISO();
      $("#scheduleAt").max = plusDaysLocalISO(14);
    }
    const apply = () => {
      $("#filesInput").classList.add("d-none");
      $("#folderInput").classList.add("d-none");
      $("#pathInput").classList.add("d-none");
    };
    apply();
    $$('input[name="srcMode"]').find(r=>r.id==="srcFiles").checked = true;
    const evt = new Event("change");
    $$('input[name="srcMode"]').forEach(r => r.dispatchEvent(evt));
    $("#oneshotCheck").checked = false;
    $("#oneshotCheck").dispatchEvent(new Event("change"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#uploadForm").addEventListener("submit", doSubmit);
    $("#btnClear").addEventListener("click", doClear);
  });
})();
