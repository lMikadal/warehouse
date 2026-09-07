/** Merge seed tables into window.SEED — keys match design/schema/ table names. */
(function (global) {
  global.SEED_VERSION = "admin-shell-9";

  var tables = {};

  if (global.SEED_WEBSITE_LANGUAGE) {
    tables.website_language = global.SEED_WEBSITE_LANGUAGE;
  }

  var adminTables = [
    "admin_menu",
    "admin_menu_language",
    "admin_permission",
    "admin_menu_permission",
    "admin_role",
    "admin_role_language",
    "admin_role_permission",
    "admin_user",
  ];
  adminTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  global.SEED = tables;
})(window);
