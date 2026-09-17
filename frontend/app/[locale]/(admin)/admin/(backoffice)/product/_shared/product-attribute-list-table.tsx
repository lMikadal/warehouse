"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  useCallback,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResourceActions } from "@/lib/admin-permissions";
import {
  tableIconActionsFromResource,
  tableRowDetailAction,
} from "@/lib/admin-permissions";
import {
  isTreePathDescendant,
  resolveTreeDropZone,
  treeDepth,
  type TreeDropZone,
} from "@/lib/crud-list-rows";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import { cn } from "@/lib/utils";

import type { ProductAttributePageConfig } from "./product-attribute-config";

export type AttributeDragIntent = {
  dragId: number;
  targetId: number;
  zone: TreeDropZone;
};

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
  const pos = operation?.position;
  if (
    pos &&
    Number.isFinite(pos.x) &&
    Number.isFinite(pos.y)
  ) {
    return { x: Number(pos.x), y: Number(pos.y) };
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
    const row = el.closest("[data-product-attr-row-id]");
    if (!(row instanceof HTMLElement)) continue;
    const id = Number(row.getAttribute("data-product-attr-row-id"));
    if (Number.isFinite(id) && id !== dragId) return id;
  }
  return null;
}

function isAncestorOf(
  rows: ProductAttributeRow[],
  ancestorId: number,
  nodeId: number
): boolean {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let cur = byId.get(nodeId);
  while (cur) {
    if (cur.id === ancestorId) return true;
    cur =
      cur.parent_id != null ? byId.get(cur.parent_id) : undefined;
  }
  return false;
}

function resolveAttributeDragIntent(
  operation: DndOperation | undefined,
  visibleRows: ProductAttributeRow[],
  mode: "category" | "car"
): AttributeDragIntent | null {
  const source = operation?.source;
  if (source?.id == null) return null;
  const dragId = Number(source.id);
  if (!Number.isFinite(dragId)) return null;

  let targetId =
    operation?.target?.id != null
      ? Number(operation.target.id)
      : Number.NaN;
  if (!Number.isFinite(targetId) || targetId === dragId) {
    const fromPointer = resolveTargetIdFromPointer(operation, dragId);
    if (fromPointer != null) targetId = fromPointer;
  }
  if (!Number.isFinite(targetId) || dragId === targetId) return null;

  const dragRow = visibleRows.find((r) => r.id === dragId);
  const targetRow = visibleRows.find((r) => r.id === targetId);
  if (!dragRow || !targetRow) return null;

  if (mode === "category") {
    if (
      dragRow.tree_path &&
      targetRow.tree_path &&
      isTreePathDescendant(dragRow.tree_path, targetRow.tree_path)
    ) {
      return null;
    }
  } else if (isAncestorOf(visibleRows, dragId, targetId)) {
    return null;
  }

  const el = document.querySelector(
    `[data-product-attr-row-id="${targetId}"]`
  );
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  const pointerY = pointerClientCoords(operation)?.y;
  if (pointerY == null || !Number.isFinite(pointerY)) return null;

  const zone = resolveTreeDropZone(rect.top, rect.height, pointerY);

  return { dragId, targetId, zone };
}

function isInvalidCategoryParent(
  rows: ProductAttributeRow[],
  dragId: number,
  newParentId: number | null
): boolean {
  if (newParentId == null) return false;
  if (newParentId === dragId) return true;
  const self = rows.find((r) => r.id === dragId);
  const candidate = rows.find((r) => r.id === newParentId);
  if (!self || !candidate) return true;
  if (self.tree_path && candidate.tree_path) {
    const prefix = `${self.tree_path}.`;
    return (
      candidate.id === dragId ||
      candidate.tree_path.startsWith(prefix)
    );
  }
  return isAncestorOf(rows, dragId, newParentId);
}

function categoryDropAllowed(
  rows: ProductAttributeRow[],
  dragId: number,
  targetRow: ProductAttributeRow,
  zone: TreeDropZone
): boolean {
  if (
    zone === "child" &&
    isInvalidCategoryParent(rows, dragId, targetRow.id)
  ) {
    return false;
  }
  const newParentId = zone === "child" ? targetRow.id : targetRow.parent_id;
  return !isInvalidCategoryParent(rows, dragId, newParentId);
}

function carDropAllowed(
  rows: ProductAttributeRow[],
  dragRow: ProductAttributeRow,
  targetRow: ProductAttributeRow,
  zone: TreeDropZone
): boolean {
  const dragType = dragRow.type_car;
  const effectiveParentId =
    zone === "child" ? targetRow.id : targetRow.parent_id;

  if (zone === "child") {
    const targetType = targetRow.type_car;
    return (
      (dragType === "model" && targetType === "brand") ||
      (dragType === "engine" && targetType === "model")
    );
  }

  if (dragType === "brand") return effectiveParentId == null;
  if (effectiveParentId == null) return false;
  const parent = rows.find((r) => r.id === effectiveParentId);
  if (dragType === "model") return parent?.type_car === "brand";
  if (dragType === "engine") return parent?.type_car === "model";
  return false;
}

function AttributeDropHint({
  row,
  dropIntent,
}: {
  row: ProductAttributeRow;
  dropIntent: AttributeDragIntent | null;
}) {
  const tCrud = useTranslations("crud");
  if (dropIntent == null || dropIntent.targetId !== row.id) return null;
  const isChild = dropIntent.zone === "child";
  return (
    <span
      className="mb-1 block w-fit max-w-full truncate rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
      aria-live="polite"
    >
      {isChild
        ? tCrud("reorder.dropChild", { label: row.name })
        : tCrud("reorder.dropSibling", { label: row.name })}
    </span>
  );
}

function rowDropTargetClass(
  rowId: number,
  dropIntent: AttributeDragIntent | null
): string {
  if (!dropIntent || dropIntent.targetId !== rowId) return "";
  switch (dropIntent.zone) {
    case "before":
      return "shadow-[inset_0_2px_0_0_var(--color-primary)]";
    case "after":
      return "shadow-[inset_0_-2px_0_0_var(--color-primary)]";
    case "child":
      return cn(
        "bg-[color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]",
        "shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]"
      );
    default:
      return "";
  }
}

function carLevelLabel(
  typeCar: string | null | undefined,
  tAttr: ReturnType<typeof useTranslations<"productAttr">>
): string {
  if (typeCar === "brand" || typeCar === "model" || typeCar === "engine") {
    return tAttr(`carLevel.${typeCar}`);
  }
  return typeCar ?? "—";
}

type RowCellsProps = {
  row: ProductAttributeRow;
  config: ProductAttributePageConfig;
  locale: DisplayLocale;
  perms: ResourceActions;
  editingId: number | null;
  showGrip: boolean;
  dragEnabled: boolean;
  dropIntent?: AttributeDragIntent | null;
  handleRef?: (element: Element | null) => void;
  isDragging?: boolean;
  onToggleActive: (row: ProductAttributeRow, next: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
};

function AttributeTableCells({
  row,
  config,
  locale,
  perms,
  editingId: _editingId,
  showGrip,
  dragEnabled,
  dropIntent = null,
  handleRef,
  isDragging: _isDragging,
  onToggleActive,
  onAction,
}: RowCellsProps) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tAttr = useTranslations("productAttr");
  const rowActions = tableIconActionsFromResource(perms);
  const nameDepth =
    config.kind === "category" || config.kind === "car"
      ? treeDepth(row.tree_path)
      : 0;

  return (
    <>
      {showGrip ? (
        <TableCell className="w-10 text-center">
          <ButtonIcon
            type="button"
            size="md"
            ref={dragEnabled ? handleRef : undefined}
            disabled={!dragEnabled}
            aria-label={tCrud("reorder.drag")}
            className={cn(
              "shrink-0 text-muted-foreground",
              dragEnabled
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-not-allowed"
            )}
          >
            <GripVertical className="text-current" />
          </ButtonIcon>
        </TableCell>
      ) : null}
      <TableCell>
        <AttributeDropHint row={row} dropIntent={dropIntent ?? null} />
        <span
          className="block font-medium"
          style={
            nameDepth > 0
              ? { paddingLeft: `${nameDepth * 1.25}rem` }
              : undefined
          }
        >
          {row.name}
        </span>
      </TableCell>
      {config.kind === "car" ? (
        <TableCell>{carLevelLabel(row.type_car, tAttr)}</TableCell>
      ) : null}
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusSwitchField
            checked={row.is_active}
            disabled={!perms.update}
            onCheckedChange={(checked) => onToggleActive(row, checked)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        {formatDateTime(row.updated_at, locale)}
      </TableCell>
      <TableCell className="text-center">
        <TableIconActions
          actions={rowActions}
          onAction={(action) => {
            if (tableRowDetailAction(action)) onAction(row.id, action);
            else if (action === "delete") onAction(row.id, action);
          }}
        />
      </TableCell>
    </>
  );
}

function SortableAttributeRow(
  props: RowCellsProps & { index: number }
) {
  const { row, index, dragEnabled, perms, dropIntent } = props;
  const sortable = dragEnabled && perms.update;
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !sortable,
  });

  return (
    <TableRow
      ref={ref}
      data-product-attr-row-id={row.id}
      className={cn(
        props.editingId === row.id && "bg-muted/60",
        isDragging && "opacity-50",
        rowDropTargetClass(row.id, dropIntent ?? null)
      )}
    >
      <AttributeTableCells
        {...props}
        handleRef={sortable ? handleRef : undefined}
        isDragging={isDragging}
      />
    </TableRow>
  );
}

function StaticAttributeRow(props: RowCellsProps) {
  const { row } = props;
  return (
    <TableRow
      data-product-attr-row-id={row.id}
      className={cn(props.editingId === row.id && "bg-muted/60")}
    >
      <AttributeTableCells {...props} />
    </TableRow>
  );
}

export type ProductAttributeListTableProps = {
  config: ProductAttributePageConfig;
  rows: ProductAttributeRow[];
  loading: boolean;
  locale: DisplayLocale;
  perms: ResourceActions;
  dragEnabled: boolean;
  editingId: number | null;
  onToggleActive: (row: ProductAttributeRow, next: boolean) => void;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onCategoryMove: (intent: AttributeDragIntent) => Promise<void>;
  onCarMove: (intent: AttributeDragIntent) => Promise<void>;
};

export function productAttributeColumnCount(
  config: ProductAttributePageConfig
): number {
  const base = 4;
  const level = config.kind === "car" ? 1 : 0;
  return base + level;
}

export function productAttributeShowGrip(
  config: ProductAttributePageConfig
): boolean {
  return config.kind === "category" || config.kind === "car";
}

export function ProductAttributeListTable({
  config,
  rows,
  loading,
  locale,
  perms,
  dragEnabled,
  editingId,
  onToggleActive,
  onSelect,
  onDelete,
  onCategoryMove,
  onCarMove,
}: ProductAttributeListTableProps) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tAttr = useTranslations("productAttr");
  const tError = useTranslations("error");

  const showGrip = productAttributeShowGrip(config);
  const columnCount = productAttributeColumnCount(config);
  const dndMode =
    config.kind === "category"
      ? "category"
      : config.kind === "car"
        ? "car"
        : null;

  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [dragIntent, setDragIntent] = useState<AttributeDragIntent | null>(
    null
  );
  const dragIntentRef = useRef<AttributeDragIntent | null>(null);
  const lastDropIntentRef = useRef<AttributeDragIntent | null>(null);

  const handleRowAction = (id: number, action: TableIconActionKey) => {
    if (action === "delete") onDelete(id);
    else onSelect(id);
  };

  const syncDragIntent = useCallback(
    (operation: DndOperation | undefined) => {
      if (!dragEnabled || !dndMode) {
        dragIntentRef.current = null;
        lastDropIntentRef.current = null;
        setDragIntent(null);
        return;
      }
      const next = resolveAttributeDragIntent(operation, rows, dndMode);
      if (next) {
        dragIntentRef.current = next;
        lastDropIntentRef.current = next;
        setDragIntent(next);
      } else {
        dragIntentRef.current = lastDropIntentRef.current;
        setDragIntent(lastDropIntentRef.current);
      }
    },
    [dragEnabled, dndMode, rows]
  );

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
    const resetSortableOrder = () => {
      queueMicrotask(() => {
        setSortableEpoch((e) => e + 1);
      });
    };
    const scheduleReject = (msg?: string) => {
      resetSortableOrder();
      if (msg) toast.error(msg);
    };

    const intent =
      dragIntentRef.current ??
      lastDropIntentRef.current ??
      (dndMode
        ? resolveAttributeDragIntent(
            event.operation as DndOperation | undefined,
            rows,
            dndMode
          )
        : null);
    dragIntentRef.current = null;
    lastDropIntentRef.current = null;
    queueMicrotask(() => setDragIntent(null));

    if (event.canceled || !dragEnabled || !dndMode) {
      if (dragEnabled && dndMode) resetSortableOrder();
      return;
    }
    if (intent == null) {
      scheduleReject();
      return;
    }

    if (dndMode === "category") {
      const dragRow = rows.find((r) => r.id === intent.dragId);
      const targetRow = rows.find((r) => r.id === intent.targetId);
      if (!dragRow || !targetRow) {
        scheduleReject();
        return;
      }
      if (!categoryDropAllowed(rows, intent.dragId, targetRow, intent.zone)) {
        scheduleReject(
          intent.zone === "child"
            ? tAttr("dragInvalidParent")
            : tAttr("dragInvalidMove")
        );
        return;
      }
      void onCategoryMove(intent)
        .then(() => {
          resetSortableOrder();
          toast.success(tCrud("toast.reordered"));
        })
        .catch(() => {
          scheduleReject(tAttr("dragInvalidMove"));
        });
      return;
    }

    const dragRow = rows.find((r) => r.id === intent.dragId);
    const targetRow = rows.find((r) => r.id === intent.targetId);
    if (!dragRow || !targetRow) {
      scheduleReject();
      return;
    }
    const dropOk = carDropAllowed(rows, dragRow, targetRow, intent.zone);
    if (!dropOk) {
      scheduleReject(
        intent.zone === "child"
          ? tAttr("dragInvalidParent")
          : tAttr("dragInvalidMove")
      );
      return;
    }
    void onCarMove(intent)
      .then(() => {
        resetSortableOrder();
        toast.success(tCrud("toast.reordered"));
      })
      .catch(() => {
        scheduleReject(tAttr("dragInvalidMove"));
      });
  };

  const cellProps = (row: ProductAttributeRow): RowCellsProps => ({
    row,
    config,
    locale,
    perms,
    editingId,
    showGrip,
    dragEnabled,
    onToggleActive,
    onAction: handleRowAction,
  });

  const tableBody = (
    <TableBody key={dragEnabled ? sortableEpoch : "static"}>
      {loading ? (
        <CrudListTableSkeleton
          columnCount={columnCount}
          rowCount={10}
          showDragColumn={showGrip}
        />
      ) : rows.length ? (
        rows.map((row, index) =>
          dragEnabled && dndMode ? (
            <SortableAttributeRow
              key={`${row.id}-${sortableEpoch}`}
              {...cellProps(row)}
              index={index}
              dropIntent={dragIntent}
            />
          ) : (
            <StaticAttributeRow key={row.id} {...cellProps(row)} />
          )
        )
      ) : (
        <TableRow>
          <TableCell
            colSpan={columnCount + (showGrip ? 1 : 0)}
            className="text-center text-muted-foreground"
          >
            {tError("noData")}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );

  return (
    <DragDropProvider
      onDragMove={({ operation }) => syncDragIntent(operation as DndOperation)}
      onDragOver={({ operation }) => syncDragIntent(operation as DndOperation)}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {showGrip ? (
              <TableHead className="w-10" aria-hidden />
            ) : null}
            <TableHead>{tCol("name")}</TableHead>
            {config.kind === "car" ? (
              <TableHead>{tAttr("carLevel.label")}</TableHead>
            ) : null}
            <TableHead className="text-center">{tCol("status")}</TableHead>
            <TableHead className="text-center">{tCol("updatedAt")}</TableHead>
            <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        {tableBody}
      </Table>
    </DragDropProvider>
  );
}
