(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_SETTING_RELATION = [
    Object.assign({ id: 1, credit_id: 1, group_id: 1, business_id: 1, is_active: true }, audit(1)),
    Object.assign({ id: 2, credit_id: 1, group_id: 2, business_id: 1, is_active: true }, audit(2)),
    Object.assign({ id: 3, credit_id: 2, group_id: 1, business_id: 1, is_active: true }, audit(3)),
    Object.assign({ id: 4, credit_id: 2, group_id: 2, business_id: 1, is_active: true }, audit(4)),
    Object.assign({ id: 5, credit_id: 1, group_id: 1, business_id: 2, is_active: true }, audit(5)),
    Object.assign({ id: 6, credit_id: 1, group_id: 2, business_id: 2, is_active: true }, audit(6)),
    Object.assign({ id: 7, credit_id: 2, group_id: 1, business_id: 2, is_active: true }, audit(7)),
    Object.assign({ id: 8, credit_id: 2, group_id: 2, business_id: 2, is_active: true }, audit(8)),
  ];
})(window);
