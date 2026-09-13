"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type CrudFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function CrudFormSheet({
  open,
  onOpenChange,
  children,
}: CrudFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

export type CrudFormSheetHeaderProps = {
  title: ReactNode;
};

export function CrudFormSheetHeader({ title }: CrudFormSheetHeaderProps) {
  return (
    <SheetHeader className="border-b border-border">
      <SheetTitle>{title}</SheetTitle>
    </SheetHeader>
  );
}

export type CrudFormSheetBodyProps = {
  children: ReactNode;
  className?: string;
};

export function CrudFormSheetBody({
  children,
  className,
}: CrudFormSheetBodyProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-3 overflow-y-auto p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export type CrudFormSheetFooterProps = {
  dismissLabel: string;
};

export function CrudFormSheetFooter({
  dismissLabel,
}: CrudFormSheetFooterProps) {
  const tCrud = useTranslations("crud");

  return (
    <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
      <SheetClose render={<Button type="button" variant="outline" size="lg" />}>
        {dismissLabel}
      </SheetClose>
      <Button type="submit" size="lg">
        {tCrud("btn.save")}
      </Button>
    </SheetFooter>
  );
}
