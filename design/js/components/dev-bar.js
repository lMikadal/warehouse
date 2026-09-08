/**
 * DevBar — design-only test controller strip.
 * Fixed bottom bar with toast triggers + page-specific actions.
 * NEVER ship this file to frontend/; it is prototype/demo tooling only.
 */
(function (global) {
  var STORAGE_KEY = "warehouse-devbar-open";

  function injectStyles() {
    if (document.getElementById("devbar-style")) return;
    var s = document.createElement("style");
    s.id = "devbar-style";
    s.textContent = [
      "#devbar{position:fixed;bottom:0;left:0;right:0;z-index:9999;font-family:system-ui,sans-serif;font-size:0.75rem;line-height:1.4;border-top:2px solid #f59e0b;}",
      "#devbar-inner{background:#1e293b;color:#e2e8f0;padding:0.375rem 0.75rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;}",
      "#devbar-inner[hidden]{display:none;}",
      "#devbar-tab{background:#f59e0b;color:#1e293b;font-weight:700;font-size:0.7rem;padding:0.2rem 0.5rem;border:none;cursor:pointer;border-radius:0.25rem 0.25rem 0 0;position:absolute;top:-1.5rem;right:0.75rem;letter-spacing:0.05em;}",
      ".devbar-sep{width:1px;height:1.25rem;background:#475569;flex-shrink:0;}",
      ".devbar-label{color:#94a3b8;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.07em;white-space:nowrap;}",
      ".devbar-btn{padding:0.2rem 0.5rem;border:1px solid #475569;border-radius:0.25rem;cursor:pointer;font-size:0.7rem;white-space:nowrap;background:#334155;color:#e2e8f0;}",
      ".devbar-btn:hover{background:#475569;}",
      ".devbar-btn--success{border-color:#22c55e;color:#86efac;}",
      ".devbar-btn--success:hover{background:#14532d;}",
      ".devbar-btn--error{border-color:#ef4444;color:#fca5a5;}",
      ".devbar-btn--error:hover{background:#7f1d1d;}",
      ".devbar-btn--warning{border-color:#f59e0b;color:#fcd34d;}",
      ".devbar-btn--warning:hover{background:#78350f;}",
      ".devbar-btn--info{border-color:#38bdf8;color:#7dd3fc;}",
      ".devbar-btn--info:hover{background:#0c4a6e;}",
    ].join("");
    document.head.appendChild(s);
  }

  function isOpen() {
    var v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  }

  function setOpen(open) {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }

  function makeBtn(label, cls, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "devbar-btn" + (cls ? " " + cls : "");
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function makeLabel(text) {
    var span = document.createElement("span");
    span.className = "devbar-label";
    span.textContent = text;
    return span;
  }

  function makeSep() {
    var d = document.createElement("div");
    d.className = "devbar-sep";
    return d;
  }

  var TYPE_META = {
    success: { prefix: "✓", cls: "devbar-btn--success" },
    error: { prefix: "✕", cls: "devbar-btn--error" },
    warning: { prefix: "⚠", cls: "devbar-btn--warning" },
    info: { prefix: "ℹ", cls: "devbar-btn--info" },
  };

  function resolveToastMsg(entry) {
    if (entry.msgKey && global.i18n) return global.i18n.t(entry.msgKey);
    if (entry.msg) return entry.msg;
    return entry.type || "info";
  }

  function toastLabel(entry) {
    if (entry.label) return entry.label;
    var meta = TYPE_META[entry.type] || TYPE_META.info;
    return meta.prefix + " " + (entry.type || "info");
  }

  /**
   * Mount the dev bar.
   * @param {Object} [opts]
   * @param {Array}  [opts.toasts]   Page-specific toast triggers.
   *   Each item: { type, label?, msgKey?, msg? }
   * @param {Array}  [opts.actions]  Page-specific buttons.
   *   Each item: { label: string, fn: function }
   *   or a group:  { group: string, items: [{ label, fn }] }
   */
  function mount(opts) {
    opts = opts || {};
    injectStyles();

    var bar = document.createElement("div");
    bar.id = "devbar";

    // Toggle tab (always visible above the strip)
    var tab = document.createElement("button");
    tab.id = "devbar-tab";
    tab.type = "button";
    tab.textContent = "DEV";
    bar.appendChild(tab);

    // Main inner strip
    var inner = document.createElement("div");
    inner.id = "devbar-inner";
    if (!isOpen()) inner.hidden = true;

    tab.addEventListener("click", function () {
      var nowOpen = inner.hidden;
      inner.hidden = !nowOpen;
      setOpen(nowOpen);
    });

    // — Toast section (page-declared only) —
    var toasts = opts.toasts || [];
    if (toasts.length) {
      inner.appendChild(makeLabel("Toast"));
      toasts.forEach(function (entry) {
        var meta = TYPE_META[entry.type] || TYPE_META.info;
        inner.appendChild(makeBtn(toastLabel(entry), meta.cls, function () {
          if (global.toast) global.toast.show(resolveToastMsg(entry), entry.type || "info");
        }));
      });
    }

    // — Page-specific actions —
    var actions = opts.actions || [];
    if (actions.length) {
      if (toasts.length) inner.appendChild(makeSep());
      actions.forEach(function (item) {
        if (item.group) {
          inner.appendChild(makeLabel(item.group));
          (item.items || []).forEach(function (sub) {
            inner.appendChild(makeBtn(sub.label, null, sub.fn));
          });
        } else {
          inner.appendChild(makeBtn(item.label, item.cls || null, item.fn));
        }
      });
    }

    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  global.devBar = { mount: mount };
})(window);
