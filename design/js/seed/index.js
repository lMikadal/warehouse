/** Merge seed tables into window.SEED — keys match design/schema/ table names. */
(function (global) {
  global.SEED_VERSION = "system-code-prefix-1";

  var tables = {};

  if (global.SEED_SYSTEM_LANGUAGE) {
    tables.system_language = global.SEED_SYSTEM_LANGUAGE;
  }

  var geoTables = [
    "system_country",
    "system_country_language",
    "system_province",
    "system_province_language",
    "system_district",
    "system_district_language",
    "system_sub_district",
    "system_sub_district_language",
  ];
  geoTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var adminTables = [
    "system_menu",
    "system_menu_language",
    "system_permission",
    "system_menu_permission",
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

  var memberSettingTables = [
    "member_setting_credit",
    "member_setting_credit_language",
    "member_setting_group",
    "member_setting_group_language",
    "member_setting_business",
    "member_setting_business_language",
    "member_setting_relation",
  ];
  memberSettingTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  var memberTierTables = [
    "member_tier",
    "member_tier_language",
    "member_tier_attribute",
    "member_tier_relation",
    "member_tier_relation_attribute",
  ];
  memberTierTables.forEach(function (name) {
    var key = "SEED_" + name.toUpperCase();
    if (global[key]) tables[name] = global[key];
  });

  if (global.SEED_SYSTEM_FILE) tables.system_file = global.SEED_SYSTEM_FILE;

  if (global.SEED_SYSTEM_CODE_PREFIX) {
    tables.system_code_prefix = global.SEED_SYSTEM_CODE_PREFIX;
  }

  var memberUserTables = [
    "member_user",
    "member_user_address",
    "member_user_setting",
    "member_user_owner",
    "member_user_file",
    "member_user_discount",
    "member_history",
    "member_history_language",
  ];
  memberUserTables.forEach(function (name) {
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

  var orderTables = [
    "order_list",
    "order_list_item",
    "order_list_item_warehouse",
    "order_payment",
    "order_payment_item",
    "order_payment_method",
    "order_shipping",
    "order_claim",
    "order_claim_item",
  ];
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
