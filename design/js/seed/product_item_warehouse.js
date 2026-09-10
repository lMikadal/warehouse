(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_ITEM_WAREHOUSE = [
    Object.assign({ id: 1, product_item_id: 1, bin_id: 22 }, audit(1)),
    Object.assign({ id: 2, product_item_id: 2, bin_id: 25 }, audit(1)),
    Object.assign({ id: 3, product_item_id: 3, bin_id: 28 }, audit(1)),
    Object.assign({ id: 4, product_item_id: 4, bin_id: 37 }, audit(1)),
    Object.assign({ id: 5, product_item_id: 5, bin_id: 31 }, audit(1)),
    Object.assign({ id: 6, product_item_id: 6, bin_id: 34 }, audit(1)),
    Object.assign({ id: 7, product_item_id: 1, bin_id: 35 }, audit(1)),
    Object.assign({ id: 8, product_item_id: 1, bin_id: 36 }, audit(1)),
  ];
})(window);
