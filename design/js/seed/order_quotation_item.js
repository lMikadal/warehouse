(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function line(id, quoteId, opts) {
    opts = opts || {};
    var qty = opts.amount != null ? opts.amount : 1;
    var price = opts.price_per_unit != null ? opts.price_per_unit : 500;
    var discount = opts.discount != null ? opts.discount : 0;
    var total = opts.total_price != null ? opts.total_price : qty * price - discount;
    return Object.assign(
      {
        id: id,
        order_quotation_id: quoteId,
        product_item_id: opts.product_item_id != null ? opts.product_item_id : 1,
        amount: qty,
        price_per_unit: price,
        discount: discount,
        vat_type: opts.vat_type != null ? opts.vat_type : "exclude",
        vat_rate: opts.vat_rate != null ? opts.vat_rate : 7,
        total_price: total,
        sort_order: opts.sort_order != null ? opts.sort_order : id,
      },
      audit(1)
    );
  }

  global.SEED_ORDER_QUOTATION_ITEM = [
    line(1, 2, { product_item_id: 1, amount: 2, price_per_unit: 500 }),
    line(2, 3, { product_item_id: 2, amount: 1, price_per_unit: 1000 }),
    line(3, 4, { product_item_id: 1, amount: 1, price_per_unit: 1070, total_price: 1070 }),
    line(4, 5, { product_item_id: 3, amount: 3, price_per_unit: 200 }),
  ];
})(window);
