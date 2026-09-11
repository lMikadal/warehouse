(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function op(id, orderId, sku, category, totalPrice, amountPaid, orderedAt, isPaid) {
    var paid = Number(amountPaid) || 0;
    var total = Number(totalPrice) || 0;
    return Object.assign(
      {
        id: id,
        order_order_id: orderId,
        sku: sku,
        payment_category: category,
        ordered_at: orderedAt,
        vat_rate: 7,
        discount: 0,
        special_discount: 0,
        total_price: total,
        amount_paid: paid,
        is_full: paid >= total,
        is_paid: isPaid != null ? isPaid : paid >= total,
        credit_approved_by: category === "credit" ? 1 : null,
        discount_approved_by: null,
      },
      audit(1),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }

  global.SEED_ORDER_PAYMENT = [
    op(1, 1, "REV2026010005", "payment", 136, 136, "2026-01-05T10:00:00.000Z", true),
    op(2, 2, "REV2026010006", "payment", 225, 225, "2026-01-06T10:00:00.000Z", true),
    op(3, 3, "INV2026020020", "credit", 240, 240, "2026-02-20T10:00:00.000Z", true),
    op(4, 4, "REV2026030025", "payment", 88, 88, "2026-03-25T10:00:00.000Z", true),
    op(5, 5, "INV2025060010", "credit", 294, 100, "2025-06-10T10:00:00.000Z", false),
    op(6, 6, "REV2025120001", "payment", 175.5, 175.5, "2025-12-01T10:00:00.000Z", true),
    op(7, 7, "INV2024040012", "credit", 198, 198, "2024-04-12T10:00:00.000Z", true),
    op(8, 8, "REV2024090005", "payment", 105, 105, "2024-09-05T10:00:00.000Z", true),
    op(9, 9, "REV2026010099", "payment", 520, 0, "2026-01-15T10:00:00.000Z", false),
    op(10, 10, "INV2025010010", "credit", 11607.14, 0, "2025-01-10T10:00:00.000Z", false),
  ];
})(window);
