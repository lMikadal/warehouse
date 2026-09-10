(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_SETTING_BUSINESS = [
    Object.assign({ id: 1, sku: "U01", is_active: true }, audit(1)),
    Object.assign({ id: 2, sku: "A01", is_active: true }, audit(2)),
  ];
})(window);
