"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadPurchaseFilterOptions,
  resolvePurchaseFilterLabel,
} from "@/lib/order-purchase-api";

import type { ReceiveSupplierOption } from "./purchase-ticket-receive-types";

export type PurchaseSupplierSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (supplier: ReceiveSupplierOption) => void;
};

export function PurchaseSupplierSelectDialog({
  open,
  onOpenChange,
  onConfirm,
}: PurchaseSupplierSelectDialogProps) {
  const t = useTranslations("page.orderPurchase.receive");
  const tCrud = useTranslations("crud");
  const [supplierId, setSupplierId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSupplierId("");
      setSubmitting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("supplierPickTitle")}</DialogTitle>
        </DialogHeader>
        <RemoteComboboxField
          label={t("supplierPickLabel")}
          value={supplierId}
          onValueChange={setSupplierId}
          placeholder={t("supplierPickSearchPlaceholder")}
          emptyLabel={t("supplierPickEmpty")}
          inputClassName="w-full"
          onLoadOptions={(ctx) => loadPurchaseFilterOptions("suppliers", ctx)}
          resolveSelectedLabel={(v) =>
            resolvePurchaseFilterLabel("suppliers", v)
          }
        />
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!supplierId || submitting}
            onClick={async () => {
              const id = Number(supplierId);
              if (!Number.isFinite(id) || id <= 0) return;
              setSubmitting(true);
              try {
                const label =
                  (await resolvePurchaseFilterLabel("suppliers", supplierId)) ??
                  supplierId;
                onConfirm({ id, label });
                onOpenChange(false);
              } catch {
                onConfirm({ id, label: supplierId });
                onOpenChange(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {tCrud("btn.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
