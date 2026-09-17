import {
  Box,
  Layers,
  LayoutGrid,
  Package,
  type LucideIcon,
} from "lucide-react";

export const WAREHOUSE_SLOT_TYPES = ["shelf", "rack", "bin"] as const;
export type WarehouseSlotType = (typeof WAREHOUSE_SLOT_TYPES)[number];

export const WAREHOUSE_SLOT_TYPE_ICON: Record<
  WarehouseSlotType,
  LucideIcon
> = {
  shelf: Layers,
  rack: LayoutGrid,
  bin: Package,
};

export const WAREHOUSE_NODE_TYPE_ICON: Record<string, LucideIcon> = {
  zone: Box,
  ...WAREHOUSE_SLOT_TYPE_ICON,
};

export function warehouseSlotTypeIcon(
  type: string
): LucideIcon | undefined {
  if (type === "shelf" || type === "rack" || type === "bin") {
    return WAREHOUSE_SLOT_TYPE_ICON[type];
  }
  return WAREHOUSE_NODE_TYPE_ICON[type];
}
