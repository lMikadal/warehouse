"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  LocationLangEditSheet,
  type LocationEditPayload,
  type LocationSheetState,
} from "./location-lang-edit-sheet";
import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
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
import {
  CrudReorderRejectedError,
  useCrudSortableReorder,
} from "@/hooks/use-crud-sortable-reorder";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  tableIconActionsFromResource,
  tableRowDetailAction,
  type ResourceActions,
} from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createLocation,
  deleteLocation,
  fetchLocationById,
  fetchLocationList,
  LocationApiError,
  patchLocation,
  reorderLocations,
  type LocationItem,
} from "@/lib/location-api";
import { cn } from "@/lib/utils";

const TABLE_COLUMNS = 5;

export function LocationLangList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.locationLocation");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const t = useTranslations();

  const perms = useResourcePermissions("location", "location_location");

  const [rows, setRows] = useState<LocationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<LocationSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const listQuery = useCrudListQuery();
  const dragEnabled = listQuery.dragEnabled && perms.update;

  const refreshShell = useCallback(() => {
    router.refresh();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { sort, order } = listQuery.sortParamsForFetch;
      const res = await fetchLocationList(locale, {
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
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    } finally {
      setLoading(false);
    }
  }, [
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    listQuery.page,
    listQuery.pageSize,
    listQuery.sortParamsForFetch,
    locale,
    t,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const openCreate = () => setSheet({ mode: "create" });

  const openEdit = async (row: LocationItem) => {
    try {
      const full = await fetchLocationById(locale, row.id);
      setSheet({
        mode: "edit",
        row: full,
        names: {
          th: full.names?.th ?? "",
          en: full.names?.en ?? "",
        },
      });
    } catch (e) {
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    }
  };

  const onSave = async (id: number | null, payload: LocationEditPayload) => {
    try {
      const body = {
        is_active: payload.isActive,
        names: { th: payload.nameTh, en: payload.nameEn },
      };
      if (id == null) {
        await createLocation(locale, body);
        toast.success(tCrud("toast.created"));
      } else {
        await patchLocation(locale, id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await load();
      refreshShell();
    } catch (e) {
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    }
  };

  const onToggleActive = async (row: LocationItem, active: boolean) => {
    try {
      await patchLocation(locale, row.id, { is_active: active });
      await load();
      refreshShell();
    } catch (e) {
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    }
  };

  const onDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteLocation(locale, deleteId);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await load();
      refreshShell();
    } catch (e) {
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    }
  };

  const rowActions = (row: LocationItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms, { rowId: row.id });

  const { sortableEpoch, handleDragEnd } = useCrudSortableReorder({
    rows,
    dragEnabled: Boolean(dragEnabled),
    persistReorder: async (dragId, targetId) => {
      await reorderLocations(locale, dragId, targetId);
    },
    onSuccess: () => {
      void load();
      toast.success(tCrud("toast.reordered"));
    },
    onError: (e) => {
      if (e instanceof CrudReorderRejectedError) return;
      toast.error(e instanceof LocationApiError ? e.message : t("error.generic"));
    },
  });

  return (
    <>
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("description")}
        actions={
          perms.create ? (
            <Button type="button" size="lg" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {tCrud("btn.create")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
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
                <TableHead>{tCol("name")}</TableHead>
                <TableHead className="text-center">{tCol("status")}</TableHead>
                <TableHead>{tCol("updatedAt")}</TableHead>
                <TableHead className="data-table__actions-col text-center">
                  {tCol("action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={dragEnabled ? sortableEpoch : "static"}>
              {loading ? (
                <CrudListTableSkeleton
                  columnCount={TABLE_COLUMNS - 1}
                  rowCount={10}
                  showDragColumn
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={TABLE_COLUMNS} className="text-center">
                    {t("error.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) =>
                  dragEnabled ? (
                    <LocationSortableRow
                      key={row.id}
                      row={row}
                      index={index}
                      locale={locale}
                      dragEnabled={dragEnabled}
                      perms={perms}
                      onToggleActive={onToggleActive}
                      onEdit={() => void openEdit(row)}
                      onDelete={() => setDeleteId(row.id)}
                      rowActions={rowActions(row)}
                    />
                  ) : (
                    <LocationStaticRow
                      key={row.id}
                      row={row}
                      locale={locale}
                      perms={perms}
                      onToggleActive={onToggleActive}
                      onEdit={() => void openEdit(row)}
                      onDelete={() => setDeleteId(row.id)}
                      rowActions={rowActions(row)}
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
      <LocationLangEditSheet
        state={sheet}
        canSave={sheet?.mode === "create" ? perms.create : perms.update}
        onOpenChange={(o) => !o && setSheet(null)}
        onSave={onSave}
      />
      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}

function LocationRowCells({
  row,
  locale,
  dragEnabled,
  handleRef,
  perms,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
}: {
  row: LocationItem;
  locale: DisplayLocale;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  perms: ResourceActions;
  onToggleActive: (row: LocationItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
}) {
  const tCrud = useTranslations("crud");

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
      <TableCell>{row.name}</TableCell>
      <TableCell className="text-center">
        <StatusSwitchField
          checked={row.is_active}
          disabled={!perms.update}
          onCheckedChange={(v) => onToggleActive(row, v)}
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

function LocationSortableRow({
  row,
  index,
  locale,
  dragEnabled,
  perms,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
}: {
  row: LocationItem;
  index: number;
  locale: DisplayLocale;
  dragEnabled: boolean;
  perms: ResourceActions;
  onToggleActive: (row: LocationItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });

  return (
    <TableRow ref={ref} className={cn(isDragging && "opacity-50")}>
      <LocationRowCells
        row={row}
        locale={locale}
        dragEnabled={dragEnabled}
        handleRef={handleRef}
        perms={perms}
        onToggleActive={onToggleActive}
        onEdit={onEdit}
        onDelete={onDelete}
        rowActions={rowActions}
      />
    </TableRow>
  );
}

function LocationStaticRow({
  row,
  locale,
  perms,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
}: {
  row: LocationItem;
  locale: DisplayLocale;
  perms: ResourceActions;
  onToggleActive: (row: LocationItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
}) {
  return (
    <TableRow>
      <LocationRowCells
        row={row}
        locale={locale}
        dragEnabled={false}
        perms={perms}
        onToggleActive={onToggleActive}
        onEdit={onEdit}
        onDelete={onDelete}
        rowActions={rowActions}
      />
    </TableRow>
  );
}
