(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  function qt(id, opts) {
    opts = opts || {};
    var createdAt = opts.createdAt || "2026-01-08T09:00:00.000Z";
    return Object.assign(
      {
        id: id,
        sku: opts.sku != null ? opts.sku : id > 1 ? "QT-202601-" + String(id).padStart(5, "0") : null,
        status: opts.status || "draft",
        member_user_id: opts.member_user_id != null ? opts.member_user_id : 1,
        member_setting_credit_id: opts.member_setting_credit_id || null,
        member_name: opts.member_name != null ? opts.member_name : "สมชาย ใจดี",
        member_tel: opts.member_tel || "081-2345678",
        member_email: opts.member_email || "demo@example.com",
        issue_date: opts.issue_date || "2026-01-08",
        valid_until: opts.valid_until || "2026-02-08",
        reserve_stock: opts.reserve_stock != null ? opts.reserve_stock : false,
        notes: opts.notes || "",
        accept_mode: opts.accept_mode != null ? opts.accept_mode : null,
        credit_date: opts.credit_date != null ? opts.credit_date : null,
        vat_type: opts.vat_type != null ? opts.vat_type : "exclude",
        vat_rate: opts.vat_rate != null ? opts.vat_rate : 7,
        subtotal_ex_vat: opts.subtotal_ex_vat != null ? opts.subtotal_ex_vat : 1000,
        discount_total: opts.discount_total != null ? opts.discount_total : 0,
        vat_amount: opts.vat_amount != null ? opts.vat_amount : 70,
        grand_total: opts.grand_total != null ? opts.grand_total : 1070,
        parent_id: opts.parent_id != null ? opts.parent_id : null,
        created_by: opts.createdBy != null ? opts.createdBy : 1,
      },
      audit(opts.createdBy != null ? opts.createdBy : 1),
      { created_at: createdAt, updated_at: createdAt }
    );
  }

  global.SEED_ORDER_QUOTATION = [
    qt(1, { status: "draft", sku: null, grand_total: 0, subtotal_ex_vat: 0, vat_amount: 0 }),
    qt(2, { status: "pending", sku: "QT-202601-00002" }),
    qt(3, { status: "approved", sku: "QT-202601-00003", accept_mode: null }),
    qt(4, {
      status: "success",
      sku: "QT-202601-00004",
      accept_mode: "payment",
      createdAt: "2026-01-10T11:00:00.000Z",
    }),
    qt(5, {
      status: "approved",
      sku: "QT-202601-00005",
      valid_until: "2025-12-01",
      issue_date: "2025-11-01",
    }),
    qt(6, { status: "cancelled", sku: "QT-202601-00006" }),
    qt(7, { status: "rejected", sku: "QT-202601-00007" }),
    qt(8, {
      status: "draft",
      sku: null,
      parent_id: 4,
      member_name: "สมหญิง รักการค้า",
      member_user_id: 3,
    }),
  ];
})(window);
