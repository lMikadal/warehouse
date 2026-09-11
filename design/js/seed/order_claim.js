(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function cl(id, opts) {
    opts = opts || {};
    return Object.assign(
      {
        id: id,
        sku: opts.sku,
        order_payment_id: opts.order_payment_id,
        supplier_user_id: opts.supplier_user_id || null,
        type: opts.type || "return",
        payment_type: opts.payment_type || "cash",
        other_reason: opts.other_reason || "",
        total_price: opts.total_price || 0,
        status: opts.status || "pending",
      },
      audit(opts.createdBy || 1)
    );
  }

  /** Every order_claim_status + payment_type + claim/return mix (on paid payments). */
  global.SEED_ORDER_CLAIM = [
    cl(1, {
      sku: "CLM2026010001",
      order_payment_id: 6,
      type: "return",
      payment_type: "cash",
      total_price: 50,
      status: "pending",
    }),
    cl(2, {
      sku: "CLM2025120001",
      order_payment_id: 8,
      type: "claim",
      payment_type: "transfer",
      total_price: 18,
      status: "success",
    }),
    cl(3, {
      sku: "CLM2026020001",
      order_payment_id: 3,
      type: "claim",
      payment_type: "cash",
      total_price: 30,
      status: "acknowledged",
    }),
    cl(4, {
      sku: "CLM2026030001",
      order_payment_id: 1,
      type: "return",
      payment_type: "transfer",
      total_price: 36,
      status: "waiting_supplier",
    }),
    cl(5, {
      sku: "CLM2024040001",
      order_payment_id: 7,
      type: "claim",
      payment_type: "other",
      other_reason: "ชดเชยอื่นๆ",
      total_price: 25,
      status: "cancelled",
    }),
    cl(6, {
      sku: "CLM2024090001",
      order_payment_id: 7,
      type: "return",
      payment_type: "debt_reduction",
      total_price: 40,
      status: "rejected",
    }),
    cl(7, {
      sku: "CLM2025120002",
      order_payment_id: 14,
      type: "claim",
      payment_type: "other",
      other_reason: "ส่วนลดพิเศษคืน",
      total_price: 10,
      status: "success",
    }),
    cl(8, {
      sku: "CLM2026031201",
      order_payment_id: 16,
      type: "return",
      payment_type: "cash",
      total_price: 76,
      status: "pending",
    }),
  ];
})(window);
