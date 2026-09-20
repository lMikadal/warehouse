import { fetchTierById } from "@/lib/member-tier-api";
import {
  fetchMemberUser,
  type MemberUserDiscountRow,
} from "@/lib/member-user-api";
import {
  fetchProductItems,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";

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

async function refreshBrowsePrice(
  locale: string,
  line: StoreSalesCartLineForPricing
): Promise<number> {
  const itemId = line.product?.id;
  if (!itemId) return line.unitPrice;
  const sku = line.product?.sku?.trim();
  if (sku) {
    const res = await fetchProductItems(locale, {
      page: 1,
      limit: 10,
      search: sku,
      isActive: true,
    });
    const hit = res.items.find((r) => r.id === itemId);
    if (hit) return hit.price ?? 0;
  }
  const res = await fetchProductItems(locale, {
    page: 1,
    limit: 100,
    isActive: true,
  });
  const hit = res.items.find((r) => r.id === itemId);
  return hit?.price ?? line.unitPrice;
}

async function buildPricingRow(
  itemId: number,
  listPrice: number,
  product: ProductItemBrowseRow | undefined,
  discounts: MemberUserDiscountRow[],
  memberCreditId: number | null,
  tierDiscount: { discount: number; discount_type: string } | null
): Promise<PricingRow> {
  const todayYmd = localDateYmd(new Date());
  const md = pickMemberDiscount(itemId, discounts, memberCreditId, todayYmd);
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
  if (md) {
    row.member_discount = Number(md.discount) || 0;
    row.member_discount_type = md.discount_type || null;
    const minQ = Number(md.minimum_qty);
    row.member_discount_minimum_order =
      Number.isFinite(minQ) && minQ > 0 ? minQ : null;
  } else if (tierDiscount) {
    row.member_discount_tier = tierDiscount.discount;
    row.member_discount_tier_type = tierDiscount.discount_type || "percent";
  }
  return row;
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
  const memberCreditId = creditId ? Number(creditId) : null;
  let discounts: MemberUserDiscountRow[] = [];
  let tierDiscount: { discount: number; discount_type: string } | null = null;

  if (memberUserId && memberUserId > 0) {
    const member = await fetchMemberUser(locale, memberUserId);
    discounts = member.discounts ?? [];
    if (member.member_tier_id) {
      try {
        const tier = await fetchTierById(locale, member.member_tier_id);
        if (
          tier.is_active !== false &&
          tier.type === "all" &&
          Number.isFinite(tier.discount) &&
          tier.discount > 0
        ) {
          tierDiscount = {
            discount: tier.discount,
            discount_type: tier.discount_type || "percent",
          };
        }
      } catch {
        tierDiscount = null;
      }
    }
  }

  const out: StoreSalesCartLineForPricing[] = [];
  for (const line of lines) {
    if (line.type !== "item" || !line.product?.id) {
      out.push(line);
      continue;
    }
    const listPrice = await refreshBrowsePrice(locale, line);
    const pricingRow = await buildPricingRow(
      line.product.id,
      listPrice,
      line.product,
      discounts,
      memberCreditId,
      tierDiscount
    );
    const qty = line.qty;
    const unit = unitPrice(pricingRow, qty);
    const discount = lineTotalDiscount(pricingRow, qty);
    out.push({
      ...line,
      unitPrice: unit,
      discount,
      product: line.product
        ? { ...line.product, price: listPrice }
        : line.product,
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

// ponytail: self-check — run via `bun -e "import './frontend/lib/store-sales-cart-pricing.ts'"` if needed
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
}
