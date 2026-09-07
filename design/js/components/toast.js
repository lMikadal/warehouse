(function (global) {
  var container = null;

  function ensureDom() {
    if (container) return;
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  function show(message, type) {
    ensureDom();
    var el = document.createElement("div");
    el.className = "toast toast--" + (type || "info");
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("toast--visible");
    });
    setTimeout(function () {
      el.classList.remove("toast--visible");
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 3200);
  }

  global.toast = { show: show };
})(window);
