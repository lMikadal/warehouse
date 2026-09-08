(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_WEBSITE_DISTRICT = [
    Object.assign({ id: 1, website_province_id: 1, sku: "1001", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, website_province_id: 1, sku: "1002", sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, website_province_id: 2, sku: "5001", sort_order: 100, is_active: true }, audit(3)),
  ];
})(window);
