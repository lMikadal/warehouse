(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SUPPLIER_BANK = [
    Object.assign(
      {
        id: 1,
        supplier_user_id: 1,
        setting_bank_id: 1,
        name: "บริษัท อะไหล่รถยนต์ไทย จำกัด",
        number: "1234567890",
        branch: "สาขาสีลม",
        is_active: true,
        is_default: true,
        sort_order: 100,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        supplier_user_id: 1,
        setting_bank_id: 2,
        name: "บริษัท อะไหล่รถยนต์ไทย จำกัด",
        number: "9876543210",
        branch: "สาขารามคำแหง",
        is_active: true,
        is_default: false,
        sort_order: 200,
      },
      audit(2)
    ),
    Object.assign(
      {
        id: 3,
        supplier_user_id: 2,
        setting_bank_id: 3,
        name: "เชียงใหม่ ออโต้ พาร์ท จำกัด (มหาชน)",
        number: "5555666677",
        branch: "สาขาเชียงใหม่",
        is_active: true,
        is_default: true,
        sort_order: 100,
      },
      audit(3)
    ),
    Object.assign(
      {
        id: 4,
        supplier_user_id: 4,
        setting_bank_id: 4,
        name: "ห้างหุ้นส่วนจำกัด ภูเก็ต มอเตอร์",
        number: "1122334455",
        branch: null,
        is_active: false,
        is_default: true,
        sort_order: 100,
      },
      audit(4)
    ),
  ];
})(window);
