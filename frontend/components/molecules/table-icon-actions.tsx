"use client";

import {
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ButtonIcon,
  type ButtonIconTone,
} from "@/components/ui/button-icon";
import { cn } from "@/lib/utils";

export type TableIconActionKey = "view" | "edit" | "add" | "delete";

export type TableIconActionsProps = {
  actions: TableIconActionKey[];
  onAction?: (action: TableIconActionKey) => void;
  className?: string;
};

const ICONS: Record<TableIconActionKey, LucideIcon> = {
  view: ClipboardList,
  edit: Pencil,
  add: Plus,
  delete: Trash2,
};

const TONE: Record<TableIconActionKey, ButtonIconTone> = {
  view: "neutral",
  edit: "neutral",
  add: "add",
  delete: "delete",
};

export function TableIconActions({
  actions,
  onAction,
  className,
}: TableIconActionsProps) {
  const tCrud = useTranslations("crud");
  const tAction = useTranslations("action");
  const tWh = useTranslations("warehouse");

  const labelFor = (key: TableIconActionKey) => {
    if (key === "view") return tAction("view");
    if (key === "edit") return tCrud("edit");
    if (key === "delete") return tCrud("delete");
    return tWh("addZone");
  };

  return (
    <div className={cn("inline-flex items-center justify-center gap-1.5", className)}>
      {actions.map((key) => {
        const Icon = ICONS[key];
        return (
          <ButtonIcon
            key={key}
            variant="outline"
            type="button"
            tone={TONE[key]}
            aria-label={labelFor(key)}
            onClick={() => onAction?.(key)}
          >
            <Icon className="text-current" />
          </ButtonIcon>
        );
      })}
    </div>
  );
}
