(function (global) {
  var shared = global.ADMIN_SEED_SHARED;
  var audit = shared.audit;

  var defs = [
    { id: 1, type: "warehouse", sku: "ATW001", parent_id: null, sort_order: 100, capacity: 0, is_active: true },
    { id: 2, type: "warehouse", sku: "PJB001", parent_id: null, sort_order: 200, capacity: 0, is_active: true },
    { id: 3, type: "warehouse", sku: "GS001", parent_id: null, sort_order: 300, capacity: 0, is_active: true },
    { id: 4, type: "zone", sku: "ATW-Z01", parent_id: 1, sort_order: 100, capacity: 10, is_active: true },
    { id: 5, type: "zone", sku: "ATW-Z02", parent_id: 1, sort_order: 200, capacity: 10, is_active: true },
    { id: 6, type: "zone", sku: "ATW-Z03", parent_id: 1, sort_order: 300, capacity: 10, is_active: true },
    { id: 7, type: "zone", sku: "ATW-Z04", parent_id: 1, sort_order: 400, capacity: 10, is_active: false },
    { id: 8, type: "zone", sku: "ATW-Z05", parent_id: 1, sort_order: 500, capacity: 10, is_active: true },
    { id: 9, type: "zone", sku: "ATW-Z06", parent_id: 1, sort_order: 600, capacity: 10, is_active: true },
    { id: 10, type: "zone", sku: "PJB-Z01", parent_id: 2, sort_order: 100, capacity: 10, is_active: true },
    { id: 11, type: "zone", sku: "PJB-Z02", parent_id: 2, sort_order: 200, capacity: 10, is_active: true },
    { id: 12, type: "zone", sku: "PJB-Z03", parent_id: 2, sort_order: 300, capacity: 10, is_active: true },
    { id: 13, type: "zone", sku: "PJB-Z04", parent_id: 2, sort_order: 400, capacity: 10, is_active: true },
    { id: 14, type: "zone", sku: "PJB-Z05", parent_id: 2, sort_order: 500, capacity: 10, is_active: true },
    { id: 15, type: "zone", sku: "GS-Z01", parent_id: 3, sort_order: 100, capacity: 10, is_active: true },
    { id: 16, type: "zone", sku: "GS-Z02", parent_id: 3, sort_order: 200, capacity: 10, is_active: true },
    { id: 17, type: "zone", sku: "GS-Z03", parent_id: 3, sort_order: 300, capacity: 10, is_active: true },
    { id: 18, type: "zone", sku: "GS-Z04", parent_id: 3, sort_order: 400, capacity: 10, is_active: true },
    { id: 19, type: "shelf", sku: "ATW-Z01-S01", parent_id: 4, sort_order: 100, capacity: 50, is_active: true },
    { id: 20, type: "shelf", sku: "ATW-Z01-S02", parent_id: 4, sort_order: 200, capacity: 40, is_active: true },
    { id: 21, type: "rack", sku: "ATW-Z01-R01", parent_id: 19, sort_order: 100, capacity: 30, is_active: true },
    { id: 22, type: "bin", sku: "ATW-Z01-B01", parent_id: 21, sort_order: 100, capacity: 20, is_active: true },
    { id: 23, type: "shelf", sku: "ATW-Z02-S01", parent_id: 5, sort_order: 100, capacity: 45, is_active: true },
    { id: 24, type: "rack", sku: "ATW-Z02-R01", parent_id: 23, sort_order: 100, capacity: 25, is_active: true },
    { id: 25, type: "bin", sku: "ATW-Z02-B01", parent_id: 24, sort_order: 100, capacity: 15, is_active: true },
    { id: 26, type: "shelf", sku: "ATW-Z03-S01", parent_id: 6, sort_order: 100, capacity: 35, is_active: true },
    { id: 27, type: "rack", sku: "ATW-Z03-R01", parent_id: 6, sort_order: 200, capacity: 20, is_active: false },
    { id: 28, type: "bin", sku: "ATW-Z03-B01", parent_id: 6, sort_order: 300, capacity: 10, is_active: true },
  ];

  global.SEED_WAREHOUSE_LIST = shared.assignTreePaths(defs).map(function (d) {
    return Object.assign({}, d, audit(1));
  });
})(window);
