(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  // ordered_at spread across day / month / year so the product History tab can
  // demonstrate the day / month / year view modes and range filters.
  function po(id, sku, supplierId, orderedAt) {
    return Object.assign(
      {
        id: id,
        sku: sku,
        supplier_user_id: supplierId,
        status: "receive_completed",
        ordered_at: orderedAt,
        vat_rate: 7,
        discount: 0,
        special_discount: 0,
        total_price: 0,
        note: "",
      },
      audit(1),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }
  global.SEED_PURCHASE_ORDER = [
    po(1, "PO-2026010004", 1, "2026-01-04T10:00:00.000Z"),
    po(2, "PO-2026010006", 1, "2026-01-06T10:00:00.000Z"),
    po(3, "PO-2026020018", 2, "2026-02-18T10:00:00.000Z"),
    po(4, "PO-2026030022", 2, "2026-03-22T10:00:00.000Z"),
    po(5, "PO-2025050015", 1, "2025-05-15T10:00:00.000Z"),
    po(6, "PO-2025110002", 3, "2025-11-02T10:00:00.000Z"),
    po(7, "PO-2024030010", 2, "2024-03-10T10:00:00.000Z"),
    po(8, "PO-2024080020", 3, "2024-08-20T10:00:00.000Z"),
  ];
})(window);
