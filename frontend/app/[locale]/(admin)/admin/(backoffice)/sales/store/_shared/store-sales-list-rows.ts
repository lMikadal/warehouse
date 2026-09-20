const FAMILY_SKU_RE = /^(PJB-\d{6}-\d+)(?:-\d+)?$/;

export function familySku(sku: string): string {
  const m = FAMILY_SKU_RE.exec(sku);
  return m?.[1] ?? sku;
}

export function formatFamilySplitSku(base: string, siblingIndex: number): string {
  return `${base}-${String(siblingIndex).padStart(2, "0")}`;
}

export type ListRowKind = "parent" | "child";

export type FlattenRow<T extends { id: number }> = T & {
  kind: ListRowKind;
  parentIndex: number;
};

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
