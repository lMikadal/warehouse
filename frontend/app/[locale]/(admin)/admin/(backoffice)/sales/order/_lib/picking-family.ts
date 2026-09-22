/**
 * One load of everything a picking screen needs about a slip family: the orders, the catalogue rows
 * behind their lines, the member header and the VAT rate. Both the picking desk and the payment
 * screen open on the same family, so they share this instead of each rebuilding it.
 */

import { fetchPickingFamily, type PickingOrderDetail } from "@/lib/order-picking-api";
import {
  fetchOrderSalesFormItemsByIds,
  fetchOrderSalesFormMember,
  fetchOrderSalesFormVat,
} from "@/lib/order-sales-form-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";

import type { PickingCustomerDisplay } from "../_shared/picking-panels";

export type PickingFamilyLoad = {
  orders: PickingOrderDetail[];
  root: PickingOrderDetail;
  productsById: Map<number, ProductItemBrowseRow>;
  customer: PickingCustomerDisplay;
  /** Financial-address credit limit of the member, or null when there is no member/limit. */
  creditLimit: number | null;
  vatPercent: number;
};

function creditLimitOf(
  addresses: { type?: string | null; credit_limit?: number | null }[] | undefined
): number | null {
  const financial = addresses?.find((a) => a.type === "financial");
  const limit = financial?.credit_limit;
  return limit != null && Number.isFinite(limit) ? Number(limit) : null;
}

export async function loadPickingFamily(
  locale: string,
  orderId: number
): Promise<PickingFamilyLoad> {
  const family = await fetchPickingFamily(orderId);
  if (family.orders.length === 0) throw new Error("empty picking family");

  const ids = family.orders
    .flatMap((o) => o.items)
    .map((i) => i.product_item_id ?? 0)
    .filter((id) => id > 0);
  const products = ids.length
    ? await fetchOrderSalesFormItemsByIds(locale, "orders", ids)
    : [];

  const root = family.orders.find((o) => o.parent_id == null) ?? family.orders[0];

  let memberSku = "";
  let memberFileId: number | null = null;
  let creditLimit: number | null = null;
  if (root.member_user_id && root.member_user_id > 0) {
    try {
      const member = await fetchOrderSalesFormMember(
        locale,
        "orders",
        root.member_user_id
      );
      memberSku = member.sku?.trim() ?? "";
      memberFileId = member.system_file_id ?? null;
      creditLimit = creditLimitOf(member.addresses);
    } catch {
      // A deleted member only costs the header its extras; picking still works.
    }
  }

  let vatPercent = root.vat_rate;
  try {
    const vat = await fetchOrderSalesFormVat(locale, "orders");
    vatPercent = Number(vat.rate) || 0;
  } catch {
    // Fall back to the rate frozen on the slip.
  }

  return {
    orders: family.orders,
    root,
    productsById: new Map(products.map((p) => [p.id, p])),
    customer: {
      name: root.member_name?.trim() ?? "",
      memberSku,
      tel: root.member_tel?.trim() ?? "",
      email: root.member_email?.trim() ?? "",
      preparedAt: root.created_at,
      deliveryAt: root.shipping?.received_at ?? null,
      sellerName: root.created_by_name?.trim() ?? "",
      imageFileId: memberFileId,
    },
    creditLimit,
    vatPercent,
  };
}
