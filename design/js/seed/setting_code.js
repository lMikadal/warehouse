(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_CODE = [
    Object.assign({ id: 1, code: "A", value: "1", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, code: "B", value: "2", sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, code: "C", value: "3", sort_order: 300, is_active: true }, audit(3)),
  ];
})(window);
