"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
} from "lucide-react";
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { ClaimDetail } from "@/lib/order-claim-api";

import { claimNetIncVat, claimStatusPillClass } from "./claim-status-styles";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ClaimDocumentPanelProps = {
  detail: ClaimDetail;
  resolution: "claim" | "return";
  noteProcess: string;
  onNoteProcessChange: (value: string) => void;
  submitting?: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
};

/**
 * The draft claim/return the desk assembles before sending it to the supplier. It is collapsible the
 * way v1's was, so the items table beside it stays usable on a narrow screen.
 */
export function ClaimDocumentPanel({
  detail,
  resolution,
  noteProcess,
  onNoteProcessChange,
  submitting = false,
  onCancel,
  onSaveDraft,
  onConfirm,
}: ClaimDocumentPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderClaim.edit.panel");
  const tClaim = useTranslations("page.orderClaim");
  const tCrud = useTranslations("crud");
  const [collapsed, setCollapsed] = useState(false);

  const isReturn = resolution === "return";
  const Icon = isReturn ? ClipboardCheck : FileText;

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-4 text-left"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums">
              {`${t("claimNumberPrefix")} ${detail.sku || tClaim("emptyCell")}`}
            </span>
            <span className={claimStatusPillClass(detail.status)}>
              {tClaim(`status.${detail.status}`)}
            </span>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {`${t("summaryItems", { count: detail.qty })} · ${t("summaryNet")} ${money(
              claimNetIncVat(detail),
              locale
            )} ${tClaim("currencySuffix")}`}
          </span>
        </span>
        {collapsed ? (
          <ChevronDown className="size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronUp className="size-4 shrink-0" aria-hidden />
        )}
      </button>

      {collapsed ? null : (
        <div className="flex flex-col gap-4 border-t p-4">
          <div className="flex items-center gap-2">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold">
                {isReturn ? t("returnTitle") : t("claimTitle")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("panelSubtitle")}
              </span>
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("supplierLabel")}
              </span>
              <span className="font-medium">
                {detail.supplier_name?.trim() || tClaim("emptyCell")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 sm:text-right">
              <span className="text-xs text-muted-foreground tabular-nums">
                {detail.purchase_order_sku?.trim() || tClaim("emptyCell")}
              </span>
              <span className="text-xs text-muted-foreground">
                {`${t("orderDateLabel")}: ${
                  detail.order
                    ? formatDateTime(detail.order.created_at, locale)
                    : tClaim("emptyCell")
                }`}
              </span>
            </div>
          </div>

          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colItem")}</TableHead>
                  <TableHead className="text-center">{t("colQty")}</TableHead>
                  <TableHead className="text-center">{t("colUnit")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {detail.product_item_name?.trim() ||
                          detail.item?.name?.trim() ||
                          tClaim("emptyCell")}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-warehouse-error-fg">
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                        {tClaim(`issue.${detail.type}`)}
                      </span>
                      {detail.note.trim() ? (
                        <span className="text-xs text-muted-foreground">
                          {detail.note}
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {detail.qty.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {tClaim(`unit.${detail.unit}`)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="claim-note-process">{t("noteProcessLabel")}</Label>
            <Textarea
              id="claim-note-process"
              rows={3}
              value={noteProcess}
              onChange={(e) => onNoteProcessChange(e.target.value)}
              placeholder={t("noteProcessPlaceholder")}
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
              onClick={onSaveDraft}
              disabled={submitting}
            >
              {t("saveDraft")}
            </Button>
            <Button type="button" onClick={onConfirm} disabled={submitting}>
              {tCrud("btn.confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
