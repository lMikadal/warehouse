"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { SettingLangListConfig } from "./setting-config";
import {
  SettingLangEditSheet,
  type SettingLangEditPayload,
  type SettingLangSheetState,
} from "./setting-lang-edit-sheet";
import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
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
import { cn } from "@/lib/utils";
import { sortableIndicesFromSource } from "@/lib/crud-list-rows";
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
  type ResourceActions,
} from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createSettingLang,
  deleteSettingLang,
  fetchSettingLangById,
  fetchSettingLangList,
  patchSettingLang,
  reorderSettingLang,
  SettingApiError,
  type SettingLangItem,
} from "@/lib/setting-api";

type TriFilter = "" | "yes" | "no";

function BoolTriFilter({
  value,
  onChange,
  ariaLabel,
  labelAll,
  labelYes,
  labelNo,
}: {
  value: TriFilter;
  onChange: (v: TriFilter) => void;
  ariaLabel: string;
  labelAll: string;
  labelYes: string;
  labelNo: string;
}) {
  const options: { value: TriFilter; label: string }[] = [
    { value: "", label: labelAll },
    { value: "yes", label: labelYes },
    { value: "no", label: labelNo },
  ];
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded-lg border border-border"
    >
      {options.map((opt, index) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value || "all"}
            type="button"
            variant="ghost"
            size="lg"
            aria-pressed={active}
            className={cn(
              "rounded-none border-0 px-3 shadow-none",
              index > 0 && "border-l border-border",
              active &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

type Props = { config: SettingLangListConfig };

export function SettingLangList({ config }: Props) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const t = useTranslations();

  const perms = useResourcePermissions("setting", config.permType);

  const [rows, setRows] = useState<SettingLangItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SettingLangSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saleFilter, setSaleFilter] = useState<TriFilter>("");
  const [purchaseFilter, setPurchaseFilter] = useState<TriFilter>("");
  const [prefixType, setPrefixType] = useState<"" | "person" | "company">("");
  const [sortableEpoch, setSortableEpoch] = useState(0);

  const filtersActive =
    (config.paymentFilters &&
      (saleFilter !== "" || purchaseFilter !== "")) ||
    (config.prefixTypeFilter && prefixType !== "");

  const listQuery = useCrudListQuery({ extraFiltered: filtersActive });
  const dragEnabled =
    listQuery.dragEnabled &&
    perms.update &&
    (!config.prefixTypeFilter || prefixType !== "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { sort, order } = listQuery.sortParamsForFetch;
      const res = await fetchSettingLangList(locale, config.segment, {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery,
        isActive: listQuery.isActiveFromStatus,
        sort: sort ?? undefined,
        order: order ?? undefined,
        isSale:
          saleFilter === "" ? undefined : saleFilter === "yes",
        isPurchase:
          purchaseFilter === "" ? undefined : purchaseFilter === "yes",
        prefixType: prefixType || undefined,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    } finally {
      setLoading(false);
    }
  }, [
    config.segment,
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    listQuery.page,
    listQuery.pageSize,
    listQuery.sortParamsForFetch,
    locale,
    prefixType,
    purchaseFilter,
    saleFilter,
    t,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const openCreate = () => {
    setSheet({
      mode: "create",
      prefixType: prefixType || undefined,
    });
  };

  const openEdit = async (row: SettingLangItem) => {
    try {
      const full = await fetchSettingLangById(locale, config.segment, row.id);
      setSheet({
        mode: "edit",
        row: full,
        names: {
          th: full.names?.th ?? "",
          en: full.names?.en ?? "",
        },
      });
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const buildBody = (payload: SettingLangEditPayload) => {
    const body: Record<string, unknown> = {
      is_active: payload.isActive,
      names: { th: payload.nameTh, en: payload.nameEn },
    };
    if (config.paymentFilters) {
      body.is_sale = payload.isSale;
      body.is_purchase = payload.isPurchase;
    }
    if (config.saleDefault) body.is_default = payload.isDefault;
    if (config.claimFlags) {
      body.is_claim = payload.isClaim;
      body.is_return = payload.isReturn;
    }
    if (config.showCodeColumn) {
      body.code = payload.code;
      if (sheet?.mode === "create") body.type = payload.prefixType;
    }
    return body;
  };

  const onSave = async (id: number | null, payload: SettingLangEditPayload) => {
    try {
      const body = buildBody(payload);
      if (id == null) {
        await createSettingLang(locale, config.segment, body);
        toast.success(tCrud("toast.saved"));
      } else {
        await patchSettingLang(locale, config.segment, id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await load();
    } catch (e) {
      const msg = e instanceof SettingApiError ? e.message : t("error.generic");
      toast.error(msg);
    }
  };

  const onToggleActive = async (row: SettingLangItem, active: boolean) => {
    try {
      await patchSettingLang(locale, config.segment, row.id, { is_active: active });
      await load();
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const onDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteSettingLang(locale, config.segment, deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const rowActions = (row: SettingLangItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms, { rowId: row.id });

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
    const reorderExtra =
      config.prefixTypeFilter && prefixType
        ? { type: prefixType }
        : undefined;
    void reorderSettingLang(
      locale,
      config.segment,
      dragRow.id,
      targetRow.id,
      reorderExtra
    )
      .then(() => load())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((e: unknown) => {
        queueMicrotask(() => setSortableEpoch((e) => e + 1));
        toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
      });
  };

  return (
    <>
      <CrudPageHeader
        title={tPage(`${config.pageKey}.title`)}
        description={tPage(`${config.pageKey}.description`)}
        actions={
          perms.create ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="text-current" />
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
        {config.paymentFilters && (
          <>
            <BoolTriFilter
              value={saleFilter}
              onChange={(v) => {
                setSaleFilter(v);
                listQuery.setPage(1);
              }}
              ariaLabel={tCol("sale")}
              labelAll={tCrud("filter.all")}
              labelYes={tCol("yes")}
              labelNo={tCol("no")}
            />
            <BoolTriFilter
              value={purchaseFilter}
              onChange={(v) => {
                setPurchaseFilter(v);
                listQuery.setPage(1);
              }}
              ariaLabel={tCol("purchase")}
              labelAll={tCrud("filter.all")}
              labelYes={tCol("yes")}
              labelNo={tCol("no")}
            />
          </>
        )}
        {config.prefixTypeFilter && (
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={prefixType}
            onChange={(e) => {
              setPrefixType(e.target.value as typeof prefixType);
              listQuery.setPage(1);
            }}
          >
            <option value="">{tCol("type")}</option>
            <option value="person">{t("prefixType.person")}</option>
            <option value="company">{t("prefixType.company")}</option>
          </select>
        )}
      </div>
      <div className="rounded-md border">
        <DragDropProvider onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-hidden />
              <TableHead>{tCol("name")}</TableHead>
              {config.showCodeColumn && <TableHead>{tCol("settingCode")}</TableHead>}
              {config.paymentFilters && (
                <>
                  <TableHead className="text-center">{tCol("sale")}</TableHead>
                  <TableHead className="text-center">{tCol("purchase")}</TableHead>
                </>
              )}
              {config.saleDefault && (
                <TableHead className="text-center">{tCol("default")}</TableHead>
              )}
              {config.claimFlags && (
                <>
                  <TableHead className="text-center">{tCol("claim")}</TableHead>
                  <TableHead className="text-center">{tCol("return")}</TableHead>
                </>
              )}
              <TableHead className="text-center">{tCol("status")}</TableHead>
              <TableHead>{tCol("updatedAt")}</TableHead>
              <TableHead className="data-table__actions-col text-center">
                {tCol("action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={dragEnabled ? sortableEpoch : "static"}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  …
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) =>
                dragEnabled ? (
                  <SettingLangSortableRow
                    key={row.id}
                    row={row}
                    index={index}
                    locale={locale}
                    config={config}
                    dragEnabled={dragEnabled}
                    perms={perms}
                    onToggleActive={onToggleActive}
                    onEdit={() => void openEdit(row)}
                    onDelete={() => setDeleteId(row.id)}
                    rowActions={rowActions(row)}
                    onDefaultToggle={(v) =>
                      void patchSettingLang(locale, config.segment, row.id, {
                        is_default: v,
                      }).then(load)
                    }
                  />
                ) : (
                  <SettingLangStaticRow
                    key={row.id}
                    row={row}
                    locale={locale}
                    config={config}
                    perms={perms}
                    onToggleActive={onToggleActive}
                    onEdit={() => void openEdit(row)}
                    onDelete={() => setDeleteId(row.id)}
                    rowActions={rowActions(row)}
                    onDefaultToggle={(v) =>
                      void patchSettingLang(locale, config.segment, row.id, {
                        is_default: v,
                      }).then(load)
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
      <SettingLangEditSheet
        config={config}
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

function SettingLangRowCells({
  row,
  locale,
  config,
  dragEnabled,
  handleRef,
  perms,
  tCol,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
  onDefaultToggle,
}: {
  row: SettingLangItem;
  locale: DisplayLocale;
  config: SettingLangListConfig;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  perms: ResourceActions;
  tCol: ReturnType<typeof useTranslations<"col">>;
  onToggleActive: (row: SettingLangItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onDefaultToggle: (v: boolean) => void;
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
      {config.showCodeColumn && <TableCell>{row.code}</TableCell>}
      {config.paymentFilters && (
        <>
          <TableCell className="text-center">
            {row.is_sale ? tCol("yes") : tCol("no")}
          </TableCell>
          <TableCell className="text-center">
            {row.is_purchase ? tCol("yes") : tCol("no")}
          </TableCell>
        </>
      )}
      {config.saleDefault && (
        <TableCell className="text-center">
          <StatusSwitchField
            checked={row.is_default ?? false}
            disabled={!perms.update}
            onCheckedChange={onDefaultToggle}
          />
        </TableCell>
      )}
      {config.claimFlags && (
        <>
          <TableCell className="text-center">
            {row.is_claim ? tCol("yes") : tCol("no")}
          </TableCell>
          <TableCell className="text-center">
            {row.is_return ? tCol("yes") : tCol("no")}
          </TableCell>
        </>
      )}
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

function SettingLangSortableRow({
  row,
  index,
  locale,
  config,
  dragEnabled,
  perms,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
  onDefaultToggle,
}: {
  row: SettingLangItem;
  index: number;
  locale: DisplayLocale;
  config: SettingLangListConfig;
  dragEnabled: boolean;
  perms: ResourceActions;
  onToggleActive: (row: SettingLangItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onDefaultToggle: (v: boolean) => void;
}) {
  const tCol = useTranslations("col");
  const { ref, handleRef, isDragging } = useSortable({
    id: row.id,
    index,
    disabled: !dragEnabled,
  });

  return (
    <TableRow ref={ref} className={cn(isDragging && "opacity-50")}>
      <SettingLangRowCells
        row={row}
        locale={locale}
        config={config}
        dragEnabled={dragEnabled}
        handleRef={handleRef}
        perms={perms}
        tCol={tCol}
        onToggleActive={onToggleActive}
        onEdit={onEdit}
        onDelete={onDelete}
        rowActions={rowActions}
        onDefaultToggle={onDefaultToggle}
      />
    </TableRow>
  );
}

function SettingLangStaticRow({
  row,
  locale,
  config,
  perms,
  onToggleActive,
  onEdit,
  onDelete,
  rowActions,
  onDefaultToggle,
}: {
  row: SettingLangItem;
  locale: DisplayLocale;
  config: SettingLangListConfig;
  perms: ResourceActions;
  onToggleActive: (row: SettingLangItem, active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  rowActions: TableIconActionKey[];
  onDefaultToggle: (v: boolean) => void;
}) {
  const tCol = useTranslations("col");

  return (
    <TableRow>
      <SettingLangRowCells
        row={row}
        locale={locale}
        config={config}
        dragEnabled={false}
        perms={perms}
        tCol={tCol}
        onToggleActive={onToggleActive}
        onEdit={onEdit}
        onDelete={onDelete}
        rowActions={rowActions}
        onDefaultToggle={onDefaultToggle}
      />
    </TableRow>
  );
}
