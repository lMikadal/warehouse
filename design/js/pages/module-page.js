(function (global) {
  function boot() {
    var moduleKey = document.body.dataset.module;
    if (!moduleKey) return;

    var config = global.moduleRegistry.get(moduleKey);
    if (!config) {
      console.error("Unknown module:", moduleKey);
      return;
    }

    global.store.init();
    global.i18n.init();

    if (!global.auth.requireAuth("login.html")) return;
    if (!global.permissions.guardPage(config.permModule, config.permType, "login.html")) return;

    global.layout.mount({
      pageTitle: global.i18n.t(config.pageTitleKey),
      contentHtml: '<div id="crud-root"></div>',
    });

    var root = document.getElementById("crud-root");
    global.crudList.mount(root, config, config.permModule, config.permType);

    global.devBar.mount({
      toasts: [
        { type: "success", label: "Success: saved", msgKey: "crud.saved" },
        { type: "error", label: "Error: forbidden", msgKey: "error.forbidden" },
        { type: "warning", label: "Warning: confirm", msg: "Check this before proceeding." },
      ],
      actions: [
        {
          group: "Data",
          items: [
            {
              label: "Reset store",
              fn: function () {
                global.store.reset();
                window.location.reload();
              },
            },
          ],
        },
      ],
    });

    function rerender() {
      var cfg = global.moduleRegistry.get(moduleKey);
      global.crudList.mount(root, cfg, cfg.permModule, cfg.permType);
    }

    document.addEventListener("i18n:change", rerender);
    if (global.realtime) {
      global.realtime.onMessage(function () {
        rerender();
      });
    }
  }

  global.modulePage = { boot: boot };
})(window);
