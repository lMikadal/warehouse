(function (global) {
  var container = null;
  var DISMISS_MS = 4000;
  var EXIT_MS = 300;

  var ICONS = {
    success:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    error:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    warning:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  };

  var CLOSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  function closeLabel() {
    return global.i18n ? global.i18n.t("toast.close") : "Close";
  }

  function ensureDom() {
    if (container) return;
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  function dismiss(el, timers) {
    if (el.dataset.dismissed === "1") return;
    el.dataset.dismissed = "1";
    if (timers.hide) clearTimeout(timers.hide);
    if (timers.remove) clearTimeout(timers.remove);
    el.classList.remove("toast--visible");
    setTimeout(function () {
      el.remove();
    }, EXIT_MS);
  }

  function show(message, type) {
    ensureDom();
    type = type || "info";
    if (!ICONS[type]) type = "info";

    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", "status");

    var icon = document.createElement("span");
    icon.className = "toast__icon";
    icon.innerHTML = ICONS[type];

    var msg = document.createElement("span");
    msg.className = "toast__message";
    msg.textContent = message;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast__close";
    closeBtn.setAttribute("aria-label", closeLabel());
    closeBtn.innerHTML = CLOSE_ICON;

    el.appendChild(icon);
    el.appendChild(msg);
    el.appendChild(closeBtn);
    container.appendChild(el);

    var timers = { hide: null, remove: null };

    closeBtn.addEventListener("click", function () {
      dismiss(el, timers);
    });

    requestAnimationFrame(function () {
      el.classList.add("toast--visible");
    });

    timers.hide = setTimeout(function () {
      dismiss(el, timers);
    }, DISMISS_MS);
  }

  global.toast = { show: show };
})(window);
