(function (global) {
  var shared = global.ADMIN_SEED_SHARED;
  var audit = shared.audit;
  var TS = shared.TS;

  var defs = [
    { id: 1, type: "brand", type_car: null, parent_id: null, sort_order: 100, is_active: true },
    { id: 2, type: "brand", type_car: null, parent_id: null, sort_order: 200, is_active: true },
    { id: 3, type: "category", type_car: null, parent_id: null, sort_order: 100, is_active: true },
    { id: 4, type: "category", type_car: null, parent_id: 3, sort_order: 100, is_active: true },
    { id: 5, type: "car", type_car: "brand", parent_id: null, sort_order: 100, is_active: true },
    { id: 6, type: "car", type_car: "model", parent_id: 5, sort_order: 100, is_active: true },
    { id: 7, type: "car", type_car: "engine", parent_id: 6, sort_order: 100, is_active: true },
    { id: 8, type: "car", type_car: "brand", parent_id: null, sort_order: 200, is_active: true },
    { id: 9, type: "car", type_car: "model", parent_id: 8, sort_order: 100, is_active: true },
  ];

  global.SEED_PRODUCT_ATTRIBUTE = shared.assignTreePaths(defs).map(function (d) {
    return Object.assign(
      {
        website_file_id: null,
        is_stopped: false,
      },
      d,
      audit(1)
    );
  });

  global.SEED_PRODUCT_ATTRIBUTE_LANGUAGE = [
    { product_attribute_id: 1, locale: "th", name: "Toyota", created_at: TS, updated_at: TS },
    { product_attribute_id: 1, locale: "en", name: "Toyota", created_at: TS, updated_at: TS },
    { product_attribute_id: 2, locale: "th", name: "Honda", created_at: TS, updated_at: TS },
    { product_attribute_id: 2, locale: "en", name: "Honda", created_at: TS, updated_at: TS },
    { product_attribute_id: 3, locale: "th", name: "อะไหล่เครื่องยนต์", created_at: TS, updated_at: TS },
    { product_attribute_id: 3, locale: "en", name: "Engine parts", created_at: TS, updated_at: TS },
    { product_attribute_id: 4, locale: "th", name: "น้ำมันเครื่อง", created_at: TS, updated_at: TS },
    { product_attribute_id: 4, locale: "en", name: "Engine oil", created_at: TS, updated_at: TS },
    { product_attribute_id: 5, locale: "th", name: "Toyota", created_at: TS, updated_at: TS },
    { product_attribute_id: 5, locale: "en", name: "Toyota", created_at: TS, updated_at: TS },
    { product_attribute_id: 6, locale: "th", name: "Camry", created_at: TS, updated_at: TS },
    { product_attribute_id: 6, locale: "en", name: "Camry", created_at: TS, updated_at: TS },
    { product_attribute_id: 7, locale: "th", name: "2.0L", created_at: TS, updated_at: TS },
    { product_attribute_id: 7, locale: "en", name: "2.0L", created_at: TS, updated_at: TS },
    { product_attribute_id: 8, locale: "th", name: "Honda", created_at: TS, updated_at: TS },
    { product_attribute_id: 8, locale: "en", name: "Honda", created_at: TS, updated_at: TS },
    { product_attribute_id: 9, locale: "th", name: "Civic", created_at: TS, updated_at: TS },
    { product_attribute_id: 9, locale: "en", name: "Civic", created_at: TS, updated_at: TS },
  ];

  global.SEED_PRODUCT_ATTRIBUTE_RELATION = [
    { product_attribute_id: 1, related_id: 3 },
    { product_attribute_id: 1, related_id: 4 },
    { product_attribute_id: 2, related_id: 3 },
  ];
})(window);
