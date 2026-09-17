"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  fetchWarehouseById,
  fetchWarehouseStats,
  fetchWarehouseTree,
  type WarehouseStats,
  type WarehouseTreeNode,
} from "@/lib/warehouse-api";

type Props = {
  warehouseId: number | null;
};

function countType(nodes: WarehouseTreeNode[], typ: string) {
  return nodes.filter((n) => n.type === typ).length;
}

function childrenOf(
  nodes: WarehouseTreeNode[],
  parentId: number
): WarehouseTreeNode[] {
  return nodes
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function TreeBranch({
  node,
  nodes,
  depth,
  open,
  onToggle,
  tWh,
}: {
  node: WarehouseTreeNode;
  nodes: WarehouseTreeNode[];
  depth: number;
  open: Record<number, boolean>;
  onToggle: (id: number) => void;
  tWh: ReturnType<typeof useTranslations<"warehouse">>;
}) {
  const kids = childrenOf(nodes, node.id);
  const hasKids = kids.length > 0;
  const isOpen = open[node.id] ?? depth < 1;

  return (
    <div className="border-border/60 border-b last:border-0">
      <div
        className="flex flex-wrap items-center gap-2 py-2"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        {hasKids ? (
          <ButtonIcon
            type="button"
            variant="ghost"
            aria-label={tWh("details")}
            aria-expanded={isOpen}
            onClick={() => onToggle(node.id)}
          >
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </ButtonIcon>
        ) : (
          <span className="inline-block w-9" />
        )}
        <span className="min-w-[5rem] font-medium">{node.name}</span>
        <span className="text-muted-foreground text-xs">{node.sku}</span>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {tWh("capacityShort", {
            used: Math.round(node.used),
            total: node.capacity,
          })}
        </span>
        <Progress value={node.capacity_pct} className="h-2 w-24" />
      </div>
      {hasKids && isOpen
        ? kids.map((c) => (
            <TreeBranch
              key={c.id}
              node={c}
              nodes={nodes}
              depth={depth + 1}
              open={open}
              onToggle={onToggle}
              tWh={tWh}
            />
          ))
        : null}
    </div>
  );
}

export function WarehouseManagementView({ warehouseId }: Props) {
  const locale = useLocale();
  const tPage = useTranslations("page.warehouseView");
  const tWh = useTranslations("warehouse");
  const tError = useTranslations("error");

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [nodes, setNodes] = useState<WarehouseTreeNode[]>([]);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const zoneRoots = useMemo(() => {
    if (!warehouseId) return [];
    return childrenOf(nodes, warehouseId);
  }, [nodes, warehouseId]);

  const load = useCallback(async () => {
    if (!warehouseId || Number.isNaN(warehouseId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [wh, st, tree] = await Promise.all([
        fetchWarehouseById(locale, warehouseId),
        fetchWarehouseStats(locale, warehouseId),
        fetchWarehouseTree(locale, warehouseId),
      ]);
      setTitle(String(wh.name ?? wh.sku ?? ""));
      setStats(st);
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

  function toggle(id: number) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
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
        description={tPage("desc")}
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
          {stats ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label={tWh("statTotalZones")} value={stats.zone_count} />
              <StatCard label={tWh("statTotalShelves")} value={countType(nodes, "shelf")} />
              <StatCard label={tWh("statTotalRacks")} value={countType(nodes, "rack")} />
              <StatCard label={tWh("statTotalBins")} value={countType(nodes, "bin")} />
              <StatCard
                label={tWh("statCapacityUsed")}
                value={Math.round(stats.remain_qty)}
              />
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-background p-3">
            {zoneRoots.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                {tWh("noZones")}
              </p>
            ) : (
              zoneRoots.map((z) => (
                <TreeBranch
                  key={z.id}
                  node={z}
                  nodes={nodes}
                  depth={0}
                  open={open}
                  onToggle={toggle}
                  tWh={tWh}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
