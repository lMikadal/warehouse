/** Merge seed tables into window.SEED — keys match design/schema/ table names. */
(function (global) {
  global.SEED_VERSION = "product-list-14";

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

  var warehouseTables = [
    "warehouse_list",
    "warehouse_list_language",
    "warehouse_condition",
    "product_item_warehouse",
    "product_item_stock",
  ];
  warehouseTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var productAttrTables = [
    "product_attribute",
    "product_attribute_language",
    "product_attribute_relation",
  ];
  productAttrTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var purchaseTables = ["purchase_order", "purchase_order_item"];
  purchaseTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var orderTables = ["order_order", "order_order_item"];
  orderTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var productListTables = [
    "product_list",
    "product_list_language",
    "product_list_car",
    "product_item",
    "product_item_language",
    "product_item_price",
    "product_item_supplier",
  ];
  productListTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  global.SEED = tables;
})(window);
