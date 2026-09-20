"use client";

import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
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
import {
  conditionsFromApi,
  conditionsToPatchBody,
  EMPTY_ZONE_CONDITIONS,
  WarehouseNodeEditSheet,
  type WarehouseNodeFormInitial,
  type WarehouseNodeSavePayload,
  type WarehouseSheetState,
} from "./warehouse-node-edit-sheet";
import {
  WarehouseZoneExpandGrid,
  type WarehouseZoneExpandRow,
} from "./warehouse-zone-expand-grid";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { tableIconActionsFromResource } from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  createWarehouseNode,
  deleteWarehouseNode,
  fetchWarehouseById,
  fetchWarehouseList,
  patchWarehouseConditions,
  patchWarehouseNode,
  WarehouseApiError,
  type WarehouseCondition,
  type WarehouseListItem,
} from "@/lib/warehouse-api";

const COLS = 7;

export function WarehouseListPage() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.warehouseList");
  const tWh = useTranslations("warehouse");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const perms = useResourcePermissions("warehouse", "warehouse_list");
  const rowActions = tableIconActionsFromResource(perms);

  const listQuery = useCrudListQuery();
  const [rows, setRows] = useState<WarehouseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [zonesByWh, setZonesByWh] = useState<
    Record<number, WarehouseZoneExpandRow[]>
  >({});
  const [sheet, setSheet] = useState<WarehouseSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sheetInitial, setSheetInitial] = useState<WarehouseNodeFormInitial>({
    sku: "",
    nameTh: "",
    nameEn: "",
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWarehouseList(locale, {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery,
        isActive: listQuery.isActiveFromStatus,
        type: "warehouse",
        includeStats: true,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch {
      toast.error(tError("forbidden"));
    } finally {
      setLoading(false);
    }
  }, [
    locale,
    listQuery.page,
    listQuery.pageSize,
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    tError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadZones = useCallback(
    async (warehouseId: number) => {
      const res = await fetchWarehouseList(locale, {
        page: 1,
        limit: 100,
        type: "zone",
        parentId: warehouseId,
      });
      const details = await Promise.all(
        res.items.map(async (z) => {
          const row = await fetchWarehouseById(locale, z.id);
          return {
            id: z.id,
            sku: z.sku,
            name: z.name,
            is_active: z.is_active,
            conditions:
              (row.conditions as WarehouseCondition[] | undefined) ?? [],
          };
        })
      );
      setZonesByWh((prev) => ({ ...prev, [warehouseId]: details }));
    },
    [locale]
  );

  async function toggleExpand(id: number) {
    const next = !expanded[id];
    setExpanded((e) => ({ ...e, [id]: next }));
    if (next && !zonesByWh[id]) {
      await loadZones(id);
    }
  }

  async function openSheet(mode: WarehouseSheetState) {
    if (mode.id) {
      const row = await fetchWarehouseById(locale, mode.id);
      const names = (row.names ?? {}) as { th?: string; en?: string };
      const nextInitial: WarehouseNodeFormInitial = {
        sku: String(row.sku ?? ""),
        nameTh: names.th ?? "",
        nameEn: names.en ?? "",
        isActive: Boolean(row.is_active),
        ...(mode.kind === "zone"
          ? {
              conditions: conditionsFromApi(
                row.conditions as WarehouseCondition[] | undefined
              ),
            }
          : {}),
      };
      setSheetInitial(nextInitial);
      setSheet(mode);
    } else {
      setSheetInitial({
        sku: "",
        nameTh: "",
        nameEn: "",
        isActive: true,
        ...(mode.kind === "zone"
          ? { conditions: EMPTY_ZONE_CONDITIONS }
          : {}),
      });
      setSheet(mode);
    }
  }

  async function saveSheetPayload(payload: WarehouseNodeSavePayload) {
    if (!sheet) return;
    const condBody =
      sheet.kind === "zone" && payload.conditions
        ? conditionsToPatchBody(payload.conditions)
        : null;
    const body = {
      type: sheet.kind === "warehouse" ? "warehouse" : "zone",
      sku: payload.sku,
      capacity: 0,
      is_active: payload.isActive,
      names: { th: payload.nameTh, en: payload.nameEn },
      ...(sheet.kind === "zone"
        ? { parent_id: sheet.warehouseId, ...(condBody ?? {}) }
        : { parent_id: null }),
    };
    try {
      if (sheet.id) {
        await patchWarehouseNode(locale, sheet.id, body);
        if (condBody) {
          await patchWarehouseConditions(locale, sheet.id, condBody);
        }
        toast.success(tCrud("toast.saved"));
      } else {
        await createWarehouseNode(locale, body);
        toast.success(tCrud("toast.created"));
      }
      await load();
      if (sheet.kind === "zone") {
        await loadZones(sheet.warehouseId);
      }
    } catch (e) {
      toast.error(
        e instanceof WarehouseApiError ? e.message : tError("required")
      );
      throw e;
    }
  }

  async function onToggleActive(
    id: number,
    active: boolean,
    refreshZonesForWh?: number
  ) {
    try {
      await patchWarehouseNode(locale, id, { is_active: active });
      await load();
      if (refreshZonesForWh != null) {
        await loadZones(refreshZonesForWh);
      }
    } catch {
      toast.error(tError("required"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("desc")}
        actions={
          perms.create ? (
            <Button
              type="button"
              size="lg"
              onClick={() => openSheet({ kind: "warehouse" })}
            >
              <Plus data-icon="inline-end" className="size-4" aria-hidden />
              {tPage("add")}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField
          value={listQuery.query}
          onChange={listQuery.setQuery}
          className="min-w-48 flex-1"
        />
        <StatusFilterGroup
          value={listQuery.statusFilter}
          onChange={listQuery.setStatusFilter}
        />
      </div>

      <div className="rounded-md border bg-background">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{tWh("warehouseCol")}</TableHead>
            <TableHead>{tWh("skuCol")}</TableHead>
            <TableHead className="text-center tabular-nums">{tWh("remainCol")}</TableHead>
            <TableHead className="text-center">{tWh("zoneCol")}</TableHead>
            <TableHead className="text-center">{tCol("status")}</TableHead>
            <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <CrudListTableSkeleton columnCount={COLS - 1} rowCount={10} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLS} className="text-muted-foreground text-center">
                {tError("noData")}
              </TableCell>
            </TableRow>
          ) : (
            rows.flatMap((row) => {
              const zoneRows = zonesByWh[row.id] ?? [];
              const isOpen = expanded[row.id];
              const main = (
                <TableRow key={row.id}>
                  <TableCell>
                    <ButtonIcon
                      type="button"
                      variant="ghost"
                      aria-label={tWh("details")}
                      aria-expanded={isOpen}
                      onClick={() => void toggleExpand(row.id)}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </ButtonIcon>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-semibold">
                      <WarehouseIcon className="size-5 text-muted-foreground" />
                      <span>{row.name || "—"}</span>
                      {perms.update ? (
                        <ButtonIcon
                          variant="outline"
                          type="button"
                          aria-label={tCrud("btn.edit")}
                          onClick={() =>
                            void openSheet({ kind: "warehouse", id: row.id })
                          }
                        >
                          <Pencil className="size-4" />
                        </ButtonIcon>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {row.stats
                      ? `${Number(row.stats.remain_qty).toLocaleString(
                          locale === "th" ? "th-TH" : "en-US"
                        )} ${tWh("pieces")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.stats
                      ? `${row.stats.zone_count} ${tWh("zonesUnit")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusSwitchField
                      checked={row.is_active}
                      disabled={!perms.update}
                      onCheckedChange={(v) => void onToggleActive(row.id, v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      {perms.view ? (
                        <ButtonIcon
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/admin/warehouse/list/view?id=${row.id}`} />}
                          aria-label={tCrud("btn.view")}
                        >
                          <ClipboardList className="size-4" />
                        </ButtonIcon>
                      ) : null}
                      {perms.create ? (
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          tone="add"
                          aria-label={tWh("addZone")}
                          onClick={() => void openSheet({ kind: "zone", warehouseId: row.id })}
                        >
                          <Plus className="size-4" />
                        </ButtonIcon>
                      ) : null}
                      <TableIconActions
                        actions={rowActions.filter(
                          (a) => a !== "view" && a !== "edit"
                        )}
                        onAction={(key) => {
                          if (key === "delete") setDeleteId(row.id);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
              if (!isOpen) return [main];
              const detail = (
                <TableRow key={`${row.id}-zones`}>
                  <TableCell colSpan={COLS} className="bg-muted/30">
                    {zoneRows.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-2 text-center">
                        {tWh("noZones")}
                      </p>
                    ) : (
                      <WarehouseZoneExpandGrid
                        warehouseId={row.id}
                        zones={zoneRows}
                        perms={perms}
                        onToggleActive={(zoneId, active) =>
                          void onToggleActive(zoneId, active, row.id)
                        }
                        onOpenSheet={(mode) => void openSheet(mode)}
                        onDeleteZone={setDeleteId}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
              return [main, detail];
            })
          )}
        </TableBody>
        </Table>
      </div>

      <CrudPaginationBar
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        meta={{
          total,
          totalPages: Math.max(1, Math.ceil(total / listQuery.pageSize)),
        }}
        onPageChange={listQuery.setPage}
        onPageSizeChange={(pageSize) => listQuery.setPageSize(pageSize as 10 | 25 | 50 | 100)}
      />

      <WarehouseNodeEditSheet
        state={sheet}
        initial={sheetInitial}
        canSave={sheet?.id ? perms.update : perms.create}
        onOpenChange={(o) => !o && setSheet(null)}
        onSave={saveSheetPayload}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId == null) return;
          try {
            await deleteWarehouseNode(locale, deleteId);
            toast.success(tCrud("toast.deleted"));
            const deletedId = deleteId;
            setDeleteId(null);
            await load();
            for (const [whId, zones] of Object.entries(zonesByWh)) {
              if (zones.some((z) => z.id === deletedId)) {
                await loadZones(Number(whId));
              }
            }
          } catch (e) {
            if (
              e instanceof WarehouseApiError &&
              (e.code === "has_stock" ||
                (e.status === 409 && e.message === "has stock"))
            ) {
              toast.error(tWh("deleteHasStock"));
            } else if (e instanceof WarehouseApiError) {
              toast.error(e.message);
            } else {
              toast.error(
                e instanceof WarehouseApiError ? e.message : tError("required")
              );
            }
          }
        }}
      />
    </div>
  );
}
