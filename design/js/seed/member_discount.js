(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_DISCOUNT = [
    Object.assign(
      {
        id: 1,
        member_user_id: 1,
        member_credit_id: 1,
        product_item_id: 1,
        minimum_qty: 2,
        discount: 10,
        discount_type: "percent",
        date_start: "2026-01-01",
        date_end: "2026-12-31",
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        member_user_id: 1,
        member_credit_id: 1,
        product_item_id: 3,
        minimum_qty: 1,
        discount: 50,
        discount_type: "baht",
        date_start: "2026-01-01",
        date_end: "2026-06-30",
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        member_user_id: 2,
        member_credit_id: 2,
        product_item_id: 5,
        minimum_qty: 4,
        discount: 15,
        discount_type: "percent",
        date_start: "2026-03-01",
        date_end: null,
        is_active: true,
      },
      audit(1)
    ),
  ];
})(window);
