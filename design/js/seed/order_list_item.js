(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function ooi(id, orderId, opts) {
    opts = opts || {};
    var amount = opts.amount != null ? opts.amount : 1;
    var price = opts.price != null ? opts.price : 10;
    var discount = opts.discount != null ? opts.discount : 0;
    var checked = opts.amount_checked != null ? opts.amount_checked : amount;
    return Object.assign(
      {
        id: id,
        order_list_id: orderId,
        product_item_id: opts.product_item_id != null ? opts.product_item_id : 1,
        type: opts.type || "item",
        amount: amount,
        amount_picked: opts.amount_picked != null ? opts.amount_picked : amount,
        amount_checked: checked,
        status: opts.status || (checked >= amount ? "success" : checked > 0 ? "in_progress" : "pending"),
        price_per_unit: price,
        discount: discount,
        vat_type: opts.vat_type != null ? opts.vat_type : "exclude",
        vat_rate: opts.vat_rate != null ? opts.vat_rate : 7,
        total_price:
          opts.type === "compare" ? 0 : amount * price - amount * discount,
        detail: opts.detail != null ? opts.detail : null,
      },
      audit(opts.createdBy || 1)
    );
  }

  global.SEED_ORDER_LIST_ITEM = [
    ooi(1, 1, { product_item_id: 1, amount: 10, price: 10.0 }),
    ooi(2, 1, { product_item_id: 2, amount: 2, price: 18.0 }),
    ooi(3, 2, { product_item_id: 1, amount: 25, price: 9.5, discount: 0.5 }),
    ooi(4, 3, { product_item_id: 1, amount: 15, price: 10.0 }),
    ooi(5, 3, { product_item_id: 2, amount: 5, price: 19.0, discount: 1.0 }),
    ooi(6, 4, { product_item_id: 1, amount: 8, price: 11.0 }),
    ooi(7, 5, { product_item_id: 1, amount: 30, price: 9.8 }),
    ooi(8, 6, { product_item_id: 1, amount: 12, price: 10.2, discount: 0.2 }),
    ooi(9, 6, { product_item_id: 2, amount: 3, price: 18.5 }),
    ooi(10, 7, { product_item_id: 1, amount: 20, price: 9.9 }),
    ooi(11, 8, { product_item_id: 2, amount: 6, price: 18.0, discount: 0.5 }),
    ooi(12, 9, { product_item_id: 1, amount: 40, price: 13.0 }),
    ooi(13, 10, { product_item_id: 2, amount: 100, price: 116.0714 }),

    // draft + compare line
    ooi(14, 11, { product_item_id: 1, amount: 5, price: 10, amount_checked: 0, status: "pending" }),
    ooi(15, 11, {
      type: "compare",
      product_item_id: null,
      amount: 2,
      price: 0,
      amount_checked: 0,
      detail: "เทียบราคาคู่แข่ง A",
    }),

    ooi(16, 12, { product_item_id: 2, amount: 4, price: 18, amount_checked: 0, status: "pending" }),
    ooi(17, 13, { product_item_id: 1, amount: 10, price: 10, amount_checked: 5, status: "in_progress" }),
    ooi(18, 14, { product_item_id: 1, amount: 3, price: 10, amount_checked: 0, status: "pending" }),
    ooi(19, 15, { product_item_id: 2, amount: 7, price: 18, amount_checked: 7, status: "success" }),
    ooi(20, 16, { product_item_id: 1, amount: 6, price: 10, amount_checked: 2, status: "in_progress" }),
    ooi(21, 17, { product_item_id: 1, amount: 8, price: 10, amount_checked: 3, status: "in_progress" }),
    ooi(22, 20, { product_item_id: 1, amount: 12, price: 10, amount_checked: 0, status: "pending" }),
    ooi(23, 21, { product_item_id: 2, amount: 1, price: 18, amount_checked: 0, status: "pending" }),
    ooi(24, 22, { product_item_id: 1, amount: 5, price: 10, amount_checked: 5, status: "success" }),
    ooi(25, 23, { product_item_id: 2, amount: 2, price: 18, amount_checked: 0, status: "pending" }),
    ooi(26, 24, { product_item_id: 1, amount: 3, price: 10, amount_checked: 0, status: "pending" }),
    ooi(27, 25, { product_item_id: 1, amount: 15, price: 11, amount_checked: 15, status: "success" }),
    ooi(28, 25, { product_item_id: 2, amount: 4, price: 19, amount_checked: 4, status: "success" }),
  ];
})(window);
