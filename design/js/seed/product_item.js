(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_PRODUCT_ITEM = [
    Object.assign(
      {
        id: 1,
        product_list_id: 1,
        sku: "P-ITEM-001-A",
        barcode: "8851234567890",
        qrcode: "P-ITEM-001-A",
        price: 450,
        price_wholesale: 400,
        amount_wholesale_price: 1,
        vat_rate: 7,
        promotion: "ส่วนลด 10% เดือนมีนาคม (ตัวอย่าง)",
        unit: "piece",
        qty_per_unit: 1,
        weight: 0.45,
        width: 10,
        length: 10,
        height: 15,
        minimum_stock: 5,
        is_active: true,
        is_stopped: false,
        is_authentic: true,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        product_list_id: 1,
        sku: "P-ITEM-001-B",
        price: 890,
        unit: "set",
        qty_per_unit: 2,
        minimum_stock: 3,
        is_active: true,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 3,
        product_list_id: 2,
        sku: "P-ITEM-002-A",
        price: 1250.5,
        unit: "liter",
        qty_per_unit: 4,
        minimum_stock: 10,
        is_active: true,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 4,
        product_list_id: 2,
        sku: "P-ITEM-002-B",
        price: 620,
        unit: "piece",
        qty_per_unit: 1,
        minimum_stock: 8,
        is_active: true,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 5,
        product_list_id: 3,
        sku: "P-ITEM-003-A",
        price: 2100,
        unit: "pair",
        qty_per_unit: 1,
        minimum_stock: 20,
        is_active: true,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 6,
        product_list_id: 3,
        sku: "P-ITEM-003-B",
        price: 1800,
        unit: "pair",
        qty_per_unit: 1,
        minimum_stock: 10000,
        is_active: true,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 7,
        product_list_id: 4,
        sku: "P-ITEM-004-A",
        price: 320,
        unit: "piece",
        qty_per_unit: 4,
        minimum_stock: 5,
        is_active: false,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 8,
        product_list_id: 4,
        sku: "P-ITEM-004-B",
        price: 280,
        unit: "box",
        qty_per_unit: 10,
        minimum_stock: 2,
        is_active: false,
        is_stopped: false,
        type_price: "manual",
      },
      audit(1)
    ),
  ];
})(window);
