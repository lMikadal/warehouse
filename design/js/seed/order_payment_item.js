(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function opi(id, paymentId, orderItemId, amount, price, discount, total) {
    return Object.assign(
      {
        id: id,
        order_payment_id: paymentId,
        order_list_item_id: orderItemId,
        amount: amount,
        vat_rate: 7,
        price_per_unit: price,
        discount: discount,
        total_price: total,
      },
      audit(1)
    );
  }

  global.SEED_ORDER_PAYMENT_ITEM = [
    opi(1, 1, 1, 10, 10, 0, 100),
    opi(2, 1, 2, 2, 18, 0, 36),
    opi(3, 2, 3, 25, 9.5, 0.5, 225),
    opi(4, 3, 4, 15, 10, 0, 150),
    opi(5, 3, 5, 5, 19, 1, 90),
    opi(6, 4, 6, 8, 11, 0, 88),
    opi(7, 5, 7, 30, 9.8, 0, 294),
    opi(8, 6, 8, 12, 10.2, 0.2, 120),
    opi(9, 6, 9, 3, 18.5, 0, 55.5),
    opi(10, 7, 10, 20, 9.9, 0, 198),
    opi(11, 8, 11, 6, 18, 0.5, 105),
    opi(12, 9, 12, 40, 13, 0, 520),
    opi(13, 10, 13, 100, 116.0714, 0, 11607.14),
    opi(14, 11, 5, 3, 19, 1, 54),
    opi(15, 12, 19, 7, 18, 0, 126),
    opi(16, 13, 17, 5, 10, 0, 50),
    opi(17, 14, 9, 2, 18.5, 0, 37),
    opi(18, 15, 27, 10, 11, 0, 110),
    opi(19, 16, 28, 4, 19, 0, 76),
    opi(20, 17, 7, 5, 9.8, 0, 49),
  ];
})(window);
