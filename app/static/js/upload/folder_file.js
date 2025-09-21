(() => {
  function applySrc(){
    const mode = $("#srcFiles").checked ? "files" : ($("#srcFolder").checked ? "folder" : "path");
    $("#filesInput").classList.toggle("d-none", mode!=="files");
    $("#folderInput").classList.toggle("d-none", mode!=="folder");
    $("#pathInput").classList.toggle("d-none", mode!=="path");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $$('input[name="srcMode"]').forEach(r => r.addEventListener("change", applySrc));
    applySrc();
  });

  window.__appendSourceToFormData = (fd) => {
    const mode = $("#srcFiles").checked ? "files" : ($("#srcFolder").checked ? "folder" : "path");
    if (mode === "files") {
      const fs = $("#filesInput").files;
      if (!fs.length) { $("#filesInput").classList.add("is-invalid"); return false; }
      [...fs].forEach(f => fd.append("files[]", f, f.name));
      $("#filesInput").classList.remove("is-invalid");
      return true;
    }
    if (mode === "folder") {
      const fs = $("#folderInput").files;
      if (!fs.length) { $("#folderInput").classList.add("is-invalid"); return false; }
      [...fs].forEach(f => fd.append("files[]", f, f.webkitRelativePath || f.name));
      fd.append("source","folder");
      $("#folderInput").classList.remove("is-invalid");
      return true;
    }
    // path
    const p = $("#pathInput").value.trim();
    if (!p) { $("#pathInput").classList.add("is-invalid"); return false; }
    fd.append("path", p);
    fd.append("source","path");
    $("#pathInput").classList.remove("is-invalid");
    return true;
  };
})();