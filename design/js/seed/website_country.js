(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_WEBSITE_COUNTRY = [
    Object.assign({ id: 1, sku: "TH", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, sku: "SG", sort_order: 200, is_active: true }, audit(2)),
  ];
})(window);
