(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const sel = $("#langSelect");
    sel.addEventListener("change", () => {
      if (sel.value) sel.classList.remove("is-invalid");
    });
  });
})();