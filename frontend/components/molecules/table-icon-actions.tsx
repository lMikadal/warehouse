"use client";

import {
  ClipboardList,
  Plus,
  SquarePen,
  Trash2,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ButtonIcon,
  type ButtonIconTone,
} from "@/components/ui/button-icon";
import { cn } from "@/lib/utils";

export type TableIconActionKey =
  | "view"
  | "edit"
  | "add"
  | "delete"
  | "cancel"
  | "pay";

export type TableIconActionsProps = {
  actions: TableIconActionKey[];
  /** Actions shown but not clickable (e.g. delete when row is in use). */
  disabledActions?: TableIconActionKey[];
  onAction?: (action: TableIconActionKey) => void;
  className?: string;
};

const ICONS: Record<TableIconActionKey, LucideIcon> = {
  view: ClipboardList,
  edit: SquarePen,
  add: Plus,
  delete: Trash2,
  cancel: X,
  pay: Wallet,
};

const TONE: Record<TableIconActionKey, ButtonIconTone> = {
  view: "view",
  edit: "edit",
  add: "add",
  delete: "delete",
  cancel: "delete",
  pay: "add",
};

export function TableIconActions({
  actions,
  disabledActions,
  onAction,
  className,
}: TableIconActionsProps) {
  const tCrud = useTranslations("crud");
  const tAction = useTranslations("action");
  const disabled = new Set(disabledActions ?? []);

  const labelFor = (key: TableIconActionKey) => {
    if (key === "view") return tAction("view");
    if (key === "edit") return tCrud("btn.edit");
    if (key === "delete") return tCrud("btn.delete");
    if (key === "cancel") return tCrud("btn.cancel");
    if (key === "pay") return tCrud("btn.pay");
    return tCrud("btn.create");
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
            disabled={disabled.has(key)}
            onClick={() => onAction?.(key)}
          >
            <Icon className="text-current" />
          </ButtonIcon>
        );
      })}
    </div>
  );
}
