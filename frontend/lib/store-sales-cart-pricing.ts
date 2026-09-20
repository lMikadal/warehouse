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
  locale: string,
  itemId: number,
  listPrice: number,
  discounts: MemberUserDiscountRow[],
  memberCreditId: number | null,
  tierDiscount: { discount: number; discount_type: string } | null
): Promise<PricingRow> {
  const todayYmd = localDateYmd(new Date());
  const md = pickMemberDiscount(itemId, discounts, memberCreditId, todayYmd);
  const row: PricingRow = {
    price: listPrice,
    // ponytail: browse API has no wholesale fields yet; upgrade when item browse adds them
    wholesale_price: null,
    amount_wholesale_price: null,
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
      locale,
      line.product.id,
      listPrice,
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
