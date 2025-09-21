(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const el = $("#scheduleAt");
    el.min = nowLocalISO();
    el.max = plusDaysLocalISO(14);
  });

  window.__getScheduleValue = () => {
    const v = $("#scheduleAt").value;
    if (!v) return null;
    const t = new Date(v), max = new Date(plusDaysLocalISO(14));
    if (t > max) { toast(T("upload.date.max_two_weeks"), "warning"); return null; }
    return v;
  };
})();