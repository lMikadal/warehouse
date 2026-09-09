/** Merge seed tables into window.SEED — keys match design/schema/ table names. */
(function (global) {
  global.SEED_VERSION = "location-crud-1";

  var tables = {};

  if (global.SEED_WEBSITE_LANGUAGE) {
    tables.website_language = global.SEED_WEBSITE_LANGUAGE;
  }

  var geoTables = [
    "website_country",
    "website_country_language",
    "website_province",
    "website_province_language",
    "website_district",
    "website_district_language",
    "website_sub_district",
    "website_sub_district_language",
  ];
  geoTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

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

  var settingTables = [
    "setting_bank",
    "setting_bank_language",
    "setting_vat",
    "setting_payment_method",
    "setting_payment_method_language",
    "setting_sale_channel",
    "setting_sale_channel_language",
    "setting_code",
    "setting_claim_reason",
    "setting_claim_reason_language",
    "setting_prefix",
    "setting_prefix_language",
  ];
  settingTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var supplierTables = [
    "supplier_user",
    "supplier_information",
    "supplier_contact",
    "supplier_bank",
  ];
  supplierTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var locationTables = ["location_location", "location_location_language"];
  locationTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  global.SEED = tables;
})(window);
