(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  // Sales orders (successful) spread across day / month / year so the product
  // History สั่ง"ประวัติขาย" tab can demonstrate the day / month / year views.
  function so(id, sku, memberName, orderedAt) {
    return Object.assign(
      {
        id: id,
        sku: sku,
        status: "success",
        fulfill_status: "success",
        parent_id: null,
        member_user_id: null,
        member_setting_relation_id: null,
        member_name: memberName,
        member_tel: "",
        member_email: "",
        ordered_at: orderedAt,
      },
      audit(1),
      { created_at: orderedAt, updated_at: orderedAt }
    );
  }
  global.SEED_ORDER_ORDER = [
    so(1, "SO-2026010005", "สมชาย ใจดี", "2026-01-05T10:00:00.000Z"),
    so(2, "SO-2026010006", "บริษัท เอ บี ซี จำกัด", "2026-01-06T10:00:00.000Z"),
    so(3, "SO-2026020020", "สมหญิง รักการค้า", "2026-02-20T10:00:00.000Z"),
    so(4, "SO-2026030025", "ร้านมิตรยนต์", "2026-03-25T10:00:00.000Z"),
    so(5, "SO-2025060010", "สมชาย ใจดี", "2025-06-10T10:00:00.000Z"),
    so(6, "SO-2025120001", "อู่ช่างตี๋", "2025-12-01T10:00:00.000Z"),
    so(7, "SO-2024040012", "บริษัท เอ บี ซี จำกัด", "2024-04-12T10:00:00.000Z"),
    so(8, "SO-2024090005", "ร้านมิตรยนต์", "2024-09-05T10:00:00.000Z"),
  ];
})(window);
