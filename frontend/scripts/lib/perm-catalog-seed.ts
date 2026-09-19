/** Mirrors design/js/seed/system_permission.js PERM_PAGES + id assignment. */

export const PERM_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "import",
  "export",
] as const;

export type PermAction = (typeof PERM_ACTIONS)[number];

export type PermPage = {
  permModule: string;
  type: string;
  resource: string;
};

export const PERM_PAGES: PermPage[] = [
  { permModule: "system", type: "system_menu", resource: "/api/v1/system/menus" },
  {
    permModule: "system",
    type: "system_permission",
    resource: "/api/v1/system/permissions",
  },
  {
    permModule: "admin",
    type: "admin_language",
    resource: "/api/v1/system/languages",
  },
  {
    permModule: "admin",
    type: "system_country",
    resource: "/api/v1/system/countries",
  },
  {
    permModule: "admin",
    type: "system_province",
    resource: "/api/v1/system/provinces",
  },
  {
    permModule: "admin",
    type: "system_district",
    resource: "/api/v1/system/districts",
  },
  {
    permModule: "admin",
    type: "system_sub_district",
    resource: "/api/v1/system/sub-districts",
  },
  { permModule: "admin", type: "admin_user", resource: "/api/v1/admin/users" },
  { permModule: "admin", type: "admin_role", resource: "/api/v1/admin/roles" },
  {
    permModule: "setting",
    type: "setting_bank",
    resource: "/api/v1/setting/banks",
  },
  { permModule: "setting", type: "setting_vat", resource: "/api/v1/setting/vat" },
  {
    permModule: "setting",
    type: "setting_payment_method",
    resource: "/api/v1/setting/payment-methods",
  },
  {
    permModule: "setting",
    type: "setting_sale_channel",
    resource: "/api/v1/setting/sale-channels",
  },
  {
    permModule: "setting",
    type: "setting_code",
    resource: "/api/v1/setting/codes",
  },
  {
    permModule: "setting",
    type: "setting_claim_reason",
    resource: "/api/v1/setting/claim-reasons",
  },
  {
    permModule: "setting",
    type: "setting_prefix",
    resource: "/api/v1/setting/prefixes",
  },
  {
    permModule: "supplier",
    type: "supplier_user",
    resource: "/api/v1/supplier/users",
  },
  {
    permModule: "location",
    type: "location_location",
    resource: "/api/v1/location/locations",
  },
  {
    permModule: "warehouse",
    type: "warehouse_list",
    resource: "/api/v1/warehouse/lists",
  },
  {
    permModule: "product",
    type: "product_list",
    resource: "/api/v1/product/lists",
  },
  {
    permModule: "product",
    type: "product_category",
    resource: "/api/v1/product/categories",
  },
  {
    permModule: "product",
    type: "product_brand",
    resource: "/api/v1/product/brands",
  },
  {
    permModule: "product",
    type: "product_car",
    resource: "/api/v1/product/cars",
  },
  {
    permModule: "member",
    type: "member_setting_credit",
    resource: "/api/v1/member/settings/credits",
  },
  {
    permModule: "member",
    type: "member_setting_group",
    resource: "/api/v1/member/settings/groups",
  },
  {
    permModule: "member",
    type: "member_setting_business",
    resource: "/api/v1/member/settings/businesses",
  },
  {
    permModule: "member",
    type: "member_tier",
    resource: "/api/v1/member/tiers",
  },
  { permModule: "member", type: "member_user", resource: "/api/v1/member/users" },
  {
    permModule: "order",
    type: "order_ticket",
    resource: "/api/v1/order/tickets",
  },
  {
    permModule: "order",
    type: "order_store",
    resource: "/api/v1/order/store-sales",
  },
  { permModule: "order", type: "order_order", resource: "/api/v1/order/orders" },
  {
    permModule: "order",
    type: "order_store_claim",
    resource: "/api/v1/order/store-claims",
  },
  {
    permModule: "order",
    type: "order_store_claim_list",
    resource: "/api/v1/order/store-claim-lists",
  },
  {
    permModule: "order",
    type: "order_purchase",
    resource: "/api/v1/order/purchases",
  },
  {
    permModule: "order",
    type: "order_compare",
    resource: "/api/v1/order/compares",
  },
  {
    permModule: "order",
    type: "order_receive",
    resource: "/api/v1/order/receives",
  },
  { permModule: "order", type: "order_claim", resource: "/api/v1/order/claims" },
  {
    permModule: "order",
    type: "order_sales_claim",
    resource: "/api/v1/order/sales-claims",
  },
];

const WAVE_START_ID: Record<string, number> = {
  "system.system_menu": 1,
  "system.system_permission": 7,
  "admin.admin_user": 13,
  "admin.admin_role": 19,
};

const PERM_METHOD: Record<PermAction, string> = {
  view: "GET",
  create: "POST",
  update: "PATCH",
  delete: "DELETE",
  import: "POST",
  export: "GET",
};

const GLOBAL_INACTIVE: Partial<Record<PermAction, boolean>> = {
  import: true,
  export: true,
};

export type PermissionRowSeed = {
  id: number;
  code: string;
  module: string;
  type: string;
  action: PermAction;
  resource: string;
  method: string;
  is_active: boolean;
};

export function buildPermissionCatalog(): {
  rows: PermissionRowSeed[];
  codeToId: Map<string, number>;
} {
  const rows: PermissionRowSeed[] = [];
  const codeToId = new Map<string, number>();
  let nextId = 25;

  for (const page of PERM_PAGES) {
    if (page.type === "setting_vat") {
      const vatPairs: { action: PermAction; id: number }[] = [
        { action: "view", id: 61 },
        { action: "update", id: 63 },
      ];
      for (const { action, id } of vatPairs) {
        const code = `${page.permModule}.${page.type}.${action}`;
        rows.push({
          id,
          code,
          module: page.permModule,
          type: page.type,
          action,
          resource: page.resource,
          method: PERM_METHOD[action],
          is_active: !GLOBAL_INACTIVE[action],
        });
        codeToId.set(code, id);
      }
      nextId = 67;
      continue;
    }

    if (page.type === "order_compare") {
      const comparePairs: { action: PermAction; id: number }[] = [
        { action: "view", id: 205 },
        { action: "update", id: 207 },
      ];
      for (const { action, id } of comparePairs) {
        const code = `${page.permModule}.${page.type}.${action}`;
        rows.push({
          id,
          code,
          module: page.permModule,
          type: page.type,
          action,
          resource: page.resource,
          method: PERM_METHOD[action],
          is_active: !GLOBAL_INACTIVE[action],
        });
        codeToId.set(code, id);
      }
      nextId = 211;
      continue;
    }

    const waveKey = `${page.permModule}.${page.type}`;
    let startId = WAVE_START_ID[waveKey];
    if (startId == null) {
      startId = nextId;
      nextId += PERM_ACTIONS.length;
    }

    let id = startId;
    for (const action of PERM_ACTIONS) {
      const code = `${page.permModule}.${page.type}.${action}`;
      rows.push({
        id,
        code,
        module: page.permModule,
        type: page.type,
        action,
        resource: page.resource,
        method: PERM_METHOD[action],
        is_active: !GLOBAL_INACTIVE[action],
      });
      codeToId.set(code, id);
      id++;
    }
  }

  return { rows, codeToId };
}

/** Rows for init/07 only (excludes wave ids 1–24 already in 02–05). */
export function catalogRowsFromId(minId: number): PermissionRowSeed[] {
  const { rows } = buildPermissionCatalog();
  return rows.filter((r) => r.id >= minId);
}
