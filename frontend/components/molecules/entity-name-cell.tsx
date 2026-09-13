"use client";

import { Pencil, Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";

import { ButtonIcon } from "@/components/ui/button-icon";
import { cn } from "@/lib/utils";

export type EntityNameCellProps = {
  name: string;
  onEdit?: () => void;
  className?: string;
};

export function EntityNameCell({
  name,
  onEdit,
  className,
}: EntityNameCellProps) {
  const t = useTranslations("crud");

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Warehouse
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <span className="truncate">{name}</span>
      {onEdit ? (
        <ButtonIcon
          type="button"
          variant="outline"
          size="xs"
          className="shrink-0"
          aria-label={t("edit")}
          onClick={onEdit}
        >
          <Pencil className="text-current" />
        </ButtonIcon>
      ) : null}
    </div>
  );
}
