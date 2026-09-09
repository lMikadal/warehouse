(function (global) {
  var audit = global.ADMIN_SEED_SHARED.audit;
  global.SEED_SUPPLIER_USER = [
    Object.assign(
      {
        id: 1,
        sku: "SUP001",
        credit_term: 30,
        credit_term_note: "ชำระภายใน 30 วันหลังรับใบแจ้งหนี้",
        is_active: true,
      },
      audit(1)
    ),
    Object.assign(
      {
        id: 2,
        sku: "SUP002",
        credit_term: 15,
        credit_term_note: "",
        is_active: true,
      },
      audit(2)
    ),
    Object.assign(
      {
        id: 3,
        sku: "SUP003",
        credit_term: null,
        credit_term_note: "เงินสด",
        is_active: true,
      },
      audit(3)
    ),
    Object.assign(
      {
        id: 4,
        sku: "SUP004",
        credit_term: 45,
        credit_term_note: "",
        is_active: false,
      },
      audit(4)
    ),
  ];
})(window);
