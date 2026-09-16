"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Mail, Phone, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  reorderIdsFromSortableEvent,
  sortableIndicesFromSource,
} from "@/lib/crud-list-rows";
import {
  reorderSupplierContacts,
  SupplierUserApiError,
  type SupplierContactRow,
} from "@/lib/supplier-user-api";
import { cn } from "@/lib/utils";

export type SupplierContactListRow = SupplierContactRow & { _draft?: true };

function contactInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2);
}

function withContactSortOrder(
  rows: SupplierContactListRow[]
): SupplierContactListRow[] {
  return rows.map((row, index) => ({
    ...row,
    sort_order: (index + 1) * 100,
  }));
}

function sortContacts(rows: SupplierContactListRow[]): SupplierContactListRow[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );
}

type SupplierContactListProps = {
  contacts: SupplierContactListRow[];
  isEdit: boolean;
  locale: string;
  supplierId?: number;
  canManage: boolean;
  canDelete: boolean;
  onAdd: () => void;
  onEdit: (row: SupplierContactListRow) => void;
  onDelete: (row: SupplierContactListRow) => void;
  onContactsChange: (next: SupplierContactListRow[]) => void;
  onReload: () => void;
};

export function SupplierContactList({
  contacts,
  isEdit,
  locale,
  supplierId,
  canManage,
  canDelete,
  onAdd,
  onEdit,
  onDelete,
  onContactsChange,
  onReload,
}: SupplierContactListProps) {
  const tSupplier = useTranslations("supplier");
  const tCrud = useTranslations("crud");
  const t = useTranslations();

  const sorted = useMemo(() => sortContacts(contacts), [contacts]);
  const dragEnabled = canManage && sorted.length > 1;
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [deleteTarget, setDeleteTarget] =
    useState<SupplierContactListRow | null>(null);

  const rowActions = (): TableIconActionKey[] =>
    [canManage && "edit", canDelete && "delete"].filter(
      Boolean
    ) as TableIconActionKey[];

  const handleDragEnd: ComponentProps<typeof DragDropProvider>["onDragEnd"] = (
    event
  ) => {
    if (event.canceled || !dragEnabled) return;
    const indices = sortableIndicesFromSource(event.operation?.source);
    if (!indices || indices.from === indices.to) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const dragRow = sorted[indices.from];
    const targetRow = sorted[indices.to];
    if (!dragRow || !targetRow) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const reordered = reorderIdsFromSortableEvent(sorted, event);
    if (!reordered) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const next = withContactSortOrder(reordered);

    if (!isEdit || supplierId == null) {
      onContactsChange(next);
      return;
    }

    void reorderSupplierContacts(locale, supplierId, dragRow.id, targetRow.id)
      .then(() => {
        onContactsChange(next);
        onReload();
        toast.success(tCrud("toast.reordered"));
      })
      .catch((e: unknown) => {
        queueMicrotask(() => setSortableEpoch((n) => n + 1));
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground"></p>
        {canManage ? (
          <Button type="button" size="lg" className="shrink-0" onClick={onAdd}>
            <Plus className="size-4" />
            {tSupplier("addContact")}
          </Button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {tSupplier("emptyContacts")}
        </div>
      ) : (
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div
            key={dragEnabled ? sortableEpoch : "static"}
            className="flex flex-col gap-2"
          >
            {sorted.map((row, index) => (
              <SupplierContactSortableItem
                key={row.id}
                row={row}
                index={index}
                dragEnabled={dragEnabled}
                actions={rowActions()}
                onEdit={() => onEdit(row)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))}
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

function SupplierContactSortableItem({
  row,
  index,
  dragEnabled,
  actions,
  onEdit,
  onDelete,
}: {
  row: SupplierContactListRow;
  index: number;
  dragEnabled: boolean;
  actions: TableIconActionKey[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tCrud = useTranslations("crud");
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });

  const email = row.email?.trim() || "—";
  const tel = row.tel?.trim() || "—";

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 sm:flex-nowrap",
        isDragging && "opacity-50"
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

      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
          {contactInitials(row.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="font-medium">{row.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            {email}
          </span>
          <span className="text-border" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="size-3.5 shrink-0" aria-hidden />
            {tel}
          </span>
          {row.position?.trim() ? (
            <>
              <span className="text-border" aria-hidden>
                |
              </span>
              <span>{row.position.trim()}</span>
            </>
          ) : null}
        </div>
      </div>

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
