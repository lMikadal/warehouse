"use client";

import { Mail, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CrudNestedSortableList,
  CrudNestedSortableListItem,
} from "@/components/molecules/crud-nested-sortable-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  reorderSupplierContacts,
  SupplierUserApiError,
  type SupplierContactRow,
} from "@/lib/supplier-user-api";
import { toast } from "sonner";

export type SupplierContactListRow = SupplierContactRow & { _draft?: true };

function contactInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  return trimmed.slice(0, 2);
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

  const dragEnabled = canManage;
  const persistReorder =
    isEdit && supplierId != null
      ? (dragId: number, targetId: number) =>
          reorderSupplierContacts(locale, supplierId, dragId, targetId)
      : undefined;

  return (
    <CrudNestedSortableList
      rows={contacts}
      dragEnabled={dragEnabled}
      emptyLabel={tSupplier("emptyContacts")}
      addLabel={tSupplier("addContact")}
      canManage={canManage}
      canDelete={canDelete}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      onRowsChange={onContactsChange}
      persistReorder={persistReorder}
      onReorderSuccess={() => {
        if (isEdit && supplierId != null) {
          onReload();
        }
        toast.success(tCrud("toast.reordered"));
      }}
      onReorderError={(e) => {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }}
      renderItem={({ row, index, dragEnabled: rowDrag, actions, onEdit: edit, onDelete }) => {
        const email = row.email?.trim() || "—";
        const tel = row.tel?.trim() || "—";

        return (
          <CrudNestedSortableListItem
            key={row.id}
            id={row.id}
            index={index}
            dragEnabled={rowDrag}
            actions={actions}
            onEdit={edit}
            onDelete={onDelete}
          >
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
          </CrudNestedSortableListItem>
        );
      }}
    />
  );
}
