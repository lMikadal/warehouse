import type {
  StoreSalesListItem,
  StoreSalesStatus,
} from "@/lib/order-store-api";

const FAMILY_SKU_RE = /^(PJB-\d{6}-\d+)(?:-\d+)?$/;

export function familySku(sku: string): string {
  const m = FAMILY_SKU_RE.exec(sku);
  return m?.[1] ?? sku;
}

export function formatFamilySplitSku(base: string, siblingIndex: number): string {
  return `${base}-${String(siblingIndex).padStart(2, "0")}`;
}

export function storeSalesFamilyContext(detail: {
  id: number;
  status: StoreSalesStatus;
  parent_id?: number | null;
  family?: StoreSalesListItem[];
}): {
  rootId: number;
  members: StoreSalesListItem[];
  rootWaiting: boolean;
} {
  const members = detail.family ?? [];
  const rootId = detail.parent_id ?? detail.id;
  const root =
    members.find((m) => m.id === rootId) ??
    ({
      id: rootId,
      status: detail.status,
      parent_id: null,
      item_count: 0,
      total_price: 0,
      child_count: 0,
      created_at: "",
    } satisfies StoreSalesListItem);
  const rootWaiting =
    root.status === "pending" && (root.parent_id == null || root.parent_id === undefined);
  return { rootId, members, rootWaiting };
}

export function canStartAnotherStoreSalesSlip(
  canCreate: boolean,
  addonCreate: boolean,
  rootWaiting: boolean,
  members: StoreSalesListItem[]
): boolean {
  if (!canCreate || addonCreate || !rootWaiting) return false;
  return !members.some((m) => m.status === "draft");
}

export type ListRowKind = "parent" | "child";

export type FlattenRow<T extends { id: number }> = T & {
  kind: ListRowKind;
  parentIndex: number;
};

/** Root + addon slips for expanded list rows (API `family` order: created_at, id). */
export function familySlipsForExpand(
  _parentId: number,
  family?: StoreSalesListItem[]
): StoreSalesListItem[] {
  return family?.length ? [...family] : [];
}

export type FamilySlipSelectOption = { value: string; label: string };

export function familySlipSelectOptions(
  members: StoreSalesListItem[],
  rootId: number
): FamilySlipSelectOption[] {
  if (members.length === 0) return [];
  const sorted = [...members].sort((a, b) => {
    const ta = a.created_at ?? "";
    const tb = b.created_at ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.id - b.id;
  });
  const root = sorted.find((m) => m.id === rootId) ?? sorted[0];
  const base = root?.sku?.trim() ? familySku(root.sku) : "";
  return sorted.map((m, index) => {
    const label =
      m.sku?.trim() ||
      (base ? formatFamilySplitSku(base, index + 1) : String(m.id));
    return { value: String(m.id), label };
  });
}

export function flattenListRows<T extends { id: number }>(
  parents: T[],
  expandedIds: ReadonlySet<number>,
  childrenByParent: Record<number, T[]>
): FlattenRow<T>[] {
  const out: FlattenRow<T>[] = [];
  for (const [parentIndex, p] of parents.entries()) {
    out.push({ ...p, kind: "parent", parentIndex });
    if (!expandedIds.has(p.id)) continue;
    for (const c of childrenByParent[p.id] ?? []) {
      out.push({ ...c, kind: "child", parentIndex });
    }
  }
  return out;
}
