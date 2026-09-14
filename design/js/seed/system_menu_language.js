(function (global) {
  var TS = global.ADMIN_SEED_SHARED.TS;
  var rows = [];
  global.SYSTEM_MENU_DEFS.forEach(function (d) {
    ["th", "en"].forEach(function (loc) {
      rows.push({
        system_menu_id: d.id,
        locale: loc,
        name: d.labels[loc],
        created_at: TS,
        updated_at: TS,
      });
    });
  });
  global.SEED_SYSTEM_MENU_LANGUAGE = rows;
})(window);
