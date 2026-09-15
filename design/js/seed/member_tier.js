(function (global) {
  var shared = global.ADMIN_SEED_SHARED;
  var audit = shared.audit;

  var defs = [
    {
      id: 1,
      parent_id: null,
      sort_order: 100,
      is_default: true,
      is_active: true,
      purchase_start: 0,
      purchase_end: 9999,
      discount: 0,
      discount_type: "percent",
      type: "all",
      is_promotion: false,
    },
    {
      id: 2,
      parent_id: null,
      sort_order: 200,
      is_default: false,
      is_active: true,
      purchase_start: 10000,
      purchase_end: 49999,
      discount: 5,
      discount_type: "percent",
      type: "all",
      is_promotion: false,
    },
    {
      id: 3,
      parent_id: null,
      sort_order: 300,
      is_default: false,
      is_active: true,
      purchase_start: 50000,
      purchase_end: 99999,
      discount: 10,
      discount_type: "percent",
      type: "all",
      is_promotion: false,
    },
    {
      id: 4,
      parent_id: null,
      sort_order: 400,
      is_default: false,
      is_active: true,
      purchase_start: 100000,
      purchase_end: 9999999,
      discount: 15,
      discount_type: "percent",
      type: "brand",
      is_promotion: true,
    },
  ];

  global.SEED_MEMBER_TIER = shared.assignTreePaths(defs).map(function (d) {
    return Object.assign({ system_file_id: null }, d, audit(1));
  });
})(window);
