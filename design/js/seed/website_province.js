(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_WEBSITE_PROVINCE = [
    Object.assign({ id: 1, website_country_id: 1, sku: "10", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, website_country_id: 1, sku: "11", sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, website_country_id: 1, sku: "12", sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, website_country_id: 1, sku: "13", sort_order: 400, is_active: true }, audit(4)),
    Object.assign({ id: 5, website_country_id: 1, sku: "20", sort_order: 500, is_active: true }, audit(5)),
    Object.assign({ id: 6, website_country_id: 1, sku: "21", sort_order: 600, is_active: true }, audit(6)),
    Object.assign({ id: 7, website_country_id: 1, sku: "30", sort_order: 700, is_active: true }, audit(7)),
    Object.assign({ id: 8, website_country_id: 1, sku: "40", sort_order: 800, is_active: true }, audit(8)),
    Object.assign({ id: 9, website_country_id: 1, sku: "50", sort_order: 900, is_active: true }, audit(9)),
    Object.assign({ id: 10, website_country_id: 1, sku: "57", sort_order: 1000, is_active: false }, audit(10)),
    Object.assign({ id: 11, website_country_id: 1, sku: "83", sort_order: 1100, is_active: true }, audit(11)),
    Object.assign({ id: 12, website_country_id: 1, sku: "90", sort_order: 1200, is_active: true }, audit(12)),
    Object.assign({ id: 13, website_country_id: 2, sku: "SG", sort_order: 100, is_active: true }, audit(13)),
  ];
})(window);
