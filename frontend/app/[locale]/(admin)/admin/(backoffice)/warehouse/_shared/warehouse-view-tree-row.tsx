"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import {
  ChevronDown,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ButtonIcon } from "@/components/ui/button-icon";
import { Badge } from "@/components/ui/badge";
import type { ResourceActions } from "@/lib/admin-permissions";
import type { TreeDropZone } from "@/lib/crud-list-rows";
import type { WarehouseTreeNode } from "@/lib/warehouse-api";
import { cn } from "@/lib/utils";

import { WarehouseViewCapacity } from "./warehouse-view-capacity";
import {
  whViewRowClass,
  whViewRowIconClass,
  whViewTreeItemClass,
} from "./warehouse-view-tree-styles";
import {
  childCountSummary,
  nodeCapacity,
  storageChildren,
  type ChildCountPart,
} from "./warehouse-tree-utils";
import { WAREHOUSE_NODE_TYPE_ICON } from "./warehouse-type-icons";

export type WarehouseDragIntent = {
  dragId: number;
  targetId: number;
  zone: TreeDropZone;
};

function typeIcon(type: string): LucideIcon {
  return WAREHOUSE_NODE_TYPE_ICON[type] ?? WAREHOUSE_NODE_TYPE_ICON.zone;
}

function rowDropTargetClass(
  rowId: number,
  dropIntent: WarehouseDragIntent | null
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

function CountChips({
  parts,
  typeLabel,
}: {
  parts: ChildCountPart[];
  typeLabel: (type: string) => string;
}) {
  if (!parts.length) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {parts.map((p) => {
        const Icon = typeIcon(p.type);
        return (
          <span
            key={p.type}
            className="text-muted-foreground inline-flex items-center gap-1 text-xs"
          >
            <Icon className="size-3.5 opacity-70" aria-hidden />
            {p.count.toLocaleString()} {typeLabel(p.type)}
          </span>
        );
      })}
    </div>
  );
}

function DropHint({
  row,
  dropIntent,
}: {
  row: WarehouseTreeNode;
  dropIntent: WarehouseDragIntent | null;
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

type RowBodyProps = {
  row: WarehouseTreeNode;
  depth: number;
  nodes: WarehouseTreeNode[];
  open: Record<number, boolean>;
  perm: ResourceActions;
  dropIntent: WarehouseDragIntent | null;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  isDragging?: boolean;
  onToggle: (id: number) => void;
  onAdd: (parentId: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function TreeRowBody({
  row,
  depth,
  nodes,
  open,
  perm,
  dropIntent,
  dragEnabled,
  handleRef,
  isDragging,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
}: RowBodyProps) {
  const tWh = useTranslations("warehouse");
  const tCrud = useTranslations("crud");

  const kids = storageChildren(nodes, row.id);
  const hasKids = kids.length > 0;
  const isOpen = open[row.id] ?? depth < 1;
  const cap = nodeCapacity(nodes, row);
  const counts = childCountSummary(nodes, row.id);
  const Icon = typeIcon(row.type);
  const sortable = dragEnabled && perm.update && row.type !== "zone";
  const showAdd = row.type !== "bin" && perm.create;

  const typeLabel = (type: string) => {
    if (type === "shelf") return tWh("typeShelf");
    if (type === "rack") return tWh("typeRack");
    if (type === "bin") return tWh("typeBin");
    return type;
  };

  return (
    <div
      data-warehouse-row-id={row.id}
      className={cn(
        whViewRowClass,
        isDragging && "opacity-50",
        rowDropTargetClass(row.id, dropIntent)
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center",
          sortable ? "gap-1" : "gap-0.5"
        )}
      >
        {hasKids ? (
          <ButtonIcon
            type="button"
            variant="ghost"
            size="md"
            className="size-6 shrink-0 text-muted-foreground"
            aria-label={tWh("details")}
            aria-expanded={isOpen}
            onClick={() => onToggle(row.id)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                !isOpen && "-rotate-90"
              )}
              aria-hidden
            />
          </ButtonIcon>
        ) : (
          <span className="inline-block size-6 shrink-0" aria-hidden />
        )}

        {sortable ? (
          <ButtonIcon
            type="button"
            size="md"
            ref={handleRef}
            aria-label={tWh("moveDrag")}
            className="text-muted-foreground size-9 shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="text-current" />
          </ButtonIcon>
        ) : null}

        <div className={whViewRowIconClass(row.type)}>
          <Icon className="size-[18px]" aria-hidden />
        </div>
      </div>

      <div className="min-w-0 flex-1 basis-48">
        <DropHint row={row} dropIntent={dropIntent} />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{row.name}</span>
          <Badge className="border-green-600/30 bg-green-600/10 text-xs font-normal text-green-700 dark:text-green-400">
            {row.sku}
          </Badge>
        </div>
        <CountChips parts={counts} typeLabel={typeLabel} />
      </div>

      <WarehouseViewCapacity cap={cap} className="shrink-0" />

      <div className="inline-flex shrink-0 items-center gap-1">
        {showAdd ? (
          <ButtonIcon
            type="button"
            variant="outline"
            tone="add"
            aria-label={tWh("addChild")}
            onClick={() => onAdd(row.id)}
          >
            <Plus className="text-current" />
          </ButtonIcon>
        ) : null}
        {perm.update ? (
          <ButtonIcon
            type="button"
            variant="outline"
            aria-label={tCrud("btn.edit")}
            onClick={() => onEdit(row.id)}
          >
            <Pencil className="text-current" />
          </ButtonIcon>
        ) : null}
        {perm.delete ? (
          <ButtonIcon
            type="button"
            variant="outline"
            tone="delete"
            aria-label={tCrud("btn.delete")}
            onClick={() => onDelete(row.id)}
          >
            <Trash2 className="text-current" />
          </ButtonIcon>
        ) : null}
      </div>
    </div>
  );
}

type SortableTreeRowProps = Omit<RowBodyProps, "handleRef" | "isDragging"> & {
  index: number;
  nestedChildren?: ReactNode;
};

export function SortableWarehouseTreeRow({
  row,
  index,
  dragEnabled,
  nestedChildren,
  ...rest
}: SortableTreeRowProps) {
  const sortable =
    dragEnabled && rest.perm.update && row.type !== "zone";
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !sortable,
  });

  return (
    <div ref={ref} className={cn("wh-view-tree-item", whViewTreeItemClass)}>
      <TreeRowBody
        row={row}
        dragEnabled={dragEnabled}
        handleRef={sortable ? handleRef : undefined}
        isDragging={isDragging}
        {...rest}
      />
      {nestedChildren}
    </div>
  );
}
