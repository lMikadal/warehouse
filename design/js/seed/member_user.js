(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  var thisMonth = "2026-09-05T04:00:00Z";

  function row(id, extra, createdAt) {
    var a = audit(1);
    if (createdAt) {
      a.created_at = createdAt;
      a.updated_at = createdAt;
    }
    return Object.assign(
      {
        id: id,
        sku: null,
        member_tier_id: null,
        type: "person",
        setting_prefix_id: null,
        name: "",
        store_name: null,
        tax_number: null,
        branch: null,
        branch_name: null,
        tel: null,
        email: null,
        address: null,
        website_province_id: null,
        website_district_id: null,
        website_sub_district_id: null,
        postcode: null,
        website_file_id: null,
        note: null,
        is_active: true,
      },
      extra,
      a
    );
  }

  global.SEED_MEMBER_USER = [
    row(1, {
      sku: "MEM-001",
      member_tier_id: 1,
      type: "person",
      setting_prefix_id: 1,
      name: "สมชาย ใจดี",
      store_name: "อู่สมชาย",
      tax_number: "1234567890123",
      tel: "081-2345678",
      email: "somchai@example.com",
      address: "123 ถนนเจริญกรุง",
      website_province_id: 1,
      website_district_id: 1,
      website_sub_district_id: 1,
      postcode: "10200",
      note: "ลูกค้าประจำอู่",
      is_active: true,
    }),
    row(2, {
      sku: "MEM-002",
      member_tier_id: 2,
      type: "company",
      setting_prefix_id: 4,
      name: "อู่เจริญยนต์ จำกัด",
      store_name: "เจริญยนต์",
      tax_number: "0105551234567",
      branch: "headquarter",
      tel: "02-1234567",
      email: "info@charoenyon.co.th",
      address: "88/9 ถนนพระราม 4",
      website_province_id: 1,
      website_district_id: 2,
      website_sub_district_id: 3,
      postcode: "10500",
      note: "สั่งซื้อเป็นชุด",
      is_active: true,
    }),
    row(3, {
      sku: "MEM-003",
      member_tier_id: 1,
      type: "person",
      setting_prefix_id: 3,
      name: "พิมพ์ รักดี",
      tel: "089-1112233",
      email: "pim@example.com",
      address: "15 ซอยสุขุมวิท 21",
      website_province_id: 1,
      website_district_id: 3,
      website_sub_district_id: 5,
      postcode: "10300",
      is_active: false,
    }),
    row(4, {
      sku: "MEM-004",
      member_tier_id: 3,
      type: "company",
      setting_prefix_id: 4,
      name: "บริษัท ออโต้พาร์ท จำกัด",
      store_name: "Auto Part",
      tax_number: "0105567890123",
      branch: "branch",
      branch_name: "สาขาพระราม 2",
      tel: "02-9876543",
      email: "sales@autopart.co.th",
      address: "99 ถนนพระราม 2",
      website_province_id: 1,
      website_district_id: 4,
      website_sub_district_id: 7,
      postcode: "10900",
      is_active: true,
    }),
    row(
      5,
      {
        sku: "MEM-005",
        member_tier_id: 1,
        type: "person",
        setting_prefix_id: 1,
        name: "วิชัย มาใหม่",
        tel: "086-5556677",
        email: "wichai@example.com",
        address: "42 ถนนเพชรบุรี",
        website_province_id: 1,
        website_district_id: 1,
        website_sub_district_id: 2,
        postcode: "10200",
        note: "สมัครเดือนนี้",
        is_active: true,
      },
      thisMonth
    ),
  ];
})(window);
