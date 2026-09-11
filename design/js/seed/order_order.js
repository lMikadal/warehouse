(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  // Sales orders spread across day / month / year for product sales history and member order tab.
  function so(id, sku, memberUserId, memberName, orderedAt, status, createdBy) {
    return Object.assign(
      {
        id: id,
        sku: sku,
        status: status || "success",
        fulfill_status: status === "cancelled" ? "fail" : "success",
        parent_id: null,
        member_user_id: memberUserId,
        member_setting_relation_id: null,
        member_name: memberName,
        member_tel: "",
        member_email: "",
        ordered_at: orderedAt,
        created_by: createdBy != null ? createdBy : 1,
      },
      audit(createdBy != null ? createdBy : 1),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }
  global.SEED_ORDER_ORDER = [
    so(1, "PJB2026010005", 1, "สมชาย ใจดี", "2026-01-05T10:00:00.000Z", "success", 1),
    so(2, "PJB2026010006", 2, "บริษัท เอ บี ซี จำกัด", "2026-01-06T10:00:00.000Z", "success", 2),
    so(3, "PJB2026020020", 3, "สมหญิง รักการค้า", "2026-02-20T10:00:00.000Z", "success", 1),
    so(4, "PJB2026030025", 4, "ร้านมิตรยนต์", "2026-03-25T10:00:00.000Z", "success", 2),
    so(5, "PJB2025060010", 1, "สมชาย ใจดี", "2025-06-10T10:00:00.000Z", "success", 1),
    so(6, "PJB2025120001", 5, "อู่ช่างตี๋", "2025-12-01T10:00:00.000Z", "success", 2),
    so(7, "PJB2024040012", 2, "บริษัท เอ บี ซี จำกัด", "2024-04-12T10:00:00.000Z", "success", 1),
    so(8, "PJB2024090005", 4, "ร้านมิตรยนต์", "2024-09-05T10:00:00.000Z", "success", 2),
    so(9, "PJB2026010099", 1, "สมชาย ใจดี", "2026-01-15T10:00:00.000Z", "cancelled", 1),
    so(10, "PJB2025010010", 1, "สมชาย ใจดี", "2025-01-10T10:00:00.000Z", "success", 2),
  ];
})(window);
