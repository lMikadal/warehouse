(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_SALE_CHANNEL = [
    Object.assign(
      { id: 1, website_file_id: null, is_active: true, is_default: true, member_setting_relation_id: null, sort_order: 100 },
      audit(1)
    ),
    Object.assign(
      { id: 2, website_file_id: null, is_active: true, is_default: true, member_setting_relation_id: null, sort_order: 200 },
      audit(2)
    ),
    Object.assign(
      { id: 3, website_file_id: null, is_active: true, is_default: true, member_setting_relation_id: null, sort_order: 300 },
      audit(3)
    ),
    Object.assign(
      { id: 4, website_file_id: null, is_active: true, is_default: false, member_setting_relation_id: null, sort_order: 400 },
      audit(4)
    ),
    Object.assign(
      { id: 5, website_file_id: null, is_active: true, is_default: false, member_setting_relation_id: null, sort_order: 500 },
      audit(5)
    ),
  ];
})(window);
