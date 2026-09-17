import type { WarehouseTreeNode } from "@/lib/warehouse-api";

export function allowedChildTypes(parentType: string): string[] {
  switch (parentType) {
    case "warehouse":
      return ["zone"];
    case "zone":
      return ["shelf", "rack", "bin"];
    case "shelf":
      return ["rack", "bin"];
    case "rack":
      return ["bin"];
    default:
      return [];
  }
}

export function validParent(childType: string, parentType: string): boolean {
  return allowedChildTypes(parentType).includes(childType);
}

export function nodesById(
  nodes: WarehouseTreeNode[]
): Map<number, WarehouseTreeNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

export function isDescendant(
  nodes: WarehouseTreeNode[],
  dragId: number,
  targetId: number
): boolean {
  const byId = nodesById(nodes);
  let cur: WarehouseTreeNode | undefined = byId.get(targetId);
  while (cur) {
    if (cur.id === dragId) return true;
    cur =
      cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return false;
}

export function childrenOf(
  nodes: WarehouseTreeNode[],
  parentId: number
): WarehouseTreeNode[] {
  return nodes
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function storageChildren(
  nodes: WarehouseTreeNode[],
  parentId: number
): WarehouseTreeNode[] {
  return childrenOf(nodes, parentId).filter((c) =>
    ["shelf", "rack", "bin"].includes(c.type)
  );
}

export function countDescendantsOfType(
  nodes: WarehouseTreeNode[],
  nodeId: number,
  type: string
): number {
  let count = 0;
  function walk(pid: number) {
    for (const c of childrenOf(nodes, pid)) {
      if (c.type === type) count += 1;
      walk(c.id);
    }
  }
  walk(nodeId);
  return count;
}

export type ChildCountPart = { type: string; count: number };

export function childCountSummary(
  nodes: WarehouseTreeNode[],
  nodeId: number
): ChildCountPart[] {
  const parts: ChildCountPart[] = [];
  for (const type of ["shelf", "rack", "bin"] as const) {
    const count = countDescendantsOfType(nodes, nodeId, type);
    if (count > 0) parts.push({ type, count });
  }
  return parts;
}

export type NodeCapacity = { used: number; total: number; pct: number };

export function nodeCapacity(
  nodes: WarehouseTreeNode[],
  node: WarehouseTreeNode
): NodeCapacity {
  if (node.type === "bin") {
    const total = Number(node.capacity) || 0;
    const used = Number(node.used) || 0;
    const pct =
      total > 0
        ? Math.min(100, Math.round((used / total) * 100))
        : used > 0
          ? 100
          : 0;
    return { used, total, pct };
  }
  const types = allowedChildTypes(node.type);
  const used = childrenOf(nodes, node.id).filter((c) =>
    types.includes(c.type)
  ).length;
  const total = Number(node.capacity) || 0;
  const pct =
    total > 0
      ? Math.round((used / total) * 100)
      : used > 0
        ? 100
        : 0;
  return { used, total, pct: Math.min(100, pct) };
}

export type ViewStats = {
  zones: number;
  shelves: number;
  racks: number;
  bins: number;
  capacityPct: number;
};

export function computeViewStats(
  nodes: WarehouseTreeNode[],
  warehouseId: number
): ViewStats {
  const zones = childrenOf(nodes, warehouseId).filter(
    (n) => n.type === "zone"
  ).length;
  const shelves = nodes.filter((n) => n.type === "shelf").length;
  const racks = nodes.filter((n) => n.type === "rack").length;
  const bins = nodes.filter((n) => n.type === "bin").length;
  let usedTotal = 0;
  let capTotal = 0;
  for (const n of nodes) {
    if (n.type !== "bin") continue;
    usedTotal += Number(n.used) || 0;
    capTotal += Number(n.capacity) || 0;
  }
  const capacityPct =
    capTotal > 0
      ? Math.min(100, Math.round((usedTotal / capTotal) * 100))
      : 0;
  return { zones, shelves, racks, bins, capacityPct };
}

export type FlatVisibleRow = {
  node: WarehouseTreeNode;
  depth: number;
};

export function flattenVisibleTree(
  nodes: WarehouseTreeNode[],
  warehouseId: number,
  open: Record<number, boolean>
): FlatVisibleRow[] {
  const out: FlatVisibleRow[] = [];
  function walk(node: WarehouseTreeNode, depth: number) {
    out.push({ node, depth });
    const kids = storageChildren(nodes, node.id);
    const hasKids = kids.length > 0;
    const isOpen = open[node.id] ?? depth < 1;
    if (!hasKids || !isOpen) return;
    for (const c of kids) walk(c, depth + 1);
  }
  for (const zone of childrenOf(nodes, warehouseId)) {
    if (zone.type === "zone") walk(zone, 0);
  }
  return out;
}

export function isSortableWarehouseType(type: string): boolean {
  return type === "shelf" || type === "rack" || type === "bin";
}
