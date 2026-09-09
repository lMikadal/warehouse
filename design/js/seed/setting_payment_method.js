(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_PAYMENT_METHOD = [
    Object.assign({ id: 1, is_sale: true, is_purchase: true, sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, is_sale: true, is_purchase: true, sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, is_sale: true, is_purchase: true, sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, is_sale: true, is_purchase: false, sort_order: 400, is_active: true }, audit(4)),
    Object.assign({ id: 5, is_sale: false, is_purchase: true, sort_order: 500, is_active: true }, audit(5)),
    Object.assign({ id: 6, is_sale: false, is_purchase: true, sort_order: 600, is_active: true }, audit(6)),
  ];
})(window);
