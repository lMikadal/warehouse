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

/** Page-local drag indices: prefer before/after diff, fall back to sortable event source. */
export function resolvePageDragIndices(
  before: number[],
  after: number[] | null,
  event: { operation?: { source?: unknown } }
): { from: number; to: number } | null {
  if (after) {
    const diff = findDragMoveIndices(before, after);
    if (diff) return diff;
  }
  const ev = sortableIndicesFromSource(event.operation?.source);
  if (!ev || ev.from === ev.to) return null;
  if (ev.from < 0 || ev.from >= before.length) return null;
  if (ev.to < 0 || ev.to >= before.length) return null;
  return ev;
}

/** True when `nodePath` is strictly under `ancestorPath` in materialized tree_path. */
export function isTreePathDescendant(
  ancestorPath: string,
  nodePath: string
): boolean {
  const prefix = `${ancestorPath}.`;
  return nodePath.startsWith(prefix);
}

/** In DFS-flat `fullSorted`, index span of `srcRow` and its descendants. */
export function treeSubtreeIndexRange<T extends TreeSortableRow>(
  fullSorted: T[],
  srcRow: T
): { start: number; end: number } | null {
  const srcPath = srcRow.tree_path;
  const start = fullSorted.findIndex((r) => r.id === srcRow.id);
  if (start < 0) return null;
  if (!srcPath) return { start, end: start };
  let end = start;
  for (let i = start + 1; i < fullSorted.length; i++) {
    const path = fullSorted[i].tree_path;
    if (path && isTreePathDescendant(srcPath, path)) end = i;
    else break;
  }
  return { start, end };
}

/** Drop would place `srcRow` among or on its own descendants in flat order. */
export function isTreeDragIntoOwnSubtree<T extends TreeSortableRow>(
  fullSorted: T[],
  srcRow: T,
  absTo: number
): boolean {
  const range = treeSubtreeIndexRange(fullSorted, srcRow);
  if (!range) return false;
  const dstRow = fullSorted[absTo];
  const srcPath = srcRow.tree_path;
  if (
    dstRow?.tree_path &&
    srcPath &&
    isTreePathDescendant(srcPath, dstRow.tree_path)
  ) {
    return true;
  }
  if (absTo !== range.start && absTo > range.start && absTo <= range.end) {
    return true;
  }
  return false;
}

function treePathReorderBlocked<T extends TreeSortableRow>(
  srcRow: T,
  dstRow: T
): boolean {
  const srcPath = srcRow.tree_path;
  const dstPath = dstRow.tree_path;
  if (!srcPath || !dstPath) return false;
  return (
    isTreePathDescendant(srcPath, dstPath) ||
    isTreePathDescendant(dstPath, srcPath)
  );
}

/** Reorder within same sibling group; reassign sort_order for that group only. */
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
  if (treePathReorderBlocked(srcRow, dstRow)) return null;

  const parentKey = srcRow.parent_id ?? null;
  const siblings = fullSorted.filter(
    (r) => (r.parent_id ?? null) === parentKey
  );
  const fromSib = siblings.findIndex((r) => r.id === srcRow.id);
  const toSib = siblings.findIndex((r) => r.id === dstRow.id);
  if (fromSib < 0 || toSib < 0) return null;

  const reorderedSiblings = arrayMoveIds(siblings, fromSib, toSib);

  const orderById = new Map<number, number>();
  reorderedSiblings.forEach((row, idx) => {
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

/** ponytail: run with `bun lib/crud-list-rows.ts` from frontend/ */
function reorderFlatSortOrderSelfCheck(): void {
  type Row = TreeSortableRow & { id: number };
  const rows: Row[] = [
    {
      id: 1,
      parent_id: null,
      sort_order: 100,
      tree_path: "n1",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: 2,
      parent_id: 1,
      sort_order: 100,
      tree_path: "n1.n2",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: 3,
      parent_id: null,
      sort_order: 200,
      tree_path: "n3",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  const fullSorted = flattenTreeRows(rows);
  const sameParent = (a: Row, b: Row) => a.parent_id === b.parent_id;
  const absFrom = fullSorted.findIndex((r) => r.id === 3);
  const absTo = fullSorted.findIndex((r) => r.id === 1);
  const next = reorderFlatSortOrder(
    rows,
    fullSorted,
    absFrom,
    absTo,
    sameParent
  );
  if (!next) throw new Error("expected reorder to apply");
  const child = next.find((r) => r.id === 2);
  if (child?.sort_order !== 100) {
    throw new Error("child sort_order must be unchanged");
  }
  const flat = flattenTreeRows(next);
  const ids = flat.map((r) => r.id);
  if (ids.indexOf(1) > ids.indexOf(2)) {
    throw new Error("parent must stay before descendant in flatten order");
  }
  if (treePathReorderBlocked(rows[0], rows[1]) !== true) {
    throw new Error("expected descendant drop to be blocked");
  }
  const parentIdx = fullSorted.findIndex((r) => r.id === 1);
  const childIdx = fullSorted.findIndex((r) => r.id === 2);
  if (!isTreeDragIntoOwnSubtree(fullSorted, rows[0], childIdx)) {
    throw new Error("expected drag onto child to count as into own subtree");
  }
  if (isTreeDragIntoOwnSubtree(fullSorted, rows[0], parentIdx)) {
    throw new Error("drag onto self must not count as into subtree");
  }
}

if (import.meta.main) {
  reorderFlatSortOrderSelfCheck();
}
