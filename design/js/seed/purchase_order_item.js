(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  function poi(id, poId, itemId, qty, free, price, unit) {
    return Object.assign(
      {
        id: id,
        purchase_order_id: poId,
        status: "receive_approved",
        type: "catalog",
        product_item_id: itemId,
        identification_number: "",
        qty: qty,
        free_gift: free,
        unit: unit || "piece",
        price_per_unit: price,
        vat_rate: 7,
        discount: 0,
        total_price: 0,
        note: "",
      },
      audit(1)
    );
  }
  global.SEED_PURCHASE_ORDER_ITEM = [
    poi(1, 1, 1, 48, 2, 6.5, "piece"),
    poi(2, 2, 1, 28, 2, 6.0, "piece"),
    poi(3, 2, 1, 18, 2, 5.8, "piece"),
    poi(4, 3, 1, 40, 3, 6.2, "piece"),
    poi(5, 3, 2, 20, 0, 12.0, "set"),
    poi(6, 4, 1, 30, 2, 6.4, "piece"),
    poi(7, 4, 2, 15, 1, 11.5, "set"),
    poi(8, 5, 1, 50, 5, 6.0, "piece"),
    poi(9, 6, 1, 25, 2, 5.9, "piece"),
    poi(10, 6, 2, 10, 0, 12.5, "set"),
    poi(11, 7, 1, 60, 4, 5.7, "piece"),
    poi(12, 8, 2, 12, 1, 11.0, "set"),
  ];
})(window);
