(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_CLAIM_REASON = [
    Object.assign({ id: 1, is_claim: true, is_return: false, sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, is_claim: true, is_return: false, sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, is_claim: false, is_return: true, sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, is_claim: true, is_return: true, sort_order: 400, is_active: true }, audit(4)),
  ];
})(window);
