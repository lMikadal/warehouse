(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  function ooi(id, orderId, itemId, amount, price, discount) {
    return Object.assign(
      {
        id: id,
        order_order_id: orderId,
        product_item_id: itemId,
        type: "item",
        amount: amount,
        amount_picked: amount,
        amount_checked: amount,
        status: "success",
        price_per_unit: price,
        discount: discount,
        total_price: amount * price - amount * discount,
        detail: null,
      },
      audit(1)
    );
  }
  global.SEED_ORDER_ORDER_ITEM = [
    ooi(1, 1, 1, 10, 10.0, 0),
    ooi(2, 1, 2, 2, 18.0, 0),
    ooi(3, 2, 1, 25, 9.5, 0.5),
    ooi(4, 3, 1, 15, 10.0, 0),
    ooi(5, 3, 2, 5, 19.0, 1.0),
    ooi(6, 4, 1, 8, 11.0, 0),
    ooi(7, 5, 1, 30, 9.8, 0),
    ooi(8, 6, 1, 12, 10.2, 0.2),
    ooi(9, 6, 2, 3, 18.5, 0),
    ooi(10, 7, 1, 20, 9.9, 0),
    ooi(11, 8, 2, 6, 18.0, 0.5),
    ooi(12, 9, 1, 40, 13.0, 0),
    ooi(13, 10, 2, 100, 116.0714, 0),
  ];
})(window);
