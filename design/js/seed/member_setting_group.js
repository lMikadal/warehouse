(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_SETTING_GROUP = [
    Object.assign({ id: 1, sku: "RETAIL", is_active: true }, audit(1)),
    Object.assign({ id: 2, sku: "WHOLESALE", is_active: true }, audit(2)),
  ];
})(window);
