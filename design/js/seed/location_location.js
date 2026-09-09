(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_LOCATION_LOCATION = [
    Object.assign({ id: 1, sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, sort_order: 300, is_active: false }, audit(3)),
  ];
})(window);
