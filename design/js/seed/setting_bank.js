(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_BANK = [
    Object.assign({ id: 1, system_file_id: null, sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, system_file_id: null, sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, system_file_id: null, sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, system_file_id: null, sort_order: 400, is_active: true }, audit(4)),
  ];
})(window);
