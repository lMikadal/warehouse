(function (global) {
  var shared = global.ADMIN_SEED_SHARED;
  var TS = shared.TS;
  var ACTIONS = shared.ACTIONS;
  var METHOD = shared.METHOD;
  var GLOBAL_INACTIVE = shared.GLOBAL_INACTIVE;

  /** Leaf pages needing permission sets: { permModule, type, resource } */
  var PERM_PAGES = [
    { permModule: "admin", type: "admin_menu", resource: "/api/v1/admin/menus" },
    { permModule: "admin", type: "admin_permission", resource: "/api/v1/admin/permissions" },
    { permModule: "admin", type: "admin_language", resource: "/api/v1/website/languages" },
    { permModule: "admin", type: "website_country", resource: "/api/v1/website/countries" },
    { permModule: "admin", type: "website_province", resource: "/api/v1/website/provinces" },
    { permModule: "admin", type: "website_district", resource: "/api/v1/website/districts" },
    { permModule: "admin", type: "website_sub_district", resource: "/api/v1/website/sub-districts" },
    { permModule: "admin", type: "admin_user", resource: "/api/v1/admin/users" },
    { permModule: "admin", type: "admin_role", resource: "/api/v1/admin/roles" },
    { permModule: "setting", type: "setting_bank", resource: "/api/v1/setting/banks" },
    { permModule: "setting", type: "setting_vat", resource: "/api/v1/setting/vat" },
    { permModule: "setting", type: "setting_payment_method", resource: "/api/v1/setting/payment-methods" },
    { permModule: "setting", type: "setting_sale_channel", resource: "/api/v1/setting/sale-channels" },
    { permModule: "setting", type: "setting_code", resource: "/api/v1/setting/codes" },
    { permModule: "setting", type: "setting_claim_reason", resource: "/api/v1/setting/claim-reasons" },
    { permModule: "setting", type: "setting_prefix", resource: "/api/v1/setting/prefixes" },
    { permModule: "supplier", type: "supplier_user", resource: "/api/v1/supplier/users" },
    { permModule: "location", type: "location_location", resource: "/api/v1/location/locations" },
    { permModule: "warehouse", type: "warehouse_list", resource: "/api/v1/warehouse/lists" },
    { permModule: "product", type: "product_list", resource: "/api/v1/product/lists" },
    { permModule: "product", type: "product_category", resource: "/api/v1/product/categories" },
    { permModule: "product", type: "product_brand", resource: "/api/v1/product/brands" },
    { permModule: "product", type: "product_car", resource: "/api/v1/product/cars" },
    { permModule: "member", type: "member_setting_credit", resource: "/api/v1/member/settings/credits" },
    { permModule: "member", type: "member_setting_group", resource: "/api/v1/member/settings/groups" },
    { permModule: "member", type: "member_setting_business", resource: "/api/v1/member/settings/businesses" },
    { permModule: "member", type: "member_tier", resource: "/api/v1/member/tiers" },
    { permModule: "member", type: "member_user", resource: "/api/v1/member/users" },
    { permModule: "order", type: "order_ticket", resource: "/api/v1/order/tickets" },
    { permModule: "order", type: "order_store", resource: "/api/v1/order/store-sales" },
    { permModule: "order", type: "order_order", resource: "/api/v1/order/orders" },
    { permModule: "order", type: "order_store_claim", resource: "/api/v1/order/store-claims" },
    { permModule: "order", type: "order_store_claim_list", resource: "/api/v1/order/store-claim-lists" },
    { permModule: "order", type: "order_purchase", resource: "/api/v1/order/purchases" },
    { permModule: "order", type: "order_compare", resource: "/api/v1/order/compares" },
    { permModule: "order", type: "order_receive", resource: "/api/v1/order/receives" },
    { permModule: "order", type: "order_claim", resource: "/api/v1/order/claims" },
    { permModule: "order", type: "order_sales_claim", resource: "/api/v1/order/sales-claims" },
  ];

  var rows = [];
  var codeToId = {};
  var nextPermId = 1;

  PERM_PAGES.forEach(function (page) {
    ACTIONS.forEach(function (action) {
      var code = page.permModule + "." + page.type + "." + action;
      var row = {
        id: nextPermId,
        code: code,
        module: page.permModule,
        type: page.type,
        action: action,
        resource: page.resource,
        method: METHOD[action],
        is_active: !GLOBAL_INACTIVE[action],
        created_at: TS,
        updated_at: TS,
        deleted_at: null,
        created_by: 1,
        updated_by: 1,
      };
      rows.push(row);
      codeToId[code] = nextPermId;
      nextPermId += 1;
    });
  });

  global.ADMIN_PERM_PAGES = PERM_PAGES;
  global.ADMIN_PERM_CODE_TO_ID = codeToId;
  global.SEED_ADMIN_PERMISSION = rows;
})(window);
