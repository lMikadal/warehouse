"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import type { StoreSalesPriceSummary } from "@/lib/store-sales-cart-pricing";

export type QuotationCartLine = {
  key: string;
  product_item_id?: number;
  name: string;
  sku?: string;
  qty: number;
  price: number;
  discount: number;
  lineTotal: number;
};

type Props = {
  issueDate: string;
  validUntil: string;
  reserveStock: boolean;
  notes: string;
  readOnly?: boolean;
  lines: QuotationCartLine[];
  summary: StoreSalesPriceSummary | null;
  onIssueDateChange: (v: string) => void;
  onValidUntilChange: (v: string) => void;
  onReserveStockChange: (v: boolean) => void;
  onNotesChange: (v: string) => void;
  onQtyChange: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving?: boolean;
};

export function QuotationDocumentPanel({
  issueDate,
  validUntil,
  reserveStock,
  notes,
  readOnly,
  lines,
  summary,
  onIssueDateChange,
  onValidUntilChange,
  onReserveStockChange,
  onNotesChange,
  onQtyChange,
  onRemove,
  onCancel,
  onSaveDraft,
  onSubmit,
  saving,
}: Props) {
  const tForm = useTranslations("page.orderQuotation.form");
  const tStore = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{tStore("documentTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="form-field">
            <Label htmlFor="qt-issue-date">{tForm("issueDate")}</Label>
            <Input
              id="qt-issue-date"
              type="date"
              value={issueDate}
              disabled={readOnly}
              onChange={(e) => onIssueDateChange(e.target.value)}
            />
          </div>
          <div className="form-field">
            <Label htmlFor="qt-valid-until">{tForm("validUntil")}</Label>
            <Input
              id="qt-valid-until"
              type="date"
              value={validUntil}
              disabled={readOnly}
              onChange={(e) => onValidUntilChange(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={reserveStock}
            disabled={readOnly}
            onCheckedChange={(c) => onReserveStockChange(c === true)}
          />
          {tForm("reserveStock")}
        </label>
        {lines.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">{tStore("emptyCart")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tStore("colProduct")}</TableHead>
                  <TableHead className="text-right">{tStore("quantity")}</TableHead>
                  <TableHead className="text-right">{tStore("lineTotal")}</TableHead>
                  {!readOnly ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell>
                      <div className="text-sm font-medium">{line.name}</div>
                      {line.sku ? (
                        <div className="text-muted-foreground text-xs">{line.sku}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {readOnly ? (
                        line.qty
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          className="ml-auto w-20 text-right tabular-nums"
                          value={line.qty}
                          onChange={(e) =>
                            onQtyChange(line.key, Math.max(1, Number(e.target.value) || 1))
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.lineTotal.toFixed(2)}
                    </TableCell>
                    {!readOnly ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(line.key)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {summary ? (
          <div className="rounded-md bg-primary/5 p-3 text-sm">
            <div className="flex justify-between">
              <span>{tStore("grandTotal")}</span>
              <span className="font-semibold tabular-nums">
                {summary.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null}
        <div className="form-field">
          <Label htmlFor="qt-notes">{tForm("notes")}</Label>
          <Textarea
            id="qt-notes"
            value={notes}
            disabled={readOnly}
            placeholder={tForm("notes")}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
      </CardContent>
      {!readOnly ? (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCrud("btn.back")}
          </Button>
          <Button type="button" variant="secondary" disabled={saving || lines.length === 0} onClick={onSaveDraft}>
            {tStore("saveDraft")}
          </Button>
          <Button type="button" disabled={saving || lines.length === 0} onClick={onSubmit}>
            {tForm("submitPending")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
