"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type StatusSwitchFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** When set, shows label on the left and switch on the right (form sheets). */
  labelKey?: string;
};

export function StatusSwitchField({
  checked,
  onCheckedChange,
  disabled,
  className,
  labelKey,
}: StatusSwitchFieldProps) {
  const tCol = useTranslations("col");
  const t = useTranslations();
  const ariaLabel = labelKey ? t(labelKey) : tCol("status");

  const switchEl = (
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(labelKey ? undefined : className)}
    />
  );

  if (!labelKey) {
    return switchEl;
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 pt-1", className)}>
      <span className="text-sm font-medium">{t(labelKey)}</span>
      {switchEl}
    </div>
  );
}
