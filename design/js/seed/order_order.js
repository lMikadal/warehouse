(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;

  /**
   * Seed coverage (sales status × fulfill_status + families):
   * - draft, pending, success, cancelled, rejected
   * - fulfill: pending, in_progress, success, fail
   * - parent_id family, walk-in (null member), null sku draft
   */
  function so(id, opts) {
    opts = opts || {};
    var orderedAt = opts.orderedAt || "2026-01-05T10:00:00.000Z";
    var status = opts.status || "success";
    var fulfill =
      opts.fulfill_status != null
        ? opts.fulfill_status
        : status === "cancelled" || status === "rejected"
          ? "fail"
          : status === "draft"
            ? "pending"
            : "success";
    var createdBy = opts.createdBy != null ? opts.createdBy : 1;
    return Object.assign(
      {
        id: id,
        sku: opts.sku != null ? opts.sku : "PJB-202601-" + String(id).padStart(4, "0") + "-01",
        status: status,
        fulfill_status: fulfill,
        parent_id: opts.parent_id != null ? opts.parent_id : null,
        member_user_id: opts.member_user_id != null ? opts.member_user_id : 1,
        member_setting_relation_id: opts.member_setting_relation_id || null,
        member_name: opts.member_name != null ? opts.member_name : "สมชาย ใจดี",
        member_tel: opts.member_tel || "",
        member_email: opts.member_email || "",
        ordered_at: status === "draft" && !opts.sku ? null : orderedAt,
        created_by: createdBy,
      },
      audit(createdBy),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }

  global.SEED_ORDER_ORDER = [
    // --- historical success (member tab / product history) ---
    so(1, {
      sku: "PJB-202601-0005-01",
      member_user_id: 1,
      member_name: "สมชาย ใจดี",
      orderedAt: "2026-01-05T10:00:00.000Z",
      status: "success",
      fulfill_status: "success",
    }),
    so(2, {
      sku: "PJB-202601-0006-01",
      member_user_id: 2,
      member_name: "บริษัท เอ บี ซี จำกัด",
      orderedAt: "2026-01-06T10:00:00.000Z",
      createdBy: 2,
    }),
    so(3, {
      sku: "PJB-202602-0020-01",
      member_user_id: 3,
      member_name: "สมหญิง รักการค้า",
      orderedAt: "2026-02-20T10:00:00.000Z",
    }),
    so(4, {
      sku: "PJB-202603-0025-01",
      member_user_id: 4,
      member_name: "ร้านมิตรยนต์",
      orderedAt: "2026-03-25T10:00:00.000Z",
      createdBy: 2,
    }),
    so(5, {
      sku: "PJB-202506-0010-01",
      member_user_id: 1,
      orderedAt: "2025-06-10T10:00:00.000Z",
    }),
    so(6, {
      sku: "PJB-202512-0001-01",
      member_user_id: 5,
      member_name: "อู่ช่างตี๋",
      orderedAt: "2025-12-01T10:00:00.000Z",
      createdBy: 2,
    }),
    so(7, {
      sku: "PJB-202404-0012-01",
      member_user_id: 2,
      member_name: "บริษัท เอ บี ซี จำกัด",
      orderedAt: "2024-04-12T10:00:00.000Z",
    }),
    so(8, {
      sku: "PJB-202409-0005-01",
      member_user_id: 4,
      member_name: "ร้านมิตรยนต์",
      orderedAt: "2024-09-05T10:00:00.000Z",
      createdBy: 2,
    }),
    so(9, {
      sku: "PJB-202601-0099-01",
      member_user_id: 1,
      orderedAt: "2026-01-15T10:00:00.000Z",
      status: "cancelled",
      fulfill_status: "fail",
    }),
    so(10, {
      sku: "PJB-202501-0010-01",
      member_user_id: 1,
      orderedAt: "2025-01-10T10:00:00.000Z",
      createdBy: 2,
    }),

    // --- store sales list / form scenarios ---
    so(11, {
      sku: null,
      orderedAt: "2026-03-01T10:00:00.000Z",
      status: "draft",
      fulfill_status: "pending",
    }),
    so(12, {
      sku: "PJB-202603-0101-01",
      member_user_id: 2,
      member_name: "บริษัท เอ บี ซี จำกัด",
      orderedAt: "2026-03-02T10:00:00.000Z",
      status: "pending",
      fulfill_status: "pending",
      createdBy: 2,
    }),
    so(13, {
      sku: "PJB-202603-0102-01",
      member_user_id: 3,
      member_name: "สมหญิง รักการค้า",
      orderedAt: "2026-03-03T10:00:00.000Z",
      status: "pending",
      fulfill_status: "in_progress",
    }),
    so(14, {
      sku: "PJB-202603-0103-01",
      member_user_id: 4,
      member_name: "ร้านมิตรยนต์",
      orderedAt: "2026-03-04T10:00:00.000Z",
      status: "rejected",
      fulfill_status: "fail",
      createdBy: 2,
    }),
    so(15, {
      sku: "PJB-202603-0104-01",
      member_user_id: 1,
      orderedAt: "2026-03-05T10:00:00.000Z",
      status: "pending",
      fulfill_status: "success",
    }),
    so(16, {
      sku: "PJB-202603-0105-01",
      member_user_id: 2,
      member_name: "บริษัท เอ บี ซี จำกัด",
      orderedAt: "2026-03-06T10:00:00.000Z",
      status: "pending",
      fulfill_status: "fail",
      createdBy: 2,
    }),
    so(17, {
      sku: "PJB-202603-0106-01",
      member_user_id: 3,
      member_name: "สมหญิง รักการค้า",
      orderedAt: "2026-03-07T10:00:00.000Z",
      status: "success",
      fulfill_status: "in_progress",
    }),

    // --- family (parent + children) ---
    so(20, {
      sku: "PJB-202603-1001-01",
      member_user_id: 1,
      orderedAt: "2026-03-10T10:00:00.000Z",
      status: "pending",
      fulfill_status: "pending",
    }),
    so(21, {
      sku: "PJB-202603-1001-01",
      parent_id: 20,
      orderedAt: "2026-03-10T11:00:00.000Z",
      status: "draft",
      fulfill_status: "pending",
    }),
    so(22, {
      sku: "PJB-202603-1001-02",
      parent_id: 20,
      orderedAt: "2026-03-10T12:00:00.000Z",
      status: "pending",
      fulfill_status: "in_progress",
    }),
    so(23, {
      sku: "PJB-202603-1001-03",
      parent_id: 20,
      orderedAt: "2026-03-10T13:00:00.000Z",
      status: "cancelled",
      fulfill_status: "fail",
    }),

    // --- walk-in draft ---
    so(24, {
      sku: null,
      member_user_id: null,
      member_name: "ลูกค้าทั่วไป",
      member_tel: "0800000000",
      orderedAt: "2026-03-11T10:00:00.000Z",
      status: "draft",
      fulfill_status: "pending",
    }),

    // --- multi-payment picking (fulfill success, sale success) ---
    so(25, {
      sku: "PJB-202603-1201-01",
      member_user_id: 4,
      member_name: "ร้านมิตรยนต์",
      orderedAt: "2026-03-12T10:00:00.000Z",
      status: "success",
      fulfill_status: "success",
      createdBy: 2,
    }),
  ];
})(window);
