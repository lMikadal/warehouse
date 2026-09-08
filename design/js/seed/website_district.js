(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_WEBSITE_DISTRICT = [
    Object.assign({ id: 1, website_province_id: 1, sku: "1001", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, website_province_id: 1, sku: "1002", sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, website_province_id: 1, sku: "1003", sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, website_province_id: 1, sku: "1030", sort_order: 400, is_active: true }, audit(4)),
    Object.assign({ id: 5, website_province_id: 3, sku: "1201", sort_order: 100, is_active: true }, audit(5)),
    Object.assign({ id: 6, website_province_id: 3, sku: "1202", sort_order: 200, is_active: true }, audit(6)),
    Object.assign({ id: 7, website_province_id: 9, sku: "5001", sort_order: 100, is_active: true }, audit(7)),
    Object.assign({ id: 8, website_province_id: 9, sku: "5002", sort_order: 200, is_active: true }, audit(8)),
    Object.assign({ id: 9, website_province_id: 9, sku: "5003", sort_order: 300, is_active: true }, audit(9)),
    Object.assign({ id: 10, website_province_id: 11, sku: "8301", sort_order: 100, is_active: true }, audit(10)),
    Object.assign({ id: 11, website_province_id: 11, sku: "8302", sort_order: 200, is_active: true }, audit(11)),
    Object.assign({ id: 12, website_province_id: 5, sku: "2001", sort_order: 100, is_active: true }, audit(12)),
    Object.assign({ id: 13, website_province_id: 5, sku: "2002", sort_order: 200, is_active: true }, audit(13)),
    Object.assign({ id: 14, website_province_id: 13, sku: "SG01", sort_order: 100, is_active: true }, audit(14)),
    Object.assign({ id: 15, website_province_id: 13, sku: "SG02", sort_order: 200, is_active: true }, audit(15)),
  ];
})(window);
