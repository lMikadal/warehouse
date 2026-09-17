"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ComponentProps,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import type { ResourceActions } from "@/lib/admin-permissions";
import { resolveTreeDropZone } from "@/lib/crud-list-rows";
import {
  moveWarehouseNode,
  type WarehouseTreeNode,
} from "@/lib/warehouse-api";

import { warehouseMoveErrorMessage } from "./warehouse-move-error";
import {
  SortableWarehouseTreeRow,
  type WarehouseDragIntent,
} from "./warehouse-view-tree-row";
import { whViewTreeChildrenClass } from "./warehouse-view-tree-styles";
import {
  childrenOf,
  flattenVisibleTree,
  isDescendant,
  nodesById,
  storageChildren,
  validParent,
} from "./warehouse-tree-utils";

type DndOperation = {
  source?: { id?: unknown };
  target?: { id?: unknown } | null;
  position?: { y?: number; x?: number; current?: { y?: number; x?: number } };
  activatorEvent?: Event | null;
};

function pointerClientCoords(
  operation: DndOperation | undefined
): { x: number; y: number } | null {
  const current = operation?.position?.current;
  if (
    current &&
    Number.isFinite(current.x) &&
    Number.isFinite(current.y)
  ) {
    return { x: Number(current.x), y: Number(current.y) };
  }
  if (operation?.activatorEvent instanceof PointerEvent) {
    return {
      x: operation.activatorEvent.clientX,
      y: operation.activatorEvent.clientY,
    };
  }
  return null;
}

function resolveTargetIdFromPointer(
  operation: DndOperation | undefined,
  dragId: number
): number | null {
  const coords = pointerClientCoords(operation);
  if (!coords) return null;
  const stack = document.elementsFromPoint(coords.x, coords.y);
  for (const el of stack) {
    const row = el.closest("[data-warehouse-row-id]");
    if (!(row instanceof HTMLElement)) continue;
    const id = Number(row.getAttribute("data-warehouse-row-id"));
    if (Number.isFinite(id) && id !== dragId) return id;
  }
  return null;
}

function resolveWarehouseDragIntent(
  operation: DndOperation | undefined,
  visibleRows: WarehouseTreeNode[]
): WarehouseDragIntent | null {
  const source = operation?.source;
  const target = operation?.target;
  if (source?.id == null) return null;
  const dragId = Number(source.id);
  if (!Number.isFinite(dragId)) return null;

  let targetId =
    target?.id != null ? Number(target.id) : Number.NaN;
  if (!Number.isFinite(targetId) || targetId === dragId) {
    const fromPointer = resolveTargetIdFromPointer(operation, dragId);
    if (fromPointer != null) targetId = fromPointer;
  }
  if (!Number.isFinite(targetId) || dragId === targetId) return null;

  const dragRow = visibleRows.find((r) => r.id === dragId);
  const targetRow = visibleRows.find((r) => r.id === targetId);
  if (!dragRow || !targetRow) return null;

  if (isDescendant(visibleRows, dragId, targetId)) return null;

  const el = document.querySelector(`[data-warehouse-row-id="${targetId}"]`);
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  const pointerY = pointerClientCoords(operation)?.y;
  if (pointerY == null || !Number.isFinite(pointerY)) return null;

  const zone = resolveTreeDropZone(rect.top, rect.height, pointerY);
  return { dragId, targetId, zone };
}

type Props = {
  nodes: WarehouseTreeNode[];
  warehouseId: number;
  open: Record<number, boolean>;
  perm: ResourceActions;
  sortableEpoch: number;
  onSortableEpochBump: () => void;
  onToggle: (id: number) => void;
  onReload: () => Promise<void>;
  onAdd: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function WarehouseViewTreePanel({
  nodes,
  warehouseId,
  open,
  perm,
  sortableEpoch,
  onSortableEpochBump,
  onToggle,
  onReload,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const locale = useLocale();
  const tWh = useTranslations("warehouse");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const dragEnabled = perm.update;
  const flat = flattenVisibleTree(nodes, warehouseId, open);
  const visibleNodes = useMemo(
    () => flat.map((r) => r.node),
    [flat]
  );
  const indexById = useMemo(() => {
    const map = new Map<number, number>();
    flat.forEach(({ node }, index) => map.set(node.id, index));
    return map;
  }, [flat]);

  const zoneRoots = useMemo(
    () =>
      childrenOf(nodes, warehouseId).filter((n) => n.type === "zone"),
    [nodes, warehouseId]
  );

  const [dragIntent, setDragIntent] = useState<WarehouseDragIntent | null>(
    null
  );
  const dragIntentRef = useRef<WarehouseDragIntent | null>(null);

  const syncDragIntent = useCallback(
    (operation: DndOperation | undefined) => {
      if (!dragEnabled) {
        dragIntentRef.current = null;
        setDragIntent(null);
        return;
      }
      const next = resolveWarehouseDragIntent(operation, visibleNodes);
      dragIntentRef.current = next;
      setDragIntent(next);
    },
    [dragEnabled, visibleNodes]
  );

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
    const scheduleRejectDrag = (toastMessage?: string) => {
      queueMicrotask(() => {
        onSortableEpochBump();
        if (toastMessage) toast.error(toastMessage);
      });
    };

    const intent =
      dragIntentRef.current ??
      resolveWarehouseDragIntent(
        event.operation as DndOperation | undefined,
        visibleNodes
      );
    dragIntentRef.current = null;
    setDragIntent(null);

    if (event.canceled || !dragEnabled) return;
    if (intent == null) {
      scheduleRejectDrag();
      return;
    }

    const byId = nodesById(nodes);
    const dragRow = byId.get(intent.dragId);
    const targetRow = byId.get(intent.targetId);
    if (!dragRow || !targetRow) {
      scheduleRejectDrag();
      return;
    }

    if (isDescendant(nodes, intent.dragId, intent.targetId)) {
      scheduleRejectDrag(tCrud("reorder.intoSubtree"));
      return;
    }

    if (intent.zone === "child") {
      if (!validParent(dragRow.type, targetRow.type)) {
        scheduleRejectDrag(tCrud("reorder.intoSubtree"));
        return;
      }
    } else {
      const parentId = targetRow.parent_id;
      if (parentId == null) {
        scheduleRejectDrag(tCrud("reorder.intoSubtree"));
        return;
      }
      const parent = byId.get(parentId);
      if (!parent || !validParent(dragRow.type, parent.type)) {
        scheduleRejectDrag(tCrud("reorder.intoSubtree"));
        return;
      }
    }

    void moveWarehouseNode(locale, {
      drag_id: intent.dragId,
      target_id: intent.targetId,
      zone: intent.zone,
    })
      .then(() => onReload())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((err: unknown) => {
        scheduleRejectDrag(
          warehouseMoveErrorMessage(err, tWh, tError)
        );
      });
  };

  const rowProps = {
    nodes,
    open,
    perm,
    dropIntent: dragIntent,
    dragEnabled,
    onToggle,
    onAdd,
    onEdit,
    onDelete,
  };

  function renderNode(node: WarehouseTreeNode, depth: number) {
    const kids = storageChildren(nodes, node.id);
    const isOpen = open[node.id] ?? depth < 1;
    const showChildren = isOpen && kids.length > 0;
    const index = indexById.get(node.id) ?? 0;

    return (
      <SortableWarehouseTreeRow
        key={node.id}
        row={node}
        index={index}
        depth={depth}
        nestedChildren={
          showChildren ? (
            <div className={whViewTreeChildrenClass}>
              {kids.map((child) => renderNode(child, depth + 1))}
            </div>
          ) : null
        }
        {...rowProps}
      />
    );
  }

  if (zoneRoots.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        {tWh("noZones")}
      </p>
    );
  }

  return (
    <DragDropProvider
      onDragMove={({ operation }) =>
        syncDragIntent(operation as DndOperation)
      }
      onDragOver={({ operation }) =>
        syncDragIntent(operation as DndOperation)
      }
      onDragEnd={handleDragEnd}
    >
      <div
        key={sortableEpoch}
        className="wh-view-tree overflow-hidden py-2 pr-3 pl-2"
      >
        {zoneRoots.map((zone) => renderNode(zone, 0))}
      </div>
    </DragDropProvider>
  );
}
