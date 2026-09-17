"use client";

import {
  ClipboardList,
  Layers,
  LayoutGrid,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { ResourceActions } from "@/lib/admin-permissions";
import type { WarehouseCondition } from "@/lib/warehouse-api";

import {
  conditionsFromApi,
  type WarehouseSheetState,
  type ZoneConditionsForm,
} from "./warehouse-node-edit-sheet";

export type WarehouseZoneExpandRow = {
  id: number;
  sku: string;
  name: string;
  is_active: boolean;
  conditions: WarehouseCondition[];
};

const CONDITION_TYPES = ["shelf", "rack", "bin"] as const;

type ConditionType = (typeof CONDITION_TYPES)[number];

const TYPE_ICON: Record<ConditionType, ComponentType<{ className?: string }>> = {
  shelf: Layers,
  rack: LayoutGrid,
  bin: Package,
};

type Props = {
  warehouseId: number;
  zones: WarehouseZoneExpandRow[];
  perms: ResourceActions;
  onToggleActive: (zoneId: number, active: boolean) => void | Promise<void>;
  onOpenSheet: (mode: WarehouseSheetState) => void | Promise<void>;
  onDeleteZone: (zoneId: number) => void;
};

function condAmounts(form: ZoneConditionsForm, type: ConditionType) {
  const row = form[type];
  const amount = Number.parseInt(row.amount, 10) || 0;
  const active = Number.parseInt(row.amountActive, 10) || 0;
  const inactive = Math.max(0, amount - active);
  return { amount, active, inactive };
}

export function WarehouseZoneExpandGrid({
  warehouseId,
  zones,
  perms,
  onToggleActive,
  onOpenSheet,
  onDeleteZone,
}: Props) {
  const tWh = useTranslations("warehouse");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");

  const typeLabel = (type: ConditionType) => {
    if (type === "shelf") return tWh("typeShelf");
    if (type === "rack") return tWh("typeRack");
    return tWh("typeBin");
  };

  return (
    <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map((zone) => {
        const form = conditionsFromApi(zone.conditions);
        return (
          <article
            key={zone.id}
            className="min-w-0 overflow-hidden rounded-lg border border-border bg-background p-3.5 shadow-sm"
          >
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <strong className="truncate text-sm">{zone.name || "—"}</strong>
                <StatusSwitchField
                  checked={zone.is_active}
                  disabled={!perms.update}
                  onCheckedChange={(v) => void onToggleActive(zone.id, v)}
                />
              </div>
              <div className="inline-flex items-center gap-1.5">
                {perms.view ? (
                  <ButtonIcon
                    variant="outline"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/admin/warehouse/list/view?id=${warehouseId}`}
                      />
                    }
                    aria-label={tCrud("btn.view")}
                  >
                    <ClipboardList className="size-4" />
                  </ButtonIcon>
                ) : null}
                {perms.update ? (
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    aria-label={tCrud("btn.edit")}
                    onClick={() =>
                      void onOpenSheet({
                        kind: "zone",
                        id: zone.id,
                        warehouseId,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </ButtonIcon>
                ) : null}
                {perms.delete ? (
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    tone="delete"
                    aria-label={tCrud("btn.delete")}
                    onClick={() => onDeleteZone(zone.id)}
                  >
                    <Trash2 className="size-4" />
                  </ButtonIcon>
                ) : null}
              </div>
            </header>
            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCol("type")}</TableHead>
                    <TableHead className="text-center tabular-nums">
                      {tWh("amountMax")}
                    </TableHead>
                    <TableHead className="text-center tabular-nums">
                      {tWh("amountActive")}
                    </TableHead>
                    <TableHead className="text-center tabular-nums">
                      {tWh("amountInactive")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONDITION_TYPES.map((type) => {
                    const Icon = TYPE_ICON[type];
                    const { amount, active, inactive } = condAmounts(form, type);
                    return (
                      <TableRow key={type}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon
                              className="size-[18px] shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span>{typeLabel(type)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {amount}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-green-600 dark:text-green-500">
                          {active}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {inactive}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </article>
        );
      })}
    </div>
  );
}
