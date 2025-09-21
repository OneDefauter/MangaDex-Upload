(function() {
    const getStoredTheme = () => localStorage.getItem("theme");
    const setStoredTheme = (theme) => localStorage.setItem("theme", theme);
    const forcedTheme = document.documentElement.getAttribute("data-bss-forced-theme");
    const getPreferredTheme = () => {
        if (forcedTheme) return forcedTheme;
        const t = getStoredTheme() || document.documentElement.getAttribute("data-bs-theme");
        return t || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    };
    const setTheme = (t) => {
        if (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
            document.documentElement.setAttribute("data-bs-theme", "dark");
        else document.documentElement.setAttribute("data-bs-theme", t);
    };
    setTheme(getPreferredTheme());
    const showActiveTheme = (theme) => {
        const sw = [].slice.call(document.querySelectorAll(".theme-switcher"));
        if (!sw.length) return;
        document.querySelectorAll("[data-bs-theme-value]").forEach((el) => {
            el.classList.remove("active");
            el.setAttribute("aria-pressed", "false");
        });
        for (const s of sw) {
            const btn = s.querySelector('[data-bs-theme-value="' + theme + '"]');
            if (btn) {
                btn.classList.add("active");
                btn.setAttribute("aria-pressed", "true");
            }
        }
    };
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        const stored = getStoredTheme();
        if (stored !== "light" && stored !== "dark") setTheme(getPreferredTheme());
    });
    window.addEventListener("DOMContentLoaded", () => {
        showActiveTheme(getPreferredTheme());
        document.querySelectorAll("[data-bs-theme-value]").forEach((t) => {
            t.addEventListener("click", (e) => {
                e.preventDefault();
                const v = t.getAttribute("data-bs-theme-value");
                setStoredTheme(v);
                setTheme(v);
                showActiveTheme(v);
            });
        });
    });
})();