(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_PREFIX = [
    Object.assign({ id: 1, is_person: true, is_company: false, sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, is_person: true, is_company: false, sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, is_person: true, is_company: false, sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, is_person: false, is_company: true, sort_order: 100, is_active: true }, audit(4)),
    Object.assign({ id: 5, is_person: false, is_company: true, sort_order: 200, is_active: true }, audit(5)),
    Object.assign({ id: 6, is_person: false, is_company: true, sort_order: 300, is_active: true }, audit(6)),
    Object.assign({ id: 7, is_person: false, is_company: true, sort_order: 400, is_active: true }, audit(7)),
  ];
})(window);
