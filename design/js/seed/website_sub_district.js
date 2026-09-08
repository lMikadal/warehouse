(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_WEBSITE_SUB_DISTRICT = [
    Object.assign(
      { id: 1, website_district_id: 1, sku: "100101", postcode: "10200", sort_order: 100, is_active: true },
      audit(1)
    ),
    Object.assign(
      { id: 2, website_district_id: 2, sku: "100201", postcode: "10500", sort_order: 100, is_active: true },
      audit(2)
    ),
    Object.assign(
      { id: 3, website_district_id: 3, sku: "500101", postcode: "50200", sort_order: 100, is_active: true },
      audit(3)
    ),
  ];
})(window);
