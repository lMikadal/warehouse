(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SUPPLIER_CONTACT = [
    Object.assign(
      {
        id: 1,
        supplier_user_id: 1,
        name: "สมชาย ใจดี",
        email: "somchai@thai-auto.test",
        tel: "081-1112222",
        position: "ฝ่ายขาย",
        sort_order: 100,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        supplier_user_id: 1,
        name: "วิไล รักษ์ดี",
        email: "wilai@thai-auto.test",
        tel: "082-3334444",
        position: "ฝ่ายจัดซื้อ",
        sort_order: 200,
      },
      audit(2)
    ),
    Object.assign(
      {
        id: 3,
        supplier_user_id: 2,
        name: "ประเสริฐ มั่นคง",
        email: "prasert@cm-auto.test",
        tel: "086-5556666",
        position: "ผู้จัดการ",
        sort_order: 100,
      },
      audit(3)
    ),
    Object.assign(
      {
        id: 4,
        supplier_user_id: 3,
        name: "สมชาย อะไหล่รถ",
        email: "somchai@parts.test",
        tel: "089-8887777",
        position: null,
        sort_order: 100,
      },
      audit(4)
    ),
  ];
})(window);
