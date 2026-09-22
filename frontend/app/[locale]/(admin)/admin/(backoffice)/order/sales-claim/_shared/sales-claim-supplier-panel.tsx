"use client";

import { Building2, FileText, MapPin, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { type DisplayLocale } from "@/lib/format-datetime";
import type { SalesClaimDetail } from "@/lib/order-sales-claim-api";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type SalesClaimSupplierPanelProps = {
  detail: SalesClaimDetail;
  supplier: { name: string; address?: string | null; tel?: string | null };
  /** Seed for the message textarea; the panel owns the edited value and hands it back on submit. */
  initialNote: string;
  submitting?: boolean;
  onCancel: () => void;
  onSaveDraft: (note: string) => void;
  onSend: (note: string) => void;
};

/**
 * The supplier document the desk assembles before sending it out (mock 4): the chosen supplier, the
 * claim lines, and the message that rides along. Modeled on the purchase-side claim-document-panel.
 * The parent remounts it (via `key`) after a save so the seeded note stays in step with the server.
 */
export function SalesClaimSupplierPanel({
  detail,
  supplier,
  initialNote,
  submitting = false,
  onCancel,
  onSaveDraft,
  onSend,
}: SalesClaimSupplierPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderSalesClaim");
  const tCrud = useTranslations("crud");
  const [note, setNote] = useState(initialNote);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <FileText className="text-primary size-5 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold">{t("supplierPanelTitle")}</span>
          <span className="text-muted-foreground text-xs">
            {t("supplierPanelSubtitle")}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-md border bg-background p-3">
          <span className="flex items-center gap-2 font-medium">
            <Building2
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden
            />
            {supplier.name?.trim() || t("emptyCell")}
          </span>
          {supplier.address?.trim() ? (
            <span className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {supplier.address}
            </span>
          ) : null}
          {supplier.tel?.trim() ? (
            <span className="text-muted-foreground mt-1 flex items-center gap-2 text-xs tabular-nums">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {supplier.tel}
            </span>
          ) : null}
        </div>

        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colProduct")}</TableHead>
                <TableHead className="text-center">{t("colQty")}</TableHead>
                <TableHead className="text-right">
                  {t("colPricePerUnit")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="truncate font-medium">
                      {item.detail?.trim() || t("emptyCell")}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {item.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.price_per_unit, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sales-claim-note-supplier">
            {t("supplierMessageLabel")}
          </Label>
          <Textarea
            id="sales-claim-note-supplier"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("supplierMessagePlaceholder")}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onSaveDraft(note)}
            disabled={submitting}
          >
            {t("saveDraft")}
          </Button>
          <Button
            type="button"
            onClick={() => onSend(note)}
            disabled={submitting}
          >
            {t("sendToSupplier")}
          </Button>
        </div>
      </div>
    </div>
  );
}
