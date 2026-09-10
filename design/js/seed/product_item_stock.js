(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  var TS = "2024-05-20T10:00:00.000Z";
  var TS2 = "2024-06-15T10:00:00.000Z";
  var TS3 = "2024-08-01T10:00:00.000Z";
  global.SEED_PRODUCT_ITEM_STOCK = [
    Object.assign(
      {
        id: 1,
        product_item_id: 1,
        product_item_warehouse_id: 1,
        purchase_order_item_id: 1,
        order_quantity: 48,
        order_free_gift: 2,
        quantity: 50,
        remain_quantity: 10,
        cost_per_unit: 6.5,
        discount_per_unit: 0.2,
        sell_price: 10,
        received_at: TS,
        is_used: true,
      },
      audit(1)
    ),
    Object.assign(
      { id: 2, product_item_id: 2, product_item_warehouse_id: 2, remain_quantity: 12, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 3, product_item_id: 3, product_item_warehouse_id: 3, remain_quantity: 7, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 4, product_item_id: 4, product_item_warehouse_id: 4, remain_quantity: 4, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 5, product_item_id: 5, product_item_warehouse_id: 5, remain_quantity: 18400, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 6, product_item_id: 6, product_item_warehouse_id: 6, remain_quantity: 9200, is_used: true },
      audit(1)
    ),
    Object.assign(
      {
        id: 7,
        product_item_id: 1,
        product_item_warehouse_id: 7,
        purchase_order_item_id: 2,
        order_quantity: 28,
        order_free_gift: 2,
        quantity: 30,
        remain_quantity: 5,
        cost_per_unit: 6,
        discount_per_unit: 0.15,
        sell_price: 9.5,
        received_at: TS2,
        is_used: false,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 8,
        product_item_id: 1,
        product_item_warehouse_id: 8,
        purchase_order_item_id: 3,
        order_quantity: 18,
        order_free_gift: 2,
        quantity: 20,
        remain_quantity: 0,
        cost_per_unit: 5.8,
        discount_per_unit: 0.1,
        sell_price: 10.5,
        received_at: TS3,
        is_used: false,
      },
      audit(1)
    ),
  ];
})(window);
