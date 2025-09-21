(() => {
  function invalidLeadingZero(v){ const s=String(v||"").trim(); return s ? /^0/.test(s) : false; }

  function checkNumbers(){
    const oneshot = $("#oneshotCheck").checked;
    const ch = $("#chapterInput"), vol = $("#volumeInput");
    let ok = true;
    if (!oneshot) {
      if (!ch.value.trim()) { ok=false; ch.classList.add("is-invalid"); }
      else if (invalidLeadingZero(ch.value)) { ok=false; ch.classList.add("is-invalid"); toast(T("upload.ch_vl_os.leading_zero_chapter"), "warning"); }
      else ch.classList.remove("is-invalid");

      if (vol.value && invalidLeadingZero(vol.value)) { ok=false; vol.classList.add("is-invalid"); toast(T("upload.ch_vl_os.leading_zero_volume"), "warning"); }
      else vol.classList.remove("is-invalid");
    } else {
      ch.classList.remove("is-invalid"); vol.classList.remove("is-invalid");
    }
    return ok;
  }

  function toggleOneshot(){
    const on = $("#oneshotCheck").checked;
    const ch = $("#chapterInput"), vol = $("#volumeInput");
    ch.disabled = on; vol.disabled = on;
    if (on) { ch.value=""; vol.value=""; ch.classList.remove("is-invalid"); vol.classList.remove("is-invalid"); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#oneshotCheck").addEventListener("change", toggleOneshot);
    toggleOneshot();
  });

  // exporta para o submit
  window.__validateNumbers = checkNumbers;
})();