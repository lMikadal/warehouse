"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/molecules/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SupplierContactInput } from "@/lib/supplier-user-api";

type SupplierContactFormDialogProps = {
  open: boolean;
  draft: SupplierContactInput;
  onDraftChange: (next: SupplierContactInput) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SupplierContactFormDialog({
  open,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: SupplierContactFormDialogProps) {
  const tSupplier = useTranslations("supplier");
  const tCrud = useTranslations("crud");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tSupplier("editContact")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField
            id="contact-dialog-name"
            labelKey="col.name"
            required
            value={draft.name}
            onChange={(v) => onDraftChange({ ...draft, name: v })}
          />
          <FormField
            id="contact-dialog-email"
            labelKey="col.email"
            type="email"
            value={draft.email ?? ""}
            onChange={(v) => onDraftChange({ ...draft, email: v })}
          />
          <FormField
            id="contact-dialog-tel"
            labelKey="col.tel"
            type="tel"
            value={draft.tel ?? ""}
            onChange={(v) =>
              onDraftChange({
                ...draft,
                tel: v.replace(/[^0-9-]/g, ""),
              })
            }
          />
          <FormField
            id="contact-dialog-position"
            labelKey="col.position"
            value={draft.position ?? ""}
            onChange={(v) => onDraftChange({ ...draft, position: v })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            {tCrud("btn.cancel")}
          </Button>
          <Button size="lg" onClick={() => void onSave()}>
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
