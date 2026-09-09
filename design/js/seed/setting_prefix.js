(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SETTING_PREFIX = [
    Object.assign({ id: 1, type: "person", code: "mr", sort_order: 100, is_active: true }, audit(1)),
    Object.assign({ id: 2, type: "person", code: "mrs", sort_order: 200, is_active: true }, audit(2)),
    Object.assign({ id: 3, type: "person", code: "miss", sort_order: 300, is_active: true }, audit(3)),
    Object.assign({ id: 4, type: "company", code: "co_ltd", sort_order: 100, is_active: true }, audit(4)),
    Object.assign({ id: 5, type: "company", code: "pcl", sort_order: 200, is_active: true }, audit(5)),
    Object.assign({ id: 6, type: "company", code: "ltd_part", sort_order: 300, is_active: true }, audit(6)),
    Object.assign({ id: 7, type: "company", code: "individual", sort_order: 400, is_active: true }, audit(7)),
  ];
})(window);
