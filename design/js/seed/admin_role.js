(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_ADMIN_ROLE = [
    Object.assign({ id: 1, is_active: true }, audit(1)),
    Object.assign({ id: 2, is_active: true }, audit(2)),
  ];
})(window);
