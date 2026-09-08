(function (global) {
  var TS = global.ADMIN_SEED_SHARED.TS;
  var staffAllowedCodes = [
    "product.product_list.view",
    "product.product_list.create",
    "product.product_list.update",
    "product.product_category.view",
    "member.member_user.view",
    "member.member_user.create",
    "order.order_purchase.view",
    "order.order_sales_claim.view",
    "warehouse.warehouse_list.view",
  ];
  var rows = [];
  global.SEED_ADMIN_PERMISSION.forEach(function (p) {
    rows.push({
      admin_role_id: 1,
      admin_permission_id: p.id,
      created_at: TS,
    });
    if (staffAllowedCodes.indexOf(p.code) >= 0) {
      rows.push({
        admin_role_id: 2,
        admin_permission_id: p.id,
        created_at: TS,
      });
    }
  });
  global.SEED_ADMIN_ROLE_PERMISSION = rows;
})(window);
