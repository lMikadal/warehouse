(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_MEMBER_TIER_RELATION = [
    Object.assign(
      {
        id: 1,
        member_tier_id: 2,
        member_setting_relation_id: 1,
        purchase_start: 10000,
        purchase_end: 49999,
        discount: 5,
        discount_type: "percent",
        type: "all",
        is_promotion: false,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        member_tier_id: 2,
        member_setting_relation_id: 5,
        purchase_start: 10000,
        purchase_end: 49999,
        discount: 3,
        discount_type: "percent",
        type: "all",
        is_promotion: false,
      },
      audit(2)
    ),
    Object.assign(
      {
        id: 3,
        member_tier_id: 3,
        member_setting_relation_id: 1,
        purchase_start: 50000,
        purchase_end: 99999,
        discount: 10,
        discount_type: "percent",
        type: "all",
        is_promotion: false,
      },
      audit(3)
    ),
    Object.assign(
      {
        id: 4,
        member_tier_id: 3,
        member_setting_relation_id: 3,
        purchase_start: 50000,
        purchase_end: 99999,
        discount: 8,
        discount_type: "percent",
        type: "category",
        is_promotion: false,
      },
      audit(4)
    ),
    Object.assign(
      {
        id: 5,
        member_tier_id: 4,
        member_setting_relation_id: 1,
        purchase_start: 100000,
        purchase_end: 9999999,
        discount: 15,
        discount_type: "percent",
        type: "brand",
        is_promotion: true,
      },
      audit(5)
    ),
  ];
})(window);
