(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_ITEM_SUPPLIER = [
    Object.assign(
      {
        id: 1,
        product_item_id: 1,
        supplier_user_id: 1,
        cost_price: 320,
        vat_rate: 7,
        discount: 5,
        discount_type: "percent",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        product_item_id: 1,
        supplier_user_id: 2,
        cost_price: 335,
        vat_rate: 7,
        discount: 20,
        discount_type: "baht",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        product_item_id: 2,
        supplier_user_id: 1,
        cost_price: 710,
        vat_rate: 7,
        discount: 0,
        discount_type: "baht",
      },
      audit(1)
    ),
  ];
})(window);
