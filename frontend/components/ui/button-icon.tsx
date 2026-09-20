"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ButtonIconSize = "xs" | "sm" | "md" | "lg";
export type ButtonIconTone = "neutral" | "view" | "edit" | "add" | "delete";

const sizeMap: Record<
  ButtonIconSize,
  NonNullable<ComponentProps<typeof Button>["size"]>
> = {
  xs: "icon-xs",
  sm: "icon-sm",
  md: "icon",
  lg: "icon-lg",
};

const toneClass: Record<ButtonIconTone, string> = {
  neutral: "",
  view: "text-warehouse-action-add hover:text-warehouse-action-add",
  edit: "text-primary hover:text-primary",
  add: "text-warehouse-action-add hover:text-warehouse-action-add",
  delete: "text-warehouse-action-delete hover:text-warehouse-action-delete",
};

export type ButtonIconProps = Omit<
  ComponentProps<typeof Button>,
  "size" | "children"
> & {
  size?: ButtonIconSize;
  tone?: ButtonIconTone;
  "aria-label": string;
  children: ReactNode;
};

function ButtonIcon({
  className,
  variant = "ghost",
  size = "lg",
  tone = "neutral",
  children,
  ...props
}: ButtonIconProps) {
  return (
    <Button
      data-slot="button-icon"
      variant={variant}
      size={sizeMap[size]}
      className={cn(toneClass[tone], className)}
      {...props}
    >
      {children}
    </Button>
  );
}

export { ButtonIcon };
