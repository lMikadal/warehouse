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
        { type: "success", label: "Created", msgKey: "crud.created" },
        { type: "success", label: "Updated", msgKey: "crud.updated" },
        { type: "success", label: "Reordered", msgKey: "crud.reordered" },
        { type: "success", label: "Status changed", msgKey: "crud.statusChanged" },
        { type: "success", label: "Deleted", msgKey: "crud.deleted" },
        { type: "error", label: "Error: forbidden", msgKey: "error.forbidden" },
        { type: "warning", label: "Warning: drag scope", msgKey: "crud.dragSiblingOnly" },
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
