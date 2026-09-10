(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_SETTING_CREDIT = [
    Object.assign({ id: 1, sku: "CASH", is_active: true }, audit(1)),
    Object.assign({ id: 2, sku: "CREDIT", is_active: true }, audit(2)),
  ];
})(window);
