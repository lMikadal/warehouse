"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  conditionsFromApi,
  conditionsToPatchBody,
  WarehouseNodeEditSheet,
  type WarehouseNodeFormInitial,
  type WarehouseNodeSavePayload,
  type WarehouseSheetState,
} from "./warehouse-node-edit-sheet";
import { WarehouseViewLegend } from "./warehouse-view-legend";
import { WarehouseViewStatCards } from "./warehouse-view-stat-cards";
import { WarehouseViewTreePanel } from "./warehouse-view-tree-panel";
import {
  allowedChildTypes,
  computeViewStats,
  nodesById,
} from "./warehouse-tree-utils";
import {
  createWarehouseNode,
  deleteWarehouseNode,
  fetchWarehouseById,
  fetchWarehouseTree,
  patchWarehouseConditions,
  patchWarehouseNode,
  WarehouseApiError,
  type WarehouseCondition,
  type WarehouseTreeNode,
} from "@/lib/warehouse-api";

type Props = {
  warehouseId: number | null;
  expandZoneId?: number | null;
};

function initialOpenForZone(
  nodes: WarehouseTreeNode[],
  warehouseId: number,
  expandZoneId: number | null | undefined
): Record<number, boolean> {
  if (expandZoneId == null || Number.isNaN(expandZoneId)) return {};
  const node = nodesById(nodes).get(expandZoneId);
  if (
    node?.type === "zone" &&
    node.parent_id === warehouseId
  ) {
    return { [expandZoneId]: true };
  }
  return {};
}

export function WarehouseManagementView({
  warehouseId,
  expandZoneId = null,
}: Props) {
  const locale = useLocale();
  const tPage = useTranslations("page.warehouseView");
  const tWh = useTranslations("warehouse");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const perm = useResourcePermissions("warehouse", "warehouse_list");

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [nodes, setNodes] = useState<WarehouseTreeNode[]>([]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const openInitKeyRef = useRef<string | null>(null);
  const [sortableEpoch, setSortableEpoch] = useState(0);
  const [sheet, setSheet] = useState<WarehouseSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sheetInitial, setSheetInitial] = useState<WarehouseNodeFormInitial>({
    sku: "",
    nameTh: "",
    nameEn: "",
    isActive: true,
  });

  const viewStats = useMemo(
    () =>
      warehouseId && !Number.isNaN(warehouseId)
        ? computeViewStats(nodes, warehouseId)
        : null,
    [nodes, warehouseId]
  );

  const load = useCallback(async () => {
    if (!warehouseId || Number.isNaN(warehouseId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [wh, tree] = await Promise.all([
        fetchWarehouseById(locale, warehouseId),
        fetchWarehouseTree(locale, warehouseId),
      ]);
      setTitle(String(wh.name ?? ""));
      setSku(String(wh.sku ?? ""));
      setNodes(tree);
    } catch {
      toast.error(tError("forbidden"));
    } finally {
      setLoading(false);
    }
  }, [locale, warehouseId, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    openInitKeyRef.current = null;
  }, [warehouseId, expandZoneId]);

  useEffect(() => {
    if (loading || !warehouseId || Number.isNaN(warehouseId) || !nodes.length) {
      return;
    }
    const key = `${warehouseId}:${expandZoneId ?? ""}`;
    if (openInitKeyRef.current === key) return;
    openInitKeyRef.current = key;
    setOpen(initialOpenForZone(nodes, warehouseId, expandZoneId));
  }, [loading, nodes, warehouseId, expandZoneId]);

  function toggleOpen(id: number) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  async function openEdit(id: number) {
    const node = nodesById(nodes).get(id);
    if (!node || !warehouseId) return;
    const row = await fetchWarehouseById(locale, id);
    const names = (row.names ?? {}) as { th?: string; en?: string };
    if (node.type === "zone") {
      setSheetInitial({
        sku: String(row.sku ?? ""),
        nameTh: names.th ?? "",
        nameEn: names.en ?? "",
        isActive: Boolean(row.is_active),
        conditions: conditionsFromApi(
          row.conditions as WarehouseCondition[] | undefined
        ),
      });
      setSheet({ kind: "zone", warehouseId, id });
      return;
    }
    if (["shelf", "rack", "bin"].includes(node.type)) {
      setSheetInitial({
        sku: String(row.sku ?? ""),
        nameTh: names.th ?? "",
        nameEn: names.en ?? "",
        isActive: Boolean(row.is_active),
        capacity: String(row.capacity ?? 0),
        childType: node.type,
      });
      setSheet({
        kind: "slot",
        parentId: node.parent_id ?? 0,
        id,
        childType: node.type,
      });
    }
  }

  function openAddChild(parentId: number) {
    const parent = nodesById(nodes).get(parentId);
    if (!parent) return;
    const types = allowedChildTypes(parent.type).filter(
      (t) => t !== "zone"
    );
    if (!types.length) return;
    setSheetInitial({
      sku: "",
      nameTh: "",
      nameEn: "",
      isActive: true,
      capacity: "0",
      childType: types[0],
    });
    setSheet({
      kind: "slot",
      parentId,
      childType: types[0],
      allowedTypes: types.length > 1 ? types : undefined,
    });
  }

  async function saveSheetPayload(payload: WarehouseNodeSavePayload) {
    if (!sheet || !warehouseId) return;
    try {
      if (sheet.kind === "zone") {
        const condBody = payload.conditions
          ? conditionsToPatchBody(payload.conditions)
          : null;
        const body = {
          type: "zone" as const,
          sku: payload.sku,
          capacity: 0,
          is_active: payload.isActive,
          names: { th: payload.nameTh, en: payload.nameEn },
          parent_id: warehouseId,
          ...(condBody ?? {}),
        };
        if (sheet.id) {
          await patchWarehouseNode(locale, sheet.id, body);
          if (condBody) {
            await patchWarehouseConditions(locale, sheet.id, condBody);
          }
        } else {
          await createWarehouseNode(locale, body);
        }
      } else if (sheet.kind === "slot") {
        const type =
          payload.childType ||
          sheet.childType ||
          sheet.allowedTypes?.[0] ||
          "shelf";
        const cap = Number(payload.capacity) || 0;
        const body = {
          type,
          sku: payload.sku,
          capacity: cap,
          is_active: payload.isActive,
          names: { th: payload.nameTh, en: payload.nameEn },
          parent_id: sheet.parentId,
        };
        if (sheet.id) {
          await patchWarehouseNode(locale, sheet.id, body);
        } else {
          await createWarehouseNode(locale, body);
        }
      }
      toast.success(
        sheet.id ? tCrud("toast.saved") : tCrud("toast.created")
      );
      await load();
    } catch (e) {
      toast.error(
        e instanceof WarehouseApiError ? e.message : tError("required")
      );
      throw e;
    }
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    try {
      await deleteWarehouseNode(locale, deleteId);
      toast.success(tCrud("toast.deleted"));
      setDeleteId(null);
      await load();
    } catch (e) {
      if (e instanceof WarehouseApiError && e.code === "has_stock") {
        toast.error(tWh("deleteHasStock"));
      } else {
        toast.error(
          e instanceof WarehouseApiError ? e.message : tError("forbidden")
        );
      }
    }
  }

  if (!warehouseId || Number.isNaN(warehouseId)) {
    return (
      <p className="text-muted-foreground text-sm">{tError("noData")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CrudPageHeader
        title={title || tPage("title")}
        description={
          sku ? `${tPage("desc")} · ${sku}` : tPage("desc")
        }
      />

      {loading ? (
        <div className="flex flex-col gap-6" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[4.5rem] rounded-lg" />
            ))}
          </div>
          <Skeleton className="min-h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {viewStats ? <WarehouseViewStatCards stats={viewStats} /> : null}

          <div className="flex flex-col gap-2">
            <WarehouseViewTreePanel
              nodes={nodes}
              warehouseId={warehouseId}
              open={open}
              perm={perm}
              sortableEpoch={sortableEpoch}
              onSortableEpochBump={() =>
                setSortableEpoch((e) => e + 1)
              }
              onToggle={toggleOpen}
              onReload={load}
              onAdd={openAddChild}
              onEdit={(id) => void openEdit(id)}
              onDelete={setDeleteId}
            />
          </div>

          <WarehouseViewLegend />
        </>
      )}

      <WarehouseNodeEditSheet
        state={sheet}
        initial={sheetInitial}
        canSave={
          sheet?.kind === "zone"
            ? perm.update || perm.create
            : sheet?.kind === "slot"
              ? perm.update || perm.create
              : perm.update
        }
        onOpenChange={(o) => !o && setSheet(null)}
        onSave={saveSheetPayload}
      />

      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
