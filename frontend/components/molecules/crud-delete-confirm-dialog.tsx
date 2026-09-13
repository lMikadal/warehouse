"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CrudDeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: ReactNode;
  description?: ReactNode;
};

export function CrudDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: CrudDeleteConfirmDialogProps) {
  const tCrud = useTranslations("crud");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col items-center gap-4 text-center">
          <TriangleAlert className="size-20 text-destructive" strokeWidth={2} />
          <DialogHeader className="items-center gap-2 sm:text-center">
            <DialogTitle className="sr-only">{title ?? tCrud("btn.delete")}</DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {description ?? tCrud("deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter >
          <DialogClose render={<Button variant="outline" size="lg" />}>
            {tCrud("btn.cancel")}
          </DialogClose>
          <Button type="button" size="lg" variant="destructive" onClick={onConfirm}>
            {tCrud("btn.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
