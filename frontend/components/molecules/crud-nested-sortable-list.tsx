"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { useCrudSortableReorder } from "@/hooks/use-crud-sortable-reorder";
import {
  sortBySortOrderThenId,
  withSortOrderSteps100,
  type SortOrderRow,
} from "@/lib/crud-list-rows";
import { cn } from "@/lib/utils";

export type CrudNestedSortableListProps<T extends SortOrderRow> = {
  rows: T[];
  dragEnabled: boolean;
  description?: ReactNode;
  emptyLabel: string;
  addLabel: string;
  canManage: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void | Promise<void>;
  onRowsChange: (next: T[]) => void;
  persistReorder?: (
    dragId: number,
    targetId: number
  ) => Promise<void | unknown>;
  onReorderSuccess?: () => void;
  onReorderError?: (error: unknown) => void;
  renderItem: (ctx: {
    row: T;
    index: number;
    dragEnabled: boolean;
    actions: TableIconActionKey[];
    onEdit: () => void;
    onDelete: () => void;
  }) => ReactNode;
};

export function CrudNestedSortableList<T extends SortOrderRow>({
  rows,
  dragEnabled: dragEnabledProp,
  description,
  emptyLabel,
  addLabel,
  canManage,
  canDelete,
  onAdd,
  onEdit,
  onDelete,
  onRowsChange,
  persistReorder,
  onReorderSuccess,
  onReorderError,
  renderItem,
}: CrudNestedSortableListProps<T>) {
  const sorted = useMemo(() => sortBySortOrderThenId(rows), [rows]);
  const dragEnabled = dragEnabledProp && sorted.length > 1;
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const rowActions = (): TableIconActionKey[] =>
    [canManage && "edit", canDelete && "delete"].filter(
      Boolean
    ) as TableIconActionKey[];

  const { sortableEpoch, handleDragEnd } = useCrudSortableReorder({
    rows: sorted,
    dragEnabled,
    applyLocalReorder: true,
    withLocalSortOrder: withSortOrderSteps100,
    onLocalReordered: onRowsChange,
    persistReorder,
    onSuccess: onReorderSuccess,
    onError: onReorderError,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {description != null ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : (
          <p className="text-sm text-muted-foreground" />
        )}
        {canManage ? (
          <Button type="button" size="lg" className="shrink-0" onClick={onAdd}>
            <Plus className="size-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div
            key={dragEnabled ? sortableEpoch : "static"}
            className="flex flex-col gap-2"
          >
            {sorted.map((row, index) =>
              renderItem({
                row,
                index,
                dragEnabled,
                actions: rowActions(),
                onEdit: () => onEdit(row),
                onDelete: () => setDeleteTarget(row),
              })
            )}
          </div>
        </DragDropProvider>
      )}

      <CrudDeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          const row = deleteTarget;
          setDeleteTarget(null);
          if (row) void onDelete(row);
        }}
      />
    </div>
  );
}

export type CrudNestedSortableListItemProps = {
  id: number;
  index: number;
  dragEnabled: boolean;
  actions: TableIconActionKey[];
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
};

export function CrudNestedSortableListItem({
  id,
  index,
  dragEnabled,
  actions,
  onEdit,
  onDelete,
  children,
  className,
}: CrudNestedSortableListItemProps) {
  const tCrud = useTranslations("crud");
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    disabled: !dragEnabled,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 sm:flex-nowrap",
        isDragging && "opacity-50",
        className
      )}
    >
      {dragEnabled ? (
        <button
          type="button"
          ref={handleRef}
          className="inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={tCrud("reorder.drag")}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      {children}
      {actions.length > 0 ? (
        <TableIconActions
          className="shrink-0"
          actions={actions}
          onAction={(action) => {
            if (action === "edit") onEdit();
            if (action === "delete") onDelete();
          }}
        />
      ) : null}
    </div>
  );
}
