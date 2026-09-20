import {
  fetchTierById,
  type MemberTierRelation,
  type TierScopeType,
} from "@/lib/member-tier-api";
import {
  loadMemberSettingRelationsForUser,
  resolveMemberSettingRelationIdForCredit,
} from "@/lib/member-user-relations";
import {
  fetchMemberUser,
  type MemberUserDiscountRow,
} from "@/lib/member-user-api";
import {
  exportOrderCompareRules,
  type OrderCompareExportRow,
} from "@/lib/order-compare-api";
import {
  fetchAllActiveCategories,
  pathFromId,
  type ProductAttributeRow,
} from "@/lib/product-category-cascade";
import {
  fetchProductItems,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import type { DisplayLocale } from "@/lib/format-datetime";

/** Matches store sales form cart lines used for repricing. */
export type StoreSalesCartLineForPricing = {
  key: string;
  type: "item" | "compare";
  qty: number;
  unitPrice: number;
  discount: number;
  detail?: string;
  product?: ProductItemBrowseRow;
};

type PricingRow = {
  price: number;
  wholesale_price: number | null;
  amount_wholesale_price: number | null;
  member_discount: number;
  member_discount_type: string | null;
  member_discount_minimum_order: number | null;
  member_discount_tier: number;
  member_discount_tier_type: string | null;
};

type DiscountVal = { discount: number; discount_type: string };

type RepriceContext = {
  discounts: MemberUserDiscountRow[];
  memberCreditId: number | null;
  settingRelationId: number | null;
  tierRelations: MemberTierRelation[];
  tierActive: boolean;
  discountRuleIndex: Map<string, DiscountVal>;
  categories: ProductAttributeRow[];
};

function roundMoney2(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function localDateYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function discountDateActive(row: MemberUserDiscountRow, todayYmd: string) {
  if (row.is_active === false) return false;
  const start = row.date_start ? String(row.date_start).slice(0, 10) : null;
  const end = row.date_end ? String(row.date_end).slice(0, 10) : null;
  if (start && todayYmd < start) return false;
  if (end && todayYmd > end) return false;
  return true;
}

function pickMemberDiscount(
  itemId: number,
  discounts: MemberUserDiscountRow[],
  memberCreditId: number | null,
  todayYmd: string
): MemberUserDiscountRow | null {
  const candidates = discounts.filter(
    (r) =>
      r.product_item_id === itemId && discountDateActive(r, todayYmd)
  );
  if (!candidates.length) return null;
  const exact = candidates.filter(
    (r) => memberCreditId && r.member_credit_id === memberCreditId
  );
  let pool = exact.length
    ? exact
    : candidates.filter((r) => r.member_credit_id == null);
  if (!pool.length) pool = candidates;
  pool.sort((a, b) => {
    const ac = memberCreditId && a.member_credit_id === memberCreditId ? 1 : 0;
    const bc = memberCreditId && b.member_credit_id === memberCreditId ? 1 : 0;
    return bc - ac || (b.id || 0) - (a.id || 0);
  });
  return pool[0] ?? null;
}

export function categoryIdsLeafFirst(
  categories: ProductAttributeRow[],
  categoryId: number | null | undefined
): number[] {
  const path = pathFromId(categories, categoryId ?? null);
  return [...path].reverse();
}

function discountRuleKey(
  brandId: number,
  categoryId: number | null,
  relationId: number
): string {
  return `${brandId}:${categoryId ?? "null"}:${relationId}`;
}

export function buildDiscountRuleIndex(
  rules: OrderCompareExportRow[]
): Map<string, DiscountVal> {
  const map = new Map<string, DiscountVal>();
  for (const r of rules) {
    if (!Number.isFinite(r.discount) || r.discount <= 0) continue;
    map.set(
      discountRuleKey(r.brand_id, r.category_id ?? null, r.member_setting_relation_id),
      {
        discount: r.discount,
        discount_type: r.discount_type || "percent",
      }
    );
  }
  return map;
}

function tierRelationMatchesProduct(
  rel: MemberTierRelation,
  product: ProductItemBrowseRow | undefined
): boolean {
  const brandId = product?.product_brand_id;
  const categoryId = product?.product_category_id;
  const attrs = new Set(rel.attribute_ids ?? []);
  const type = rel.type as TierScopeType;
  switch (type) {
    case "all":
      return true;
    case "brand":
      return brandId != null && brandId > 0 && attrs.has(brandId);
    case "category":
      return categoryId != null && categoryId > 0 && attrs.has(categoryId);
    case "except_brand":
      return brandId == null || brandId <= 0 || !attrs.has(brandId);
    case "except_category":
      return categoryId == null || categoryId <= 0 || !attrs.has(categoryId);
    default:
      return false;
  }
}

export function pickTierRelationDiscount(
  relations: MemberTierRelation[],
  settingRelationId: number | null,
  cartSubtotal: number,
  product: ProductItemBrowseRow | undefined
): DiscountVal | null {
  if (settingRelationId == null || settingRelationId <= 0) return null;
  const sub = Number.isFinite(cartSubtotal) ? cartSubtotal : 0;
  const rel = relations.find(
    (r) =>
      r.member_setting_relation_id === settingRelationId &&
      Number.isFinite(r.discount) &&
      r.discount > 0 &&
      sub >= r.purchase_start &&
      sub <= r.purchase_end &&
      tierRelationMatchesProduct(r, product)
  );
  if (!rel) return null;
  return {
    discount: rel.discount,
    discount_type: rel.discount_type || "percent",
  };
}

export function pickCatalogDiscountRule(
  index: Map<string, DiscountVal>,
  categories: ProductAttributeRow[],
  product: ProductItemBrowseRow | undefined,
  settingRelationId: number | null
): DiscountVal | null {
  const brandId = product?.product_brand_id;
  if (
    settingRelationId == null ||
    settingRelationId <= 0 ||
    brandId == null ||
    brandId <= 0
  ) {
    return null;
  }
  for (const catId of categoryIdsLeafFirst(
    categories,
    product.product_category_id
  )) {
    const hit = index.get(discountRuleKey(brandId, catId, settingRelationId));
    if (hit) return hit;
  }
  return index.get(discountRuleKey(brandId, null, settingRelationId)) ?? null;
}

function isWholesale(row: PricingRow, qty: number) {
  const q = Number.isFinite(qty) ? qty : 0;
  return (
    row.wholesale_price != null &&
    row.amount_wholesale_price != null &&
    q >= row.amount_wholesale_price
  );
}

function unitPrice(row: PricingRow, qty: number) {
  if (isWholesale(row, qty)) return Number(row.wholesale_price) || 0;
  return Number(row.price) || 0;
}

function amountFromType(
  type: string | null,
  discount: number,
  qty: number,
  unit: number
) {
  if (type !== "percent" && type !== "baht") return 0;
  if (!Number.isFinite(discount) || discount <= 0) return 0;
  if (type === "percent") return roundMoney2((qty * unit * discount) / 100);
  return roundMoney2(qty * discount);
}

function lineWholesaleDiscount(row: PricingRow, qty: number) {
  if (!isWholesale(row, qty)) return 0;
  const list = Number(row.price) || 0;
  const wh = Number(row.wholesale_price) || 0;
  const perUnit = list - wh;
  if (!Number.isFinite(perUnit) || perUnit <= 0) return 0;
  return roundMoney2((Number.isFinite(qty) ? qty : 0) * perUnit);
}

function lineMemberDiscount(row: PricingRow, qty: number) {
  const q = Number.isFinite(qty) ? qty : 0;
  if (isWholesale(row, q)) return 0;
  const type = row.member_discount_type;
  const discount = Number(row.member_discount);
  if (
    (type === "percent" || type === "baht") &&
    Number.isFinite(discount) &&
    discount > 0
  ) {
    const min = row.member_discount_minimum_order;
    if (min != null && Number.isFinite(min) && q < min) return 0;
    return amountFromType(type, discount, q, unitPrice(row, q));
  }
  return amountFromType(
    row.member_discount_tier_type,
    Number(row.member_discount_tier),
    q,
    unitPrice(row, q)
  );
}

function lineTotalDiscount(row: PricingRow, qty: number) {
  return roundMoney2(
    lineWholesaleDiscount(row, qty) + lineMemberDiscount(row, qty)
  );
}

async function refreshLineProduct(
  locale: string,
  line: StoreSalesCartLineForPricing
): Promise<ProductItemBrowseRow | undefined> {
  const base = line.product;
  const itemId = base?.id;
  if (!itemId) return base;

  async function mergeHit(hit: ProductItemBrowseRow | undefined) {
    if (!hit) return base;
    return { ...base, ...hit, id: itemId };
  }

  const sku = base.sku?.trim();
  if (sku) {
    const res = await fetchProductItems(locale, {
      page: 1,
      limit: 10,
      search: sku,
      isActive: true,
    });
    const hit = res.items.find((r) => r.id === itemId);
    return mergeHit(hit);
  }
  const res = await fetchProductItems(locale, {
    page: 1,
    limit: 100,
    isActive: true,
  });
  const hit = res.items.find((r) => r.id === itemId);
  return mergeHit(hit);
}

function buildPricingRow(
  itemId: number,
  listPrice: number,
  product: ProductItemBrowseRow | undefined,
  ctx: RepriceContext,
  cartSubtotal: number
): PricingRow {
  const todayYmd = localDateYmd(new Date());
  const md = pickMemberDiscount(
    itemId,
    ctx.discounts,
    ctx.memberCreditId,
    todayYmd
  );
  const wh = product?.price_wholesale;
  const minWh = product?.amount_price_wholesale;
  const row: PricingRow = {
    price: listPrice,
    wholesale_price:
      wh != null && Number.isFinite(wh) && wh > 0 ? wh : null,
    amount_wholesale_price:
      minWh != null && Number.isFinite(minWh) && minWh > 0
        ? Math.trunc(minWh)
        : null,
    member_discount: 0,
    member_discount_type: null,
    member_discount_minimum_order: null,
    member_discount_tier: 0,
    member_discount_tier_type: null,
  };

  let fallback: DiscountVal | null = null;
  if (!md) {
    if (ctx.tierActive) {
      fallback = pickTierRelationDiscount(
        ctx.tierRelations,
        ctx.settingRelationId,
        cartSubtotal,
        product
      );
    }
    if (!fallback) {
      fallback = pickCatalogDiscountRule(
        ctx.discountRuleIndex,
        ctx.categories,
        product,
        ctx.settingRelationId
      );
    }
  }

  if (md) {
    row.member_discount = Number(md.discount) || 0;
    row.member_discount_type = md.discount_type || null;
    const minQ = Number(md.minimum_qty);
    row.member_discount_minimum_order =
      Number.isFinite(minQ) && minQ > 0 ? minQ : null;
  } else if (fallback) {
    row.member_discount_tier = fallback.discount;
    row.member_discount_tier_type = fallback.discount_type || "percent";
  }
  return row;
}

async function loadRepriceContext(
  locale: string,
  memberUserId: number | null,
  creditId: string
): Promise<RepriceContext> {
  const memberCreditId = creditId ? Number(creditId) : null;
  const empty: RepriceContext = {
    discounts: [],
    memberCreditId,
    settingRelationId: null,
    tierRelations: [],
    tierActive: false,
    discountRuleIndex: new Map(),
    categories: [],
  };
  if (!memberUserId || memberUserId <= 0) return empty;

  const member = await fetchMemberUser(locale, memberUserId);
  const relationRows = await loadMemberSettingRelationsForUser(
    locale,
    member.setting_relation_ids ?? []
  );
  const settingRelationId = resolveMemberSettingRelationIdForCredit(
    member.setting_relation_ids ?? [],
    relationRows,
    creditId
  );

  let tierRelations: MemberTierRelation[] = [];
  let tierActive = false;
  if (member.member_tier_id) {
    try {
      const tier = await fetchTierById(locale, member.member_tier_id);
      tierActive = tier.is_active !== false;
      tierRelations = tier.relations ?? [];
    } catch {
      tierRelations = [];
      tierActive = false;
    }
  }

  const [rules, categories] = await Promise.all([
    exportOrderCompareRules(locale),
    fetchAllActiveCategories(locale as DisplayLocale),
  ]);

  return {
    discounts: member.discounts ?? [],
    memberCreditId,
    settingRelationId,
    tierRelations,
    tierActive,
    discountRuleIndex: buildDiscountRuleIndex(rules),
    categories,
  };
}

/**
 * Re-price item lines for the selected member/credit; compare lines unchanged.
 */
export async function repriceStoreSalesCartLines(
  locale: string,
  lines: StoreSalesCartLineForPricing[],
  memberUserId: number | null,
  creditId: string
): Promise<StoreSalesCartLineForPricing[]> {
  const ctx = await loadRepriceContext(locale, memberUserId, creditId);

  type Prepared = {
    line: StoreSalesCartLineForPricing;
    listPrice: number;
    product: ProductItemBrowseRow;
  };
  const prepared: Prepared[] = [];

  for (const line of lines) {
    if (line.type !== "item" || !line.product?.id) continue;
    const product = (await refreshLineProduct(locale, line)) ?? line.product;
    const listPrice = Number(product.price) || line.unitPrice;
    prepared.push({ line, listPrice, product });
  }

  const cartSubtotal = roundMoney2(
    prepared.reduce((sum, p) => sum + p.line.qty * p.listPrice, 0)
  );

  const preparedByKey = new Map(prepared.map((p) => [p.line.key, p]));

  const out: StoreSalesCartLineForPricing[] = [];
  for (const line of lines) {
    if (line.type !== "item" || !line.product?.id) {
      out.push(line);
      continue;
    }
    const prep = preparedByKey.get(line.key);
    if (!prep) {
      out.push(line);
      continue;
    }
    const { listPrice, product } = prep;
    const pricingRow = buildPricingRow(
      product.id,
      listPrice,
      product,
      ctx,
      cartSubtotal
    );
    const qty = line.qty;
    const unit = unitPrice(pricingRow, qty);
    const discount = lineTotalDiscount(pricingRow, qty);
    out.push({
      ...line,
      unitPrice: unit,
      discount,
      product: { ...product, price: listPrice },
    });
  }
  return out;
}

export type StoreSalesPriceSummaryLine = {
  qty: number;
  listPrice: number;
  discount: number;
};

export type StoreSalesPriceSummary = {
  itemsTotal: number;
  discountTotal: number;
  shipping: number;
  vatAmount: number;
  grandTotal: number;
  netTotal: number;
};

/** VAT extracted from tax-inclusive subtotal (design order-cart.extractVat). */
export function extractVatFromInclusive(inc: number, pct: number): number {
  if (!Number.isFinite(inc) || inc <= 0) return 0;
  const rate = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  if (rate === 0) return 0;
  return roundMoney2((inc * rate) / (100 + rate));
}

/** Document panel totals (design orderCart.priceSummary). */
export function computeStoreSalesPriceSummary(
  lines: StoreSalesPriceSummaryLine[],
  vatPercent: number,
  shipping = 0
): StoreSalesPriceSummary {
  const ship = roundMoney2(shipping);
  const itemsTotal = roundMoney2(
    lines.reduce(
      (sum, line) => sum + line.qty * (Number(line.listPrice) || 0),
      0
    )
  );
  const discountTotal = roundMoney2(
    lines.reduce((sum, line) => sum + (Number(line.discount) || 0), 0)
  );
  const inc = roundMoney2(itemsTotal - discountTotal + ship);
  const vatBase = roundMoney2(itemsTotal - discountTotal);
  const vatAmount = extractVatFromInclusive(vatBase, vatPercent);
  return {
    itemsTotal,
    discountTotal,
    shipping: ship,
    grandTotal: roundMoney2(inc - vatAmount),
    vatAmount,
    netTotal: inc,
  };
}

/** Available units for browse/add (design cart.availableStock). */
export function browseAvailableStock(product: {
  available_stock?: number;
  total_stock?: number;
}): number {
  const raw = product.available_stock ?? product.total_stock ?? 0;
  return Math.max(0, Math.trunc(Number(raw) || 0));
}

export function canAddProductFromBrowse(product: {
  available_stock?: number;
  total_stock?: number;
}): boolean {
  return browseAvailableStock(product) >= 1;
}

/** Max cart qty when stock is known; `0` = out of stock, `null` = no cap. */
export function cartLineMaxQty(
  product: { available_stock?: number; total_stock?: number } | undefined
): number | null {
  if (!product) return null;
  const raw = product.available_stock ?? product.total_stock;
  if (raw == null || !Number.isFinite(raw)) return null;
  const stock = Math.trunc(raw);
  if (stock < 1) return 0;
  return stock;
}

/** Clamp cart line qty to [1, maxStock] when stock is known (design parseQty). */
export function clampCartItemQty(
  raw: number,
  fallback: number,
  maxStock: number | null
): number {
  let qty = Number.isFinite(raw) ? Math.trunc(raw) : fallback;
  if (!Number.isFinite(qty) || qty < 1) qty = Math.max(1, fallback);
  if (maxStock != null && maxStock >= 1) qty = Math.min(qty, maxStock);
  return qty;
}

/** Build summary lines from cart item rows (list price × qty, line discount). */
export function summaryLinesFromCartItems(
  lines: StoreSalesCartLineForPricing[]
): StoreSalesPriceSummaryLine[] {
  return lines
    .filter((l) => l.type === "item")
    .map((l) => ({
      qty: l.qty,
      listPrice: l.product?.price ?? l.unitPrice,
      discount: l.discount,
    }));
}

// ponytail: self-check — `STORE_SALES_PRICING_SELF_CHECK=1 bun --cwd frontend run …` on this module
if (typeof process !== "undefined" && process.env.STORE_SALES_PRICING_SELF_CHECK) {
  const empty = computeStoreSalesPriceSummary([], 7, 0);
  if (empty.netTotal !== 0 || empty.itemsTotal !== 0) {
    throw new Error("empty priceSummary");
  }
  const one = computeStoreSalesPriceSummary(
    [{ qty: 1, listPrice: 115, discount: 0 }],
    7,
    0
  );
  if (one.netTotal !== 115 || one.vatAmount !== 7.52) {
    throw new Error("sample priceSummary");
  }
  if (clampCartItemQty(99, 1, 15) !== 15) throw new Error("clampCartItemQty");
  if (clampCartItemQty(0, 3, 15) !== 3) throw new Error("clampCartItemQty min");
  if (cartLineMaxQty({ available_stock: 0 }) !== 0) {
    throw new Error("cartLineMaxQty zero stock");
  }
  if (!canAddProductFromBrowse({ available_stock: 0 })) {
    /* ok */
  } else {
    throw new Error("canAddProductFromBrowse");
  }

  const relId = resolveMemberSettingRelationIdForCredit(
    [3, 1, 2],
    [
      { id: 1, business_id: 1, credit_id: 2, group_id: 1 },
      { id: 2, business_id: 1, credit_id: 1, group_id: 1 },
      { id: 3, business_id: 1, credit_id: 1, group_id: 2 },
    ],
    "1"
  );
  if (relId !== 2) throw new Error("resolveMemberSettingRelationIdForCredit");

  const categories: ProductAttributeRow[] = [
    {
      id: 1,
      parent_id: null,
      sort_order: 0,
      name: "root",
      is_active: true,
      updated_at: "",
    },
    {
      id: 2,
      parent_id: 1,
      sort_order: 0,
      name: "child",
      is_active: true,
      updated_at: "",
    },
  ];
  if (categoryIdsLeafFirst(categories, 2).join(",") !== "2,1") {
    throw new Error("categoryIdsLeafFirst");
  }

  const ruleIndex = buildDiscountRuleIndex([
    {
      id: 1,
      brand_id: 10,
      brand_name: "B",
      category_id: 1,
      category_name: "root",
      member_setting_relation_id: 5,
      discount: 3,
      discount_type: "percent",
      updated_at: "",
    },
    {
      id: 2,
      brand_id: 10,
      brand_name: "B",
      category_id: 2,
      category_name: "child",
      member_setting_relation_id: 5,
      discount: 7,
      discount_type: "percent",
      updated_at: "",
    },
  ]);
  const leafRule = pickCatalogDiscountRule(
    ruleIndex,
    categories,
    { id: 1, product_brand_id: 10, product_category_id: 2 } as ProductItemBrowseRow,
    5
  );
  if (leafRule?.discount !== 7) throw new Error("discount_rule deepest first");

  const tierRel: MemberTierRelation = {
    id: 1,
    member_setting_relation_id: 5,
    purchase_start: 0,
    purchase_end: 999999,
    discount: 4,
    discount_type: "percent",
    type: "all",
    is_promotion: false,
    updated_at: "",
  };
  const tierDisc = pickTierRelationDiscount([tierRel], 5, 100, {
    id: 1,
  } as ProductItemBrowseRow);
  if (tierDisc?.discount !== 4) throw new Error("tier relation pick");

  const wholesaleRow: PricingRow = {
    price: 10,
    wholesale_price: 8,
    amount_wholesale_price: 100,
    member_discount: 5,
    member_discount_type: "percent",
    member_discount_minimum_order: null,
    member_discount_tier: 0,
    member_discount_tier_type: null,
  };
  if (lineMemberDiscount(wholesaleRow, 100) !== 0) {
    throw new Error("wholesale zeroes member discount");
  }

  const memberCtx: RepriceContext = {
    discounts: [
      {
        id: 1,
        product_item_id: 1,
        minimum_qty: 10,
        discount: 5,
        discount_type: "percent",
        member_credit_id: null,
      },
    ],
    memberCreditId: 1,
    settingRelationId: null,
    tierRelations: [],
    tierActive: false,
    discountRuleIndex: new Map(),
    categories: [],
  };
  const memberRow = buildPricingRow(
    1,
    10,
    { id: 1 } as ProductItemBrowseRow,
    memberCtx,
    120
  );
  if (lineMemberDiscount(memberRow, 12) !== 6) {
    throw new Error("member user discount at qty 12");
  }
  if (lineMemberDiscount(memberRow, 9) !== 0) {
    throw new Error("member user discount below min qty");
  }
}
