import type { TableSortDirection } from "@/lib/table-sort";

export type TreeSortableRow = {
  id: number;
  parent_id?: number | null;
  sort_order?: number | null;
  tree_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function compareCreatedAt<T extends TreeSortableRow>(a: T, b: T): number {
  const ca = a.created_at || "";
  const cb = b.created_at || "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return (a.id || 0) - (b.id || 0);
}

function compareTreeSibling<T extends TreeSortableRow>(a: T, b: T): number {
  const so = (a.sort_order || 0) - (b.sort_order || 0);
  if (so !== 0) return so;
  return (a.id || 0) - (b.id || 0);
}

export function treeDepth(treePath: string | null | undefined): number {
  if (!treePath) return 0;
  return String(treePath).split(".").length - 1;
}

/** DFS pre-order by parent_id groups (design crud-list flattenTreeRows). */
export function flattenTreeRows<T extends TreeSortableRow>(rows: T[]): T[] {
  const byParent: Record<string, T[]> = {};
  rows.forEach((r) => {
    const key = r.parent_id == null ? "root" : String(r.parent_id);
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(r);
  });
  Object.keys(byParent).forEach((key) => {
    byParent[key].sort(compareTreeSibling);
  });
  const out: T[] = [];
  const seen: Record<number, true> = {};
  function walk(parentKey: string) {
    (byParent[parentKey] || []).forEach((r) => {
      out.push(r);
      seen[r.id] = true;
      walk(String(r.id));
    });
  }
  walk("root");
  rows
    .filter((r) => !seen[r.id])
    .sort(compareTreeSibling)
    .forEach((r) => out.push(r));
  return out;
}

export function defaultSortRows<T extends TreeSortableRow>(rows: T[]): T[] {
  const copy = rows.slice();
  if (copy.some((r) => r.tree_path != null && r.tree_path !== "")) {
    return flattenTreeRows(copy);
  }
  if (copy.some((r) => r.sort_order != null)) {
    copy.sort((a, b) => {
      const so = (a.sort_order || 0) - (b.sort_order || 0);
      if (so !== 0) return so;
      return compareCreatedAt(a, b);
    });
    return copy;
  }
  copy.sort(compareCreatedAt);
  return copy;
}

function compareColumnValues(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  colId: string
): number {
  const va = a[colId];
  const vb = b[colId];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (typeof va === "boolean" || typeof vb === "boolean") {
    return (va ? 1 : 0) - (vb ? 1 : 0);
  }
  if (typeof va === "number" && typeof vb === "number") {
    return va - vb;
  }
  if (typeof va === "string" && typeof vb === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(va) && /^\d{4}-\d{2}-\d{2}/.test(vb)) {
      if (va !== vb) return va < vb ? -1 : 1;
      return 0;
    }
    return va.localeCompare(vb, undefined, { sensitivity: "base" });
  }
  return String(va).localeCompare(String(vb));
}

export function applyHeaderSort<T extends TreeSortableRow>(
  rows: T[],
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  rowForCompare: (row: T) => Record<string, unknown>
): T[] {
  if (!sortKey || !sortDir) return rows;
  const dir = sortDir === "desc" ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const cmp = compareColumnValues(rowForCompare(a), rowForCompare(b), sortKey);
    if (cmp !== 0) return cmp * dir;
    return compareCreatedAt(a, b);
  });
}

export function arrayMoveIds<T>(array: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= array.length) {
    return array.slice();
  }
  const next = array.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function sortableIndicesFromSource(
  source: unknown
): { from: number; to: number } | null {
  if (source == null || typeof source !== "object") return null;
  const rec = source as Record<string, unknown>;
  const from = rec.initialIndex;
  const to = rec.index;
  if (typeof from !== "number" || typeof to !== "number") return null;
  return { from, to };
}

/** Sortable drag end indices (replaces `@dnd-kit/helpers` `move` for id arrays). */
export function reorderIdsFromSortableEvent<T>(
  items: T[],
  event: { canceled?: boolean; operation?: { source?: unknown } }
): T[] | null {
  if (event.canceled) return null;
  const indices = sortableIndicesFromSource(event.operation?.source);
  if (!indices) return null;
  const { from, to } = indices;
  if (from === to || from < 0 || from >= items.length) return null;
  return arrayMoveIds(items, from, to);
}

export function findDragMoveIndices(
  before: number[],
  after: number[]
): { from: number; to: number } | null {
  const movedIds = before.filter(
    (id) => before.indexOf(id) !== after.indexOf(id)
  );
  if (movedIds.length !== 1) return null;
  const movedId = movedIds[0];
  return {
    from: before.indexOf(movedId),
    to: after.indexOf(movedId),
  };
}

/** Reorder flat sorted list; reassign sort_order on all rows (design crud-list, no sortParentKey). */
export function reorderFlatSortOrder<T extends TreeSortableRow>(
  allRows: T[],
  fullSorted: T[],
  absFrom: number,
  absTo: number,
  sameParentCheck: (a: T, b: T) => boolean
): T[] | null {
  if (absFrom === absTo) return null;
  const srcRow = fullSorted[absFrom];
  const dstRow = fullSorted[absTo];
  if (srcRow == null || dstRow == null) return null;
  if (!sameParentCheck(srcRow, dstRow)) return null;

  const reordered = fullSorted.slice();
  reordered.splice(absFrom, 1);
  reordered.splice(absTo, 0, srcRow);

  const orderById = new Map<number, number>();
  reordered.forEach((row, idx) => {
    orderById.set(row.id, (idx + 1) * 10);
  });

  const now = new Date().toISOString();
  let changed = false;
  const next = allRows.map((row) => {
    const newOrder = orderById.get(row.id);
    if (newOrder == null || newOrder === row.sort_order) return row;
    changed = true;
    return { ...row, sort_order: newOrder, updated_at: now };
  });
  return changed ? next : null;
}
