"use client";

import JsBarcode from "jsbarcode";
import { Minus, Plus, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_COPIES = 50;

export type ReceivePrintTarget = {
  sku: string;
  name: string;
  barcode: string;
  qrcode: string;
  supplierName: string;
  receivedAt: string;
};

/**
 * The label sheet the receive desk sticks on the box. Printing goes through the browser: the labels
 * are rendered into a hidden iframe so the surrounding admin chrome stays out of the page.
 */
export function ReceivePrintDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReceivePrintTarget | null;
}) {
  const t = useTranslations("page.orderReceive.proceed");
  const [mode, setMode] = useState<"barcode" | "qrcode">("barcode");
  const [copies, setCopies] = useState(1);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setCopies(1);
  }, [open]);

  const barcodeValue = target?.barcode?.trim() ?? "";
  const qrValue = target?.qrcode?.trim() ?? "";

  useEffect(() => {
    if (!open || mode !== "barcode" || !barcodeValue || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, barcodeValue, {
        format: "CODE128",
        displayValue: true,
        height: 48,
        fontSize: 12,
        margin: 4,
      });
    } catch {
      // An unencodable value is treated the same as a missing one: show the empty-state text.
      barcodeRef.current.innerHTML = "";
    }
  }, [open, mode, barcodeValue]);

  const print = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:system-ui,sans-serif}
.label{page-break-inside:avoid;border:1px solid #d4d4d8;border-radius:6px;padding:8px;margin:6px;display:inline-block;text-align:center;width:220px}
.label .cap{font-size:10px;color:#71717a}
.label .val{font-size:12px;font-weight:600;word-break:break-word}
svg{max-width:100%}
</style></head><body>${Array.from({ length: copies }, () => sheet.innerHTML).join("")}</body></html>`
    );
    doc.close();
    const cleanup = () => frame.remove();
    frame.contentWindow?.addEventListener("afterprint", cleanup);
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Safari never fires afterprint from an iframe, so drop the frame on a timer as well.
    setTimeout(cleanup, 60_000);
  };

  const hasCode = mode === "barcode" ? Boolean(barcodeValue) : Boolean(qrValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("printBarcode")}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="w-full">
            <TabsTrigger value="barcode" className="flex-1">
              {t("barcodeLabel")}
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex-1">
              {t("qrCodeLabel")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="barcode" className="pt-3">
            {barcodeValue ? null : (
              <p className="text-sm text-muted-foreground">{t("printNoBarcode")}</p>
            )}
          </TabsContent>
          <TabsContent value="qrcode" className="pt-3">
            {qrValue ? null : (
              <p className="text-sm text-muted-foreground">{t("printNoQr")}</p>
            )}
          </TabsContent>
        </Tabs>

        {target && hasCode ? (
          <div ref={sheetRef} className="flex justify-center">
            <div className="label w-[220px] rounded-md border p-2 text-center">
              <div className="flex justify-center">
                {mode === "barcode" ? (
                  <svg ref={barcodeRef} />
                ) : (
                  <QRCodeSVG value={qrValue} size={104} />
                )}
              </div>
              <p className="cap text-[10px] text-muted-foreground">
                {t("printPreviewSkuCaption")}
              </p>
              <p className="val text-xs font-semibold tabular-nums">{target.sku}</p>
              <p className="cap text-[10px] text-muted-foreground">
                {t("printPreviewNameCaption")}
              </p>
              <p className="val text-xs font-semibold">{target.name}</p>
              <p className="cap text-[10px] text-muted-foreground">
                {t("printCardSupplierCaption")}
              </p>
              <p className="val text-xs">{target.supplierName}</p>
              <p className="cap text-[10px] text-muted-foreground">
                {t("printCardReceiveCaption")}
              </p>
              <p className="val text-xs">{target.receivedAt}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="print-copies">{t("printQtyLabel")}</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("ariaDecrementPrintQty")}
              onClick={() => setCopies((n) => Math.max(1, n - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <span
              id="print-copies"
              className="w-10 text-center tabular-nums"
              aria-live="polite"
            >
              {copies}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("ariaIncrementPrintQty")}
              onClick={() => setCopies((n) => Math.min(MAX_COPIES, n + 1))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={print} disabled={!hasCode}>
            <Printer className="size-4" />
            {t("printButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
