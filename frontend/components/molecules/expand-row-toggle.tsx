"use client";

import { ChevronDown, ChevronRight } from "lucide-react";

import { ButtonIcon } from "@/components/ui/button-icon";
import { cn } from "@/lib/utils";

export type ExpandRowToggleProps = {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
};

export function ExpandRowToggle({
  expanded,
  onToggle,
  className,
  label = "Toggle row details",
}: ExpandRowToggleProps) {
  const Icon = expanded ? ChevronDown : ChevronRight;

  return (
    <ButtonIcon
      type="button"
      variant="outline"
      size="sm"
      aria-expanded={expanded}
      aria-label={label}
      className={cn(className)}
      onClick={onToggle}
    >
      <Icon className="text-current" />
    </ButtonIcon>
  );
}
