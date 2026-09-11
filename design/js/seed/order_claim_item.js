(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function ci(id, opts) {
    return Object.assign(
      {
        id: id,
        order_claim_id: opts.order_claim_id,
        order_payment_item_id: opts.order_payment_item_id,
        setting_claim_reason_id: opts.setting_claim_reason_id,
        type: opts.type,
        amount: opts.amount,
        status: opts.status || "pending",
        note: opts.note || "",
      },
      audit(1)
    );
  }

  global.SEED_ORDER_CLAIM_ITEM = [
    ci(1, {
      order_claim_id: 1,
      order_payment_item_id: 8,
      setting_claim_reason_id: 3,
      type: "return",
      amount: 2,
      status: "pending",
    }),
    ci(2, {
      order_claim_id: 2,
      order_payment_item_id: 11,
      setting_claim_reason_id: 1,
      type: "claim",
      amount: 1,
      status: "success",
      note: "demo",
    }),
    ci(3, {
      order_claim_id: 3,
      order_payment_item_id: 4,
      setting_claim_reason_id: 1,
      type: "claim",
      amount: 2,
      status: "acknowledged",
    }),
    ci(4, {
      order_claim_id: 4,
      order_payment_item_id: 2,
      setting_claim_reason_id: 3,
      type: "return",
      amount: 1,
      status: "waiting_supplier",
    }),
    ci(5, {
      order_claim_id: 5,
      order_payment_item_id: 10,
      setting_claim_reason_id: 2,
      type: "claim",
      amount: 1,
      status: "cancelled",
    }),
    ci(6, {
      order_claim_id: 6,
      order_payment_item_id: 10,
      setting_claim_reason_id: 3,
      type: "return",
      amount: 2,
      status: "rejected",
      note: "ไม่เข้าเงื่อนไข",
    }),
    ci(7, {
      order_claim_id: 7,
      order_payment_item_id: 17,
      setting_claim_reason_id: 1,
      type: "claim",
      amount: 1,
      status: "success",
    }),
    ci(8, {
      order_claim_id: 8,
      order_payment_item_id: 19,
      setting_claim_reason_id: 3,
      type: "return",
      amount: 4,
      status: "pending",
    }),
  ];
})(window);
