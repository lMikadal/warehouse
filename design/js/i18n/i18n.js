(function (global) {
  const LOCALE_KEY = "warehouse-design-locale";
  const dicts = { th: global.I18N_TH || {}, en: global.I18N_EN || {} };
  let locale = "th";

  function resolveLocale() {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "th" || saved === "en") return saved;
    return "th";
  }

  function t(key) {
    const table = dicts[locale] || dicts.th;
    return table[key] ?? dicts.th[key] ?? key;
  }

  function format(key, vars) {
    var msg = t(key);
    if (!vars) return msg;
    return Object.keys(vars).reduce(function (s, k) {
      return s.replace(new RegExp("\\{" + k + "\\}", "g"), String(vars[k]));
    }, msg);
  }

  function fieldPlaceholder(kind, labelKey) {
    var templateKey = kind === "select" ? "form.placeholder.select" : "form.placeholder.input";
    return format(templateKey, { label: t(labelKey) });
  }

  var TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  var EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatDateParts(d, loc, withTime) {
    if (!d || isNaN(d.getTime())) return "—";
    var day = pad2(d.getDate());
    var month = loc === "th" ? TH_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
    var year = loc === "th" ? d.getFullYear() + 543 : d.getFullYear();
    var out = day + " " + month + " " + year;
    if (!withTime) return out;
    return out + " " + pad2(d.getHours()) + "." + pad2(d.getMinutes());
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    return formatDateParts(new Date(iso), locale, true);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return formatDateParts(new Date(iso), locale, false);
  }

  function applyDom(notifyChange) {
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key));
    });
    document.querySelectorAll("[data-i18n-placeholder-input]").forEach((el) => {
      const labelKey = el.getAttribute("data-i18n-placeholder-input");
      if (labelKey) el.setAttribute("placeholder", fieldPlaceholder("input", labelKey));
    });
    document.querySelectorAll("[data-i18n-placeholder-select]").forEach((el) => {
      const labelKey = el.getAttribute("data-i18n-placeholder-select");
      if (!labelKey) return;
      var ph = fieldPlaceholder("select", labelKey);
      var opt = el.querySelector('option[value=""]');
      if (opt) opt.textContent = ph;
    });
    if (notifyChange) {
      document.dispatchEvent(new CustomEvent("i18n:change", { detail: { locale } }));
    }
  }

  function setLocale(next) {
    if (next !== "th" && next !== "en") return;
    locale = next;
    localStorage.setItem(LOCALE_KEY, locale);
    applyDom(true);
  }

  function getLocale() {
    return locale;
  }

  function init() {
    locale = resolveLocale();
    applyDom(false);
  }

  global.i18n = { init, t, format, fieldPlaceholder, setLocale, getLocale, formatDateTime, formatDate };

  // ponytail: self-check — throws if date format drifts
  (function selfCheckDateFormat() {
    var d = new Date(2026, 8, 9, 12, 30);
    var th = formatDateParts(d, "th", true);
    var en = formatDateParts(d, "en", true);
    if (th !== "09 ก.ย. 2569 12.30" || en !== "09 Sep 2026 12.30") {
      throw new Error("i18n date format self-check failed: th=" + th + " en=" + en);
    }
  })();
})(window);
