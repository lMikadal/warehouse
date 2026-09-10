(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_LIST = [
    Object.assign(
      {
        id: 1,
        sku: "P-LIST-001",
        product_brand_id: 1,
        product_category_id: 3,
        tag: "OEM,ทดสอบ",
        supplier_sku: "SUP-001",
        note: "",
        is_new: true,
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        sku: "P-LIST-002",
        product_brand_id: 2,
        product_category_id: 4,
        tag: "น้ำมัน",
        supplier_sku: "SUP-002",
        note: "",
        is_new: false,
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        sku: "P-LIST-003",
        product_brand_id: 1,
        product_category_id: 3,
        tag: "",
        supplier_sku: "",
        note: "Demo low stock",
        is_new: false,
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 4,
        sku: "P-LIST-004",
        product_brand_id: 2,
        product_category_id: 3,
        tag: "promo",
        supplier_sku: "SUP-004",
        note: "",
        is_new: true,
        is_active: false,
      },
      audit(1)
    ),
  ];
})(window);
