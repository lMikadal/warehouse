(function (global) {
  var codeToId = global.ADMIN_PERM_CODE_TO_ID;
  var ACTIONS = global.ADMIN_SEED_SHARED.ACTIONS;
  var rows = [];

  global.ADMIN_MENU_DEFS.forEach(function (d) {
    if (!d.path || d.is_dialog) return;
    if (/dashboard\.html/i.test(d.path)) return;
    var parent = global.ADMIN_MENU_DEFS.find(function (p) {
      return p.id === d.parent_id;
    });
    var permModule = parent ? parent.module : d.module;
    if (d.parent_id === 2 || (parent && parent.parent_id === 2 && parent.id === 6)) {
      permModule = "admin";
    }
    if (d.parent_id === 11) permModule = "admin";
    if (d.parent_id === 37) permModule = "order";
    if (parent && (parent.id === 33 || parent.parent_id === 33)) permModule = "member";
    if (d.id === 22) permModule = "supplier";

    var permType = d.module;
    if (d.id === 22) permType = "supplier_user";

    ACTIONS.forEach(function (action) {
      var code = permModule + "." + permType + "." + action;
      var permId = codeToId[code];
      if (permId) {
        rows.push({
          admin_menu_id: d.id,
          admin_permission_id: permId,
        });
      }
    });
  });

  global.SEED_ADMIN_MENU_PERMISSION = rows;
})(window);
