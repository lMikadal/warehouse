"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type StatusSwitchFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function StatusSwitchField({
  checked,
  onCheckedChange,
  disabled,
  className,
}: StatusSwitchFieldProps) {
  const t = useTranslations("col");
  const ariaLabel = t("status");

  return (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(className)}
    />
  );
}
