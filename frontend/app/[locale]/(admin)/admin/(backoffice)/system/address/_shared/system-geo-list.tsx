"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  SystemGeoEditSheet,
  type SystemGeoEditPayload,
  type SystemGeoSheetState,
  type ParentOption,
} from "./system-geo-edit-sheet";
import { GeoColumnFilterCombobox } from "./geo-column-filter-combobox";
import type { SystemGeoListConfig } from "./system-geo-config";
import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import {
  StatusFilterGroup,
  type StatusFilterValue,
} from "@/components/molecules/status-filter-group";
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
  TableSortHead,
  type TableSortDirection,
} from "@/components/ui/table";
import type { PageSizeOption } from "@/lib/crud-pagination";
import { sortableIndicesFromSource } from "@/lib/crud-list-rows";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createSystemGeo,
  deleteSystemGeo,
  fetchSystemGeoById,
  fetchSystemGeoList,
  patchSystemGeo,
  reorderSystemGeo,
  SystemGeoApiError,
  type GeoResource,
  type SystemGeoListParams,
  type SystemGeoRow,
} from "@/lib/system-geo-api";
import { cn } from "@/lib/utils";

type ColSortKey = "sku" | "name" | "status" | "updatedAt" | "postcode";

function sortFieldLabel(
  tCrud: ReturnType<typeof useTranslations<"crud">>,
  tCol: ReturnType<typeof useTranslations<"col">>,
  sortKey: string | null,
  sortDir: TableSortDirection | null,
  fieldKey: ColSortKey
): string {
  const colKey =
    fieldKey === "status"
      ? "status"
      : fieldKey === "updatedAt"
        ? "updatedAt"
        : fieldKey;
  const field = tCol(colKey);
  if (sortKey !== sortApiKey(fieldKey) || !sortDir) {
    return tCrud("sort.none", { field });
  }
  return sortDir === "desc"
    ? tCrud("sort.desc", { field })
    : tCrud("sort.asc", { field });
}

function sortApiKey(col: ColSortKey): string {
  if (col === "status") return "is_active";
  if (col === "updatedAt") return "updated_at";
  return col;
}

function GeoTableCells({
  row,
  config,
  locale,
  dragEnabled,
  handleRef,
  onToggleActive,
  onAction,
}: {
  row: SystemGeoRow;
  config: SystemGeoListConfig;
  locale: DisplayLocale;
  dragEnabled: boolean;
  handleRef?: (element: Element | null) => void;
  onToggleActive: (id: number, active: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
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
        >
          <GripVertical className="text-current" />
        </ButtonIcon>
      </TableCell>
      {config.parentColumnLabel ? (
        <TableCell>{row.parent_label}</TableCell>
      ) : null}
      <TableCell>{row.sku}</TableCell>
      <TableCell>{row.name}</TableCell>
      {config.showPostcode ? (
        <TableCell className="text-center">{row.postcode}</TableCell>
      ) : null}
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StatusSwitchField
            checked={row.is_active}
            onCheckedChange={(checked) => onToggleActive(row.id, checked)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        {formatDateTime(row.updated_at, locale)}
      </TableCell>
      <TableCell className="text-center">
        <TableIconActions
          actions={["edit", "delete"]}
          onAction={(action) => onAction(row.id, action)}
        />
      </TableCell>
    </>
  );
}

function SortableGeoRow(props: {
  row: SystemGeoRow;
  index: number;
  config: SystemGeoListConfig;
  locale: DisplayLocale;
  dragEnabled: boolean;
  onToggleActive: (id: number, active: boolean) => void;
  onAction: (id: number, action: TableIconActionKey) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: props.row.id,
    index: props.index,
    disabled: !props.dragEnabled,
  });
  return (
    <TableRow ref={ref} className={cn(isDragging && "opacity-50")}>
      <GeoTableCells {...props} handleRef={handleRef} />
    </TableRow>
  );
}

async function loadOptions(
  resource: GeoResource,
  locale: string,
  params: SystemGeoListParams
): Promise<ParentOption[]> {
  const { rows } = await fetchSystemGeoList(resource, locale, {
    ...params,
    page: 1,
    limit: 100,
    isActive: true,
  });
  return rows.map((r) => ({ value: String(r.id), label: r.name }));
}

export function SystemGeoList({ config }: { config: SystemGeoListConfig }) {
  const locale = useLocale() as DisplayLocale;
  const tToast = useTranslations("toast");
  const tError = useTranslations("error");
  const tPage = useTranslations(`page.${config.pageKey}`);
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tComboboxEmpty = useTranslations("form.combobox");

  const [rows, setRows] = useState<SystemGeoRow[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection | null>(null);
  const [sheet, setSheet] = useState<SystemGeoSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [countryOptions, setCountryOptions] = useState<ParentOption[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<ParentOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<ParentOption[]>([]);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtersActive =
    filterCountry !== "" || filterProvince !== "" || filterDistrict !== "";

  const listFiltered =
    debouncedQuery.trim() !== "" || statusFilter !== "" || filtersActive;

  const listFetchParams = useMemo((): SystemGeoListParams => {
    const isActive =
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined;
    const headerSortActive = sortKey != null && sortDir != null;
    return {
      page,
      limit: pageSize,
      search: debouncedQuery.trim() || undefined,
      isActive,
      systemCountryId: filterCountry ? Number(filterCountry) : undefined,
      systemProvinceId: filterProvince ? Number(filterProvince) : undefined,
      systemDistrictId: filterDistrict ? Number(filterDistrict) : undefined,
      sort: !listFiltered && headerSortActive ? sortKey : undefined,
      order: !listFiltered && headerSortActive ? sortDir ?? undefined : undefined,
    };
  }, [
    page,
    pageSize,
    debouncedQuery,
    statusFilter,
    filterCountry,
    filterProvince,
    filterDistrict,
    sortKey,
    sortDir,
    listFiltered,
  ]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemGeoList(
        config.resource,
        locale,
        listFetchParams
      );
      setRows(result.rows);
      setListMeta(result.meta);
    } catch (err: unknown) {
      toast.error(
        err instanceof SystemGeoApiError ? err.message : tToast("demoError")
      );
    } finally {
      setLoading(false);
    }
  }, [config.resource, locale, listFetchParams, tToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!config.filterLevels?.includes("country")) return;
    void loadOptions("countries", locale, { page: 1, limit: 100 }).then(
      setCountryOptions
    );
  }, [config.filterLevels, locale]);

  useEffect(() => {
    if (!filterCountry && config.filterLevels?.includes("province")) {
      setProvinceOptions([]);
      return;
    }
    if (!config.filterLevels?.includes("province")) return;
    void loadOptions("provinces", locale, {
      page: 1,
      limit: 100,
      systemCountryId: filterCountry ? Number(filterCountry) : undefined,
    }).then(setProvinceOptions);
  }, [filterCountry, config.filterLevels, locale]);

  useEffect(() => {
    if (!filterProvince && config.filterLevels?.includes("district")) {
      setDistrictOptions([]);
      return;
    }
    if (!config.filterLevels?.includes("district")) return;
    void loadOptions("districts", locale, {
      page: 1,
      limit: 100,
      systemProvinceId: filterProvince ? Number(filterProvince) : undefined,
    }).then(setDistrictOptions);
  }, [filterProvince, config.filterLevels, locale]);

  useEffect(() => {
    if (!config.createParentKey) {
      setParentOptions([]);
      return;
    }
    const resource: GeoResource =
      config.createParentKey === "system_country_id"
        ? "countries"
        : config.createParentKey === "system_province_id"
          ? "provinces"
          : "districts";
    void loadOptions(resource, locale, { page: 1, limit: 100 }).then(
      setParentOptions
    );
  }, [config.createParentKey, locale]);

  const total = listMeta.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginationMeta = { total, totalPages };
  const headerSortActive = sortKey != null && sortDir != null;
  const dragEnabled = !listFiltered && !headerSortActive;

  const handleSortChange = (
    nextKey: string | null,
    nextDir: TableSortDirection | null
  ) => {
    if (listFiltered) return;
    setSortKey(nextKey);
    setSortDir(nextDir);
    setPage(1);
  };

  const handleToggleActive = (id: number, active: boolean) => {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, is_active: active } : r))
    );
    void patchSystemGeo(config.resource, id, { is_active: active }, locale)
      .then(() => {
        toast.success(tCrud("toast.saved"));
        return loadList();
      })
      .catch((err: unknown) => {
        setRows((current) =>
          current.map((r) =>
            r.id === id ? { ...r, is_active: prev.is_active } : r
          )
        );
        toast.error(
          err instanceof SystemGeoApiError ? err.message : tToast("demoError")
        );
      });
  };

  const buildCreateBody = (payload: SystemGeoEditPayload) => {
    const body = {
      sku: payload.sku || undefined,
      postcode: payload.postcode || undefined,
      is_active: payload.isActive,
      names: { th: payload.nameTh, en: payload.nameEn },
    };
    if (config.createParentKey === "system_country_id") {
      return { ...body, system_country_id: Number(payload.parentId) };
    }
    if (config.createParentKey === "system_province_id") {
      return { ...body, system_province_id: Number(payload.parentId) };
    }
    if (config.createParentKey === "system_district_id") {
      return { ...body, system_district_id: Number(payload.parentId) };
    }
    return body;
  };

  const handleSave = async (
    id: number | null,
    payload: SystemGeoEditPayload
  ) => {
    try {
      if (id == null) {
        await createSystemGeo(
          config.resource,
          buildCreateBody(payload),
          locale
        );
        toast.success(tCrud("toast.created"));
      } else {
        await patchSystemGeo(
          config.resource,
          id,
          buildCreateBody(payload),
          locale
        );
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof SystemGeoApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleRowAction = async (id: number, action: TableIconActionKey) => {
    if (action === "delete") {
      setDeleteId(id);
      return;
    }
    if (action === "edit") {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      try {
        const detail = await fetchSystemGeoById(config.resource, id, locale);
        setSheet({
          mode: "edit",
          row,
          names: {
            th: detail.names?.th ?? row.name,
            en: detail.names?.en ?? row.name,
          },
        });
      } catch (err) {
        toast.error(
          err instanceof SystemGeoApiError ? err.message : tToast("demoError")
        );
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteSystemGeo(config.resource, deleteId, locale);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await loadList();
    } catch (err) {
      toast.error(
        err instanceof SystemGeoApiError ? err.message : tToast("demoError")
      );
    }
  };

  const handleDragEnd: ComponentProps<
    typeof DragDropProvider
  >["onDragEnd"] = (event) => {
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
    void reorderSystemGeo(
      config.resource,
      dragRow.id,
      targetRow.id,
      locale
    )
      .then(() => loadList())
      .then(() => toast.success(tCrud("toast.reordered")))
      .catch((err: unknown) => {
        queueMicrotask(() => setSortableEpoch((e) => e + 1));
        toast.error(
          err instanceof SystemGeoApiError ? err.message : undefined
        );
      });
  };

  const colSpan =
    5 +
    (config.parentColumnLabel ? 1 : 0) +
    (config.showPostcode ? 1 : 0);

  return (
    <div className="space-y-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          <Button type="button" size="lg" onClick={() => setSheet({ mode: "create" })}>
            <Plus className="text-current" />
            {tPage("add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSortKey(null);
            setSortDir(null);
            setPage(1);
          }}
        />
        <StatusFilterGroup
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setSortKey(null);
            setSortDir(null);
            setPage(1);
          }}
        />
        {config.filterLevels?.includes("country") ? (
          <GeoColumnFilterCombobox
            label={tCol("country")}
            placeholder={tCrud("filter.select", { label: tCol("country") })}
            emptyLabel={tComboboxEmpty("noResults")}
            value={filterCountry}
            options={countryOptions}
            inputClassName="w-[min(100%,12rem)]"
            onChange={(value) => {
              setFilterCountry(value);
              setFilterProvince("");
              setFilterDistrict("");
              setPage(1);
            }}
          />
        ) : null}
        {config.filterLevels?.includes("province") ? (
          <GeoColumnFilterCombobox
            label={tCol("province")}
            placeholder={tCrud("filter.select", { label: tCol("province") })}
            emptyLabel={tComboboxEmpty("noResults")}
            value={filterProvince}
            options={provinceOptions}
            inputClassName="w-[min(100%,12rem)]"
            disabled={!filterCountry}
            onChange={(value) => {
              setFilterProvince(value);
              setFilterDistrict("");
              setPage(1);
            }}
          />
        ) : null}
        {config.filterLevels?.includes("district") ? (
          <GeoColumnFilterCombobox
            label={tCol("district")}
            placeholder={tCrud("filter.select", { label: tCol("district") })}
            emptyLabel={tComboboxEmpty("noResults")}
            value={filterDistrict}
            options={districtOptions}
            inputClassName="w-[min(100%,12rem)]"
            disabled={!filterProvince}
            onChange={(value) => {
              setFilterDistrict(value);
              setPage(1);
            }}
          />
        ) : null}
      </div>

      <div className="surface-table-wrap">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                {config.parentColumnLabel ? (
                  <TableHead>{tCol(config.parentColumnLabel)}</TableHead>
                ) : null}
                <TableSortHead
                  columnKey={sortApiKey("sku")}
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "sku"
                  )}
                >
                  {tCol("sku")}
                </TableSortHead>
                <TableSortHead
                  columnKey={sortApiKey("name")}
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "name"
                  )}
                >
                  {tCol("name")}
                </TableSortHead>
                {config.showPostcode ? (
                  <TableSortHead
                    className="text-center"
                    align="center"
                    columnKey={sortApiKey("postcode")}
                    sortable={!listFiltered}
                    activeSortKey={sortKey}
                    sortDirection={sortDir}
                    onSortChange={handleSortChange}
                    sortLabel={sortFieldLabel(
                      tCrud,
                      tCol,
                      sortKey,
                      sortDir,
                      "postcode"
                    )}
                  >
                    {tCol("postcode")}
                  </TableSortHead>
                ) : null}
                <TableSortHead
                  className="text-center"
                  align="center"
                  columnKey={sortApiKey("status")}
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "status"
                  )}
                >
                  {tCol("status")}
                </TableSortHead>
                <TableSortHead
                  className="text-center"
                  align="center"
                  columnKey={sortApiKey("updatedAt")}
                  sortable={!listFiltered}
                  activeSortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSortChange}
                  sortLabel={sortFieldLabel(
                    tCrud,
                    tCol,
                    sortKey,
                    sortDir,
                    "updatedAt"
                  )}
                >
                  {tCol("updatedAt")}
                </TableSortHead>
                <TableHead className="data-table__actions-col text-center">
                  {tCol("action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={sortableEpoch}>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center">
                    …
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center">
                    {tError("noData")}
                  </TableCell>
                </TableRow>
              ) : dragEnabled ? (
                rows.map((row, index) => (
                  <SortableGeoRow
                    key={row.id}
                    row={row}
                    index={index}
                    config={config}
                    locale={locale}
                    dragEnabled={dragEnabled}
                    onToggleActive={handleToggleActive}
                    onAction={(id, action) => void handleRowAction(id, action)}
                  />
                ))
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <GeoTableCells
                      row={row}
                      config={config}
                      locale={locale}
                      dragEnabled={false}
                      onToggleActive={handleToggleActive}
                      onAction={(id, action) => void handleRowAction(id, action)}
                    />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DragDropProvider>
      </div>

      <CrudPaginationBar
        page={safePage}
        pageSize={pageSize}
        meta={paginationMeta}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <SystemGeoEditSheet
        config={config}
        state={sheet}
        parentOptions={parentOptions}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
        onSave={handleSave}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
