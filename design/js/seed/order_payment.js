(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function op(id, orderId, opts) {
    opts = opts || {};
    var total = Number(opts.total_price) || 0;
    var paid = Number(opts.amount_paid) || 0;
    var orderedAt = opts.ordered_at || "2026-01-05T10:00:00.000Z";
    var category = opts.payment_category || "payment";
    return Object.assign(
      {
        id: id,
        order_list_id: orderId,
        sku: opts.sku,
        payment_category: category,
        ordered_at: orderedAt,
        vat_rate: opts.vat_rate != null ? opts.vat_rate : 7,
        discount: opts.discount || 0,
        special_discount: opts.special_discount || 0,
        total_price: total,
        amount_paid: paid,
        is_full: paid >= total && total > 0,
        is_paid: opts.is_paid != null ? opts.is_paid : paid >= total && total > 0,
        credit_approved_by: opts.credit_approved_by != null ? opts.credit_approved_by : category === "credit" ? 1 : null,
        discount_approved_by: opts.discount_approved_by || null,
        member_user_id: opts.member_user_id != null ? opts.member_user_id : null,
        member_setting_credit_id:
          opts.member_setting_credit_id != null ? opts.member_setting_credit_id : null,
        member_name: opts.member_name || null,
        member_tel: opts.member_tel || null,
        member_email: opts.member_email || null,
      },
      audit(opts.createdBy || 1),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }

  global.SEED_ORDER_PAYMENT = [
    op(1, 1, { sku: "REV2026010005", total_price: 136, amount_paid: 136, ordered_at: "2026-01-05T10:00:00.000Z" }),
    op(2, 2, { sku: "REV2026010006", total_price: 225, amount_paid: 225, ordered_at: "2026-01-06T10:00:00.000Z" }),
    op(3, 3, {
      sku: "INV2026020020",
      payment_category: "credit",
      total_price: 240,
      amount_paid: 240,
      ordered_at: "2026-02-20T10:00:00.000Z",
    }),
    op(4, 4, { sku: "REV2026030025", total_price: 88, amount_paid: 88, ordered_at: "2026-03-25T10:00:00.000Z" }),
    op(5, 5, {
      sku: "INV2025060010",
      payment_category: "credit",
      total_price: 294,
      amount_paid: 100,
      is_paid: false,
      ordered_at: "2025-06-10T10:00:00.000Z",
    }),
    op(6, 6, { sku: "REV2025120001", total_price: 175.5, amount_paid: 175.5, ordered_at: "2025-12-01T10:00:00.000Z" }),
    op(7, 7, {
      sku: "INV2024040012",
      payment_category: "credit",
      total_price: 198,
      amount_paid: 198,
      ordered_at: "2024-04-12T10:00:00.000Z",
    }),
    op(8, 8, { sku: "REV2024090005", total_price: 105, amount_paid: 105, ordered_at: "2024-09-05T10:00:00.000Z" }),
    op(9, 9, {
      sku: "REV2026010099",
      total_price: 520,
      amount_paid: 0,
      is_paid: false,
      ordered_at: "2026-01-15T10:00:00.000Z",
    }),
    op(10, 10, {
      sku: "INV2025010010",
      payment_category: "credit",
      total_price: 11607.14,
      amount_paid: 0,
      is_paid: false,
      ordered_at: "2025-01-10T10:00:00.000Z",
    }),

    // second payment on order 3 (expand chevron in picking list)
    op(11, 3, {
      sku: "REV2026020020B",
      total_price: 90,
      amount_paid: 90,
      is_paid: true,
      ordered_at: "2026-02-21T10:00:00.000Z",
    }),

    // picked complete pending sale — loan draft
    op(12, 15, {
      sku: "INV2026030104",
      payment_category: "credit",
      total_price: 126,
      amount_paid: 0,
      is_paid: false,
      ordered_at: "2026-03-05T11:00:00.000Z",
    }),

    // in-progress picking — payment draft
    op(13, 13, {
      sku: "REV2026030102",
      total_price: 50,
      amount_paid: 0,
      is_paid: false,
      ordered_at: "2026-03-03T16:00:00.000Z",
    }),

    // special discount approved
    op(14, 6, {
      sku: "REV2025120001B",
      total_price: 50,
      amount_paid: 50,
      special_discount: 10,
      discount_approved_by: 1,
      ordered_at: "2025-12-02T10:00:00.000Z",
    }),

    // multi-payment order 25: credit then cash
    op(15, 25, {
      sku: "INV2026031201",
      payment_category: "credit",
      total_price: 100,
      amount_paid: 100,
      is_paid: true,
      ordered_at: "2026-03-12T11:00:00.000Z",
    }),
    op(16, 25, {
      sku: "REV2026031201",
      total_price: 109,
      amount_paid: 109,
      is_paid: true,
      ordered_at: "2026-03-12T12:00:00.000Z",
    }),

    // partial payment settled false
    op(17, 5, {
      sku: "REV2025060010P",
      total_price: 50,
      amount_paid: 30,
      is_paid: false,
      is_full: false,
      ordered_at: "2025-06-11T10:00:00.000Z",
    }),
  ];
})(window);
