(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_ITEM_STOCK = [
    Object.assign(
      { id: 1, product_item_id: 1, product_item_warehouse_id: 1, remain_quantity: 1200, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 2, product_item_id: 2, product_item_warehouse_id: 2, remain_quantity: 800, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 3, product_item_id: 3, product_item_warehouse_id: 3, remain_quantity: 5600, is_used: true },
      audit(1)
    ),
    Object.assign(
      { id: 4, product_item_id: 4, product_item_warehouse_id: 4, remain_quantity: 18000, is_used: true },
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
  ];
})(window);
