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
  ];
})(window);
