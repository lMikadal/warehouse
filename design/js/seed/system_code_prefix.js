(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  var base = {
    format_style: "prefix_yyyymm_dash_seq",
    seq_width: 5,
    timezone: "Asia/Bangkok",
    period_key: "",
    last_seq: 0,
    is_active: true,
    deleted_at: null,
  };
  global.SEED_SYSTEM_CODE_PREFIX = [
    Object.assign({ id: 1, code_key: "member_user", prefix: "MEM", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 2, code_key: "order_list", prefix: "PJB", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 3, code_key: "purchase_order", prefix: "PO", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 4, code_key: "order_quotation", prefix: "QT", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 5, code_key: "purchase_order_draft", prefix: "PO(T)", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 6, code_key: "purchase_request", prefix: "TK", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 7, code_key: "purchase_order_item_reject", prefix: "RJ", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 8, code_key: "purchase_order_item_reject_draft", prefix: "RJ(T)", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 9, code_key: "purchase_claim", prefix: "PCL", reset_period: "month" }, base, audit(1)),
    Object.assign({ id: 10, code_key: "order_claim", prefix: "CLM", reset_period: "month" }, base, audit(1)),
  ];
})(window);
