(function (global) {
  var shared = global.ADMIN_SEED_SHARED;
  var audit = shared.audit;
  var TS = shared.TS;

  var defs = [
    { id: 1, type: "brand", type_car: null, parent_id: null, sort_order: 100, is_active: true },
    { id: 2, type: "brand", type_car: null, parent_id: null, sort_order: 200, is_active: true },
    { id: 3, type: "category", type_car: null, parent_id: null, sort_order: 100, is_active: true },
    { id: 4, type: "category", type_car: null, parent_id: 3, sort_order: 100, is_active: true },
    { id: 10, type: "category", type_car: null, parent_id: 4, sort_order: 200, is_active: true },
    { id: 11, type: "category", type_car: null, parent_id: 10, sort_order: 100, is_active: true },
    { id: 12, type: "category", type_car: null, parent_id: 3, sort_order: 200, is_active: true },
    { id: 13, type: "category", type_car: null, parent_id: 3, sort_order: 300, is_active: true },
    { id: 14, type: "category", type_car: null, parent_id: 12, sort_order: 100, is_active: true },
    { id: 15, type: "category", type_car: null, parent_id: 4, sort_order: 300, is_active: true },
    { id: 16, type: "category", type_car: null, parent_id: null, sort_order: 200, is_active: true },
    { id: 17, type: "category", type_car: null, parent_id: 16, sort_order: 100, is_active: true },
    { id: 18, type: "category", type_car: null, parent_id: 16, sort_order: 200, is_active: true },
    { id: 19, type: "category", type_car: null, parent_id: 17, sort_order: 100, is_active: true },
    { id: 20, type: "category", type_car: null, parent_id: 17, sort_order: 200, is_active: true },
    { id: 21, type: "category", type_car: null, parent_id: null, sort_order: 300, is_active: true },
    { id: 22, type: "category", type_car: null, parent_id: 21, sort_order: 100, is_active: true },
    { id: 23, type: "category", type_car: null, parent_id: 22, sort_order: 100, is_active: true },
    { id: 24, type: "category", type_car: null, parent_id: 10, sort_order: 200, is_active: true },
    { id: 5, type: "car", type_car: "brand", parent_id: null, sort_order: 100, is_active: true },
    { id: 6, type: "car", type_car: "model", parent_id: 5, sort_order: 100, is_active: true },
    { id: 7, type: "car", type_car: "engine", parent_id: 6, sort_order: 100, is_active: true },
    { id: 8, type: "car", type_car: "brand", parent_id: null, sort_order: 200, is_active: true },
    { id: 9, type: "car", type_car: "model", parent_id: 8, sort_order: 100, is_active: true },
  ];

  global.SEED_PRODUCT_ATTRIBUTE = shared.assignTreePaths(defs).map(function (d) {
    return Object.assign(
      {
        system_file_id: null,
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
    { product_attribute_id: 3, locale: "th", name: "เครื่องยนต์", created_at: TS, updated_at: TS },
    { product_attribute_id: 3, locale: "en", name: "Engine parts", created_at: TS, updated_at: TS },
    { product_attribute_id: 4, locale: "th", name: "น้ำมันเครื่อง", created_at: TS, updated_at: TS },
    { product_attribute_id: 4, locale: "en", name: "Engine oil", created_at: TS, updated_at: TS },
    { product_attribute_id: 10, locale: "th", name: "Brakes", created_at: TS, updated_at: TS },
    { product_attribute_id: 10, locale: "en", name: "Brakes", created_at: TS, updated_at: TS },
    { product_attribute_id: 11, locale: "th", name: "จานเบรก", created_at: TS, updated_at: TS },
    { product_attribute_id: 11, locale: "en", name: "Brake discs", created_at: TS, updated_at: TS },
    { product_attribute_id: 12, locale: "th", name: "กรอง", created_at: TS, updated_at: TS },
    { product_attribute_id: 12, locale: "en", name: "Filters", created_at: TS, updated_at: TS },
    { product_attribute_id: 13, locale: "th", name: "หัเทียน", created_at: TS, updated_at: TS },
    { product_attribute_id: 13, locale: "en", name: "Spark plugs", created_at: TS, updated_at: TS },
    { product_attribute_id: 14, locale: "th", name: "กรองอากาศ", created_at: TS, updated_at: TS },
    { product_attribute_id: 14, locale: "en", name: "Air filters", created_at: TS, updated_at: TS },
    { product_attribute_id: 15, locale: "th", name: "น้ำมันเกียร์", created_at: TS, updated_at: TS },
    { product_attribute_id: 15, locale: "en", name: "Gear oil", created_at: TS, updated_at: TS },
    { product_attribute_id: 16, locale: "th", name: "อะไหล่ตัวถัง", created_at: TS, updated_at: TS },
    { product_attribute_id: 16, locale: "en", name: "Body parts", created_at: TS, updated_at: TS },
    { product_attribute_id: 17, locale: "th", name: "กระจก", created_at: TS, updated_at: TS },
    { product_attribute_id: 17, locale: "en", name: "Glass", created_at: TS, updated_at: TS },
    { product_attribute_id: 18, locale: "th", name: "กันชน", created_at: TS, updated_at: TS },
    { product_attribute_id: 18, locale: "en", name: "Bumpers", created_at: TS, updated_at: TS },
    { product_attribute_id: 19, locale: "th", name: "กระจกหน้า", created_at: TS, updated_at: TS },
    { product_attribute_id: 19, locale: "en", name: "Windshield", created_at: TS, updated_at: TS },
    { product_attribute_id: 20, locale: "th", name: "กระจกมองข้าง", created_at: TS, updated_at: TS },
    { product_attribute_id: 20, locale: "en", name: "Side mirrors", created_at: TS, updated_at: TS },
    { product_attribute_id: 21, locale: "th", name: "ระบบไฟฟ้า", created_at: TS, updated_at: TS },
    { product_attribute_id: 21, locale: "en", name: "Electrical", created_at: TS, updated_at: TS },
    { product_attribute_id: 22, locale: "th", name: "แบตเตอรี่", created_at: TS, updated_at: TS },
    { product_attribute_id: 22, locale: "en", name: "Battery", created_at: TS, updated_at: TS },
    { product_attribute_id: 23, locale: "th", name: "แบตเตอรี่รถยนต์", created_at: TS, updated_at: TS },
    { product_attribute_id: 23, locale: "en", name: "Automotive battery", created_at: TS, updated_at: TS },
    { product_attribute_id: 24, locale: "th", name: "ผ้าเบรก", created_at: TS, updated_at: TS },
    { product_attribute_id: 24, locale: "en", name: "Brake pads", created_at: TS, updated_at: TS },
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
    { product_attribute_id: 1, related_id: 12 },
    { product_attribute_id: 2, related_id: 3 },
    { product_attribute_id: 2, related_id: 16 },
    { product_attribute_id: 2, related_id: 21 },
  ];
})(window);
