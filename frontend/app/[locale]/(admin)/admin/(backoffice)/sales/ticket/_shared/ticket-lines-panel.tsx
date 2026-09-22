"use client";

import { SquarePen, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { sumLineDeposits } from "../_lib/ticket-line-helpers";

export const TICKET_UNITS = ["piece", "box", "set"] as const;
export type TicketUnit = (typeof TICKET_UNITS)[number];

export type TicketFormLine = {
  key: string;
  itemId?: number;
  type: "catalog" | "custom";
  /** When set, dedupes pushes from the left staging table. */
  stagedKey?: string;
  productItemId?: number;
  productName: string;
  productSku: string;
  brandName: string;
  stockQty: number;
  brandId: string;
  modelId: string;
  engineId: string;
  identificationNumber: string;
  note: string;
  systemFileIds: number[];
  qtySell: number;
  qtyReorder: number;
  unit: TicketUnit;
  deposit: string;
};

export type TicketPaymentOption = { value: string; label: string };

function money(n: number, locale: string) {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  documentHeading: string;
  lines: TicketFormLine[];
  linesTab: "catalog" | "custom";
  onLinesTabChange: (tab: "catalog" | "custom") => void;
  grandDepositOverride: string | null;
  paymentMethodId: string;
  paymentOptions: TicketPaymentOption[];
  onPaymentMethodChange: (id: string) => void;
  saving: boolean;
  readOnly: boolean;
  onLineChange: (key: string, patch: Partial<TicketFormLine>) => void;
  onLineRemove: (key: string) => void;
  onGrandDepositOverrideChange: (value: string | null) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

export function TicketLinesPanel({
  documentHeading,
  lines,
  linesTab,
  onLinesTabChange,
  grandDepositOverride,
  paymentMethodId,
  paymentOptions,
  onPaymentMethodChange,
  saving,
  readOnly,
  onLineChange,
  onLineRemove,
  onGrandDepositOverrideChange,
  onCancel,
  onSaveDraft,
  onSubmit,
}: Props) {
  const locale = useLocale();
  const tForm = useTranslations("page.orderTicket.form");
  const tCrud = useTranslations("crud");
  const tList = useTranslations("productList");

  const catalogLines = lines.filter((l) => l.type === "catalog");
  const customLines = lines.filter((l) => l.type === "custom");
  const depositOld = sumLineDeposits(catalogLines);
  const depositNew = sumLineDeposits(customLines);
  const depositAuto = depositOld + depositNew;
  const grandDeposit =
    grandDepositOverride != null && grandDepositOverride.trim() !== ""
      ? parseFloat(grandDepositOverride) || 0
      : depositAuto;

  const unitLabel = (unit: TicketUnit) =>
    unit === "box"
      ? tList("packUnitBox")
      : unit === "set"
        ? tList("packUnitSet")
        : tList("packUnitPiece");

  const renderGroup = (group: TicketFormLine[], showProductMeta: boolean) => {
    if (group.length === 0) {
      return (
        <p className="text-muted-foreground flex min-h-24 w-full items-center justify-center py-6 text-center text-sm">
          {tForm("emptyLines")}
        </p>
      );
    }
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tForm("colProduct")}</TableHead>
              {showProductMeta ? (
                <TableHead className="text-right tabular-nums">
                  {tForm("colStock")}
                </TableHead>
              ) : null}
              <TableHead className="text-center">{tForm("colQtySell")}</TableHead>
              <TableHead className="text-center">
                {tForm("colQtyReorder")}
              </TableHead>
              <TableHead className="text-center">{tForm("colUnit")}</TableHead>
              <TableHead className="text-right">{tForm("colDeposit")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.map((line) => (
              <TableRow key={line.key}>
                <TableCell>
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium">{line.productName || "—"}</p>
                    {line.productSku ? (
                      <p className="text-xs text-muted-foreground">
                        SKU: {line.productSku}
                      </p>
                    ) : null}
                    {line.brandName ? (
                      <p className="text-xs text-muted-foreground">
                        {line.brandName}
                      </p>
                    ) : null}
                    {line.note ? (
                      <p className="text-xs text-muted-foreground">
                        {tForm("newNote")}: {line.note}
                      </p>
                    ) : null}
                    {line.identificationNumber ? (
                      <p className="text-xs text-muted-foreground">
                        {tForm("newChassis")}: {line.identificationNumber}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                {showProductMeta ? (
                  <TableCell className="text-right tabular-nums">
                    {line.stockQty}
                  </TableCell>
                ) : null}
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="w-20 text-center tabular-nums"
                    value={line.qtySell}
                    disabled={readOnly}
                    aria-label={tForm("colQtySell")}
                    onChange={(e) =>
                      onLineChange(line.key, {
                        qtySell: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="w-20 text-center tabular-nums"
                    value={line.qtyReorder}
                    disabled={readOnly}
                    aria-label={tForm("colQtyReorder")}
                    onChange={(e) =>
                      onLineChange(line.key, {
                        qtyReorder: Number(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={line.unit}
                    disabled={readOnly}
                    onValueChange={(v) =>
                      onLineChange(line.key, { unit: v as TicketUnit })
                    }
                  >
                    <SelectTrigger
                      className="w-24"
                      aria-label={tForm("colUnit")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {unitLabel(u)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    className="w-28 text-right tabular-nums"
                    value={line.deposit}
                    disabled={readOnly}
                    aria-label={tForm("colDeposit")}
                    onChange={(e) =>
                      onLineChange(line.key, { deposit: e.target.value })
                    }
                  />
                </TableCell>
                <TableCell>
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    tone="delete"
                    disabled={readOnly}
                    aria-label={tForm("removeLine")}
                    onClick={() => onLineRemove(line.key)}
                  >
                    <Trash2 className="text-current" aria-hidden />
                  </ButtonIcon>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="md:flex md:min-h-0 md:flex-col">
      <CardHeader>
        <CardTitle className="text-base">{documentHeading}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 md:overflow-y-auto">
        <Tabs
          value={linesTab}
          onValueChange={(v) => onLinesTabChange(v as "catalog" | "custom")}
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-5 p-0"
          >
            <TabsTrigger
              value="catalog"
              className="text-muted-foreground flex-none px-0 data-active:text-primary"
            >
              {tForm("tabExisting")} ({catalogLines.length})
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="text-muted-foreground flex-none px-0 data-active:text-primary"
            >
              {tForm("tabNew")} ({customLines.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-3">
            {renderGroup(catalogLines, true)}
          </TabsContent>
          <TabsContent value="custom" className="mt-3">
            {renderGroup(customLines, false)}
          </TabsContent>
        </Tabs>

        <div className="space-y-2 border-t pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{tForm("lineCount")}</span>
            <span className="tabular-nums">{lines.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {tForm("depositExisting")}
            </span>
            <span className="tabular-nums">{money(depositOld, locale)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{tForm("depositNew")}</span>
            <span className="tabular-nums">{money(depositNew, locale)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label
              htmlFor="ticket-grand-deposit"
              className="text-primary flex items-center gap-1.5 font-medium"
            >
              <SquarePen className="size-3.5 shrink-0" aria-hidden />
              {tForm("depositGrand")}
            </Label>
            <Input
              id="ticket-grand-deposit"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="w-36 text-right tabular-nums"
              disabled={readOnly}
              value={grandDepositOverride ?? String(depositAuto)}
              onChange={(e) => onGrandDepositOverrideChange(e.target.value)}
              onBlur={(e) => {
                if (e.target.value.trim() === "") {
                  onGrandDepositOverrideChange(null);
                }
              }}
            />
          </div>
          <p className="text-primary text-right text-sm font-semibold tabular-nums">
            {money(grandDeposit, locale)}
          </p>
        </div>

        {paymentOptions.length > 0 ? (
          <div className="grid gap-2 border-t pt-3">
            <p className="text-sm font-medium">{tForm("paymentMethod")}</p>
            <RadioGroup
              value={paymentMethodId}
              onValueChange={onPaymentMethodChange}
              className="flex flex-wrap items-center gap-4"
              aria-label={tForm("paymentMethod")}
            >
              {paymentOptions.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={opt.value}
                    id={`ticket-pay-${opt.value}`}
                    disabled={readOnly}
                  />
                  <Label htmlFor={`ticket-pay-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : null}

        <div
          className={cn("flex flex-wrap justify-end gap-2", readOnly && "hidden")}
        >
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving || lines.length === 0}
            onClick={onSaveDraft}
          >
            {tForm("saveDraft")}
          </Button>
          <Button
            type="button"
            disabled={saving || lines.length === 0}
            onClick={onSubmit}
          >
            {tForm("submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
