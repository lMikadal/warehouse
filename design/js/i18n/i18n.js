(function (global) {
  const LOCALE_KEY = "warehouse-design-locale";
  const dicts = { th: global.I18N_TH || {}, en: global.I18N_EN || {} };
  let locale = "th";

  function resolveLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "th" || saved === "en") return saved;
    return "th";
  }

  function applyDom() {
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { locale } }));
  }

  function t(key) {
    const table = dicts[locale] || dicts.th;
    return table[key] ?? dicts.th[key] ?? key;
  }

  function setLocale(next) {
    if (next !== "th" && next !== "en") return;
    locale = next;
    localStorage.setItem(LOCALE_KEY, locale);
    applyDom();
  }

  function getLocale() {
    return locale;
  }

  function init() {
    locale = resolveLocale();
    applyDom();
  }

  global.i18n = { init, t, setLocale, getLocale };
})(window);
