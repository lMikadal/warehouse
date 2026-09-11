(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  function row(id, itemId, whId, qty) {
    return Object.assign(
      {
        id: id,
        order_order_item_id: itemId,
        warehouse_list_id: whId,
        amount_checked: qty,
      },
      audit(1)
    );
  }
  global.SEED_ORDER_ORDER_ITEM_WAREHOUSE = [
    row(1, 1, 1, 10),
    row(2, 3, 1, 25),
    row(3, 17, 1, 5),
    row(4, 19, 1, 7),
    row(5, 20, 1, 2),
    row(6, 24, 1, 5),
    row(7, 27, 1, 10),
    row(8, 28, 1, 4),
  ];
})(window);
