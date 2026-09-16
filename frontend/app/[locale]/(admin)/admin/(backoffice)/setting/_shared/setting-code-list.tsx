"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { FormField } from "@/components/molecules/form-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  tableIconActionsFromResource,
  tableRowDetailAction,
} from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createSettingCode,
  deleteSettingCode,
  fetchSettingCodeById,
  fetchSettingCodes,
  patchSettingCode,
  reorderSettingCodes,
  SettingApiError,
  type SettingCodeItem,
} from "@/lib/setting-api";
import { sortableIndicesFromSource } from "@/lib/crud-list-rows";
import { cn } from "@/lib/utils";

export function SettingCodeList() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const t = useTranslations();
  const perms = useResourcePermissions("setting", "setting_code");
  const listQuery = useCrudListQuery();
  const dragEnabled = listQuery.dragEnabled && perms.update;

  const [rows, setRows] = useState<SettingCodeItem[]>([]);
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { sort, order } = listQuery.sortParamsForFetch;
      const res = await fetchSettingCodes(locale, {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery,
        isActive: listQuery.isActiveFromStatus,
        sort: sort ?? undefined,
        order: order ?? undefined,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    } finally {
      setLoading(false);
    }
  }, [listQuery, locale, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const openEdit = async (row: SettingCodeItem) => {
    const full = await fetchSettingCodeById(locale, row.id);
    setCode(full.code);
    setValue(full.value);
    setIsActive(full.is_active);
    setEditId(row.id);
  };

  const save = async () => {
    try {
      if (editId === "new") {
        await createSettingCode(locale, { code, value, is_active: isActive });
      } else if (typeof editId === "number") {
        await patchSettingCode(locale, editId, { code, value, is_active: isActive });
      }
      setEditId(null);
      await load();
      toast.success(tCrud("toast.saved"));
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const rowActions = (): TableIconActionKey[] => tableIconActionsFromResource(perms);

  const handleDragEnd: ComponentProps<typeof DragDropProvider>["onDragEnd"] = (
    event
  ) => {
    if (event.canceled || !dragEnabled) return;
    const indices = sortableIndicesFromSource(event.operation?.source);
    if (!indices || indices.from === indices.to) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    const dragRow = rows[indices.from];
    const targetRow = rows[indices.to];
    if (!dragRow || !targetRow) {
      queueMicrotask(() => setSortableEpoch((e) => e + 1));
      return;
    }
    void reorderSettingCodes(locale, dragRow.id, targetRow.id)
      .then(() => load())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((e: unknown) => {
        queueMicrotask(() => setSortableEpoch((n) => n + 1));
        toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
      });
  };

  return (
    <>
      <CrudPageHeader
        title={tPage("settingCode.title")}
        description={tPage("settingCode.description")}
        actions={
          perms.create ? (
            <Button
              type="button"
              size="lg"
              onClick={() => {
                setCode("");
                setValue("");
                setIsActive(true);
                setEditId("new");
              }}
            >
              <Plus className="size-4" aria-hidden />
              {tCrud("btn.create")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <CrudSearchField value={listQuery.query} onChange={listQuery.setQuery} />
        <StatusFilterGroup
          value={listQuery.statusFilter}
          onChange={listQuery.setStatusFilter}
        />
      </div>
      <div className="rounded-md border">
        <DragDropProvider onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-hidden />
              <TableHead>{tCol("settingCode")}</TableHead>
              <TableHead>{tCol("value")}</TableHead>
              <TableHead className="text-center">{tCol("status")}</TableHead>
              <TableHead>{tCol("updatedAt")}</TableHead>
              <TableHead className="text-center">{tCol("action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={dragEnabled ? sortableEpoch : "static"}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  …
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) =>
                dragEnabled ? (
                  <SettingCodeSortableRow
                    key={row.id}
                    row={row}
                    index={index}
                    locale={locale}
                    dragEnabled={dragEnabled}
                    perms={perms}
                    tCrud={tCrud}
                    onEdit={() => void openEdit(row)}
                    onDelete={() => setDeleteId(row.id)}
                    rowActions={rowActions()}
                    onToggleActive={(v) =>
                      void patchSettingCode(locale, row.id, { is_active: v }).then(load)
                    }
                  />
                ) : (
                  <SettingCodeStaticRow
                    key={row.id}
                    row={row}
                    locale={locale}
                    perms={perms}
                    tCrud={tCrud}
                    onEdit={() => void openEdit(row)}
                    onDelete={() => setDeleteId(row.id)}
                    rowActions={rowActions()}
                    onToggleActive={(v) =>
                      void patchSettingCode(locale, row.id, { is_active: v }).then(load)
                    }
                  />
                )
              )
            )}
          </TableBody>
        </Table>
        </DragDropProvider>
      </div>
      <CrudPaginationBar
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        meta={{
          total,
          totalPages: Math.max(1, Math.ceil(total / listQuery.pageSize)),
        }}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.setPageSize}
      />
      {editId != null && (
        <CrudFormSheet open onOpenChange={(o) => !o && setEditId(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <CrudFormSheetHeader title={tPage("settingCode.title")} />
            <CrudFormSheetBody>
              <FormField id="sc-code" labelKey="col.settingCode" required value={code} onChange={setCode} />
              <FormField id="sc-value" labelKey="col.value" required value={value} onChange={setValue} />
              <StatusSwitchField checked={isActive} onCheckedChange={setIsActive} />
            </CrudFormSheetBody>
            <CrudFormSheetFooter
              dismissLabel={tCrud("btn.cancel")}
              showSave={perms.create || perms.update}
            />
          </form>
        </CrudFormSheet>
      )}
      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onConfirm={() => void deleteSettingCode(locale, deleteId!).then(() => {
          setDeleteId(null);
          void load();
        })}
        onOpenChange={(o) => !o && setDeleteId(null)}
      />
    </>
  );
}

function SettingCodeRowCells({
  row,
  locale,
  dragEnabled,
  handleRef,
  perms,
  tCrud,
  onEdit,
  onDelete,
  rowActions,
  onToggleActive,
}: {
  row: SettingCodeItem;
  locale: DisplayLocale;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  perms: ReturnType<typeof useResourcePermissions>;
  tCrud: ReturnType<typeof useTranslations<"crud">>;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onToggleActive: (v: boolean) => void;
}) {
  return (
    <>
      <TableCell className="w-10 text-center">
        <ButtonIcon
          type="button"
          size="md"
          variant="ghost"
          className={cn(
            "cursor-grab active:cursor-grabbing",
            !dragEnabled && "pointer-events-none opacity-40"
          )}
          ref={handleRef}
          disabled={!dragEnabled}
          aria-label={tCrud("reorder.drag")}
        >
          <GripVertical className="text-current" />
        </ButtonIcon>
      </TableCell>
      <TableCell>{row.code}</TableCell>
      <TableCell>{row.value}</TableCell>
      <TableCell className="text-center">
        <StatusSwitchField
          checked={row.is_active}
          disabled={!perms.update}
          onCheckedChange={onToggleActive}
        />
      </TableCell>
      <TableCell>{formatDateTime(row.updated_at, locale)}</TableCell>
      <TableCell className="text-center">
        <TableIconActions
          actions={rowActions}
          onAction={(key) => {
            if (tableRowDetailAction(key)) onEdit();
            if (key === "delete") onDelete();
          }}
        />
      </TableCell>
    </>
  );
}

function SettingCodeSortableRow(props: {
  row: SettingCodeItem;
  index: number;
  locale: DisplayLocale;
  dragEnabled: boolean;
  perms: ReturnType<typeof useResourcePermissions>;
  tCrud: ReturnType<typeof useTranslations<"crud">>;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onToggleActive: (v: boolean) => void;
}) {
  const { row, index, dragEnabled, ...rest } = props;
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });
  return (
    <TableRow ref={ref} className={cn(isDragging && "opacity-50")}>
      <SettingCodeRowCells
        row={row}
        dragEnabled={dragEnabled}
        handleRef={handleRef}
        {...rest}
      />
    </TableRow>
  );
}

function SettingCodeStaticRow({
  row,
  locale,
  perms,
  tCrud,
  onEdit,
  onDelete,
  rowActions,
  onToggleActive,
}: {
  row: SettingCodeItem;
  locale: DisplayLocale;
  perms: ReturnType<typeof useResourcePermissions>;
  tCrud: ReturnType<typeof useTranslations<"crud">>;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onToggleActive: (v: boolean) => void;
}) {
  return (
    <TableRow>
      <SettingCodeRowCells
        row={row}
        locale={locale}
        dragEnabled={false}
        perms={perms}
        tCrud={tCrud}
        onEdit={onEdit}
        onDelete={onDelete}
        rowActions={rowActions}
        onToggleActive={onToggleActive}
      />
    </TableRow>
  );
}
