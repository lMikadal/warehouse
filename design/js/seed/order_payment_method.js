(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_ORDER_PAYMENT_METHOD = [
    Object.assign({ id: 1, order_payment_id: 1, setting_payment_method_id: 1, amount: 136 }, audit(1)),
    Object.assign({ id: 2, order_payment_id: 2, setting_payment_method_id: 2, amount: 225 }, audit(1)),
    Object.assign({ id: 3, order_payment_id: 6, setting_payment_method_id: 1, amount: 175.5 }, audit(1)),
    // split tender partial
    Object.assign({ id: 4, order_payment_id: 17, setting_payment_method_id: 1, amount: 20 }, audit(1)),
    Object.assign({ id: 5, order_payment_id: 17, setting_payment_method_id: 2, amount: 10 }, audit(1)),
    // multi-method full pay order 25 second payment
    Object.assign({ id: 6, order_payment_id: 16, setting_payment_method_id: 1, amount: 60 }, audit(2)),
    Object.assign({ id: 7, order_payment_id: 16, setting_payment_method_id: 2, amount: 49 }, audit(2)),
    Object.assign({ id: 8, order_payment_id: 14, setting_payment_method_id: 1, amount: 50 }, audit(1)),
  ];
})(window);
