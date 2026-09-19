"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchOrderCompareRules,
  OrderCompareApiError,
  type OrderCompareRuleLine,
  type RuleWritePayload,
} from "@/lib/order-compare-api";

export type OrderCompareScope = {
  brandId: number;
  brandName: string;
  categoryId?: number | null;
  categoryName?: string;
};

type Props = {
  open: boolean;
  scope: OrderCompareScope | null;
  initialRules?: RuleWritePayload[] | null;
  canSave: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (scope: OrderCompareScope, rules: RuleWritePayload[]) => void;
};

function linesToPayload(lines: OrderCompareRuleLine[]): RuleWritePayload[] {
  return lines.map((l) => ({
    member_setting_relation_id: l.member_setting_relation_id,
    discount: l.discount,
    discount_type: "percent",
  }));
}

export function OrderCompareDiscountDialog({
  open,
  scope,
  initialRules,
  canSave,
  onOpenChange,
  onSaved,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("orderCompare");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tForm = useTranslations("form");

  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<OrderCompareRuleLine[]>([]);
  const [applyAll, setApplyAll] = useState("");

  const breadcrumb =
    scope &&
    (scope.categoryName
      ? `${scope.brandName} > ${scope.categoryName}`
      : scope.brandName);

  const load = useCallback(async () => {
    if (!scope || !open) return;
    if (initialRules) {
      setLoading(true);
      try {
        const server = await fetchOrderCompareRules(
          locale,
          scope.brandId,
          scope.categoryId
        );
        const byRel = new Map(
          initialRules.map((r) => [r.member_setting_relation_id, r.discount])
        );
        setLines(
          server.map((row) => ({
            ...row,
            discount: byRel.get(row.member_setting_relation_id) ?? row.discount,
          }))
        );
      } catch (e) {
        toast.error(
          e instanceof OrderCompareApiError ? e.message : tError("generic")
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      setLines(await fetchOrderCompareRules(locale, scope.brandId, scope.categoryId));
    } catch (e) {
      toast.error(
        e instanceof OrderCompareApiError ? e.message : tCrud("toast.error")
      );
    } finally {
      setLoading(false);
    }
  }, [scope, open, locale, initialRules, tError]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  function handleApplyAll() {
    const v = Number(applyAll);
    if (Number.isNaN(v) || v < 0 || v > 100) return;
    setLines((prev) => prev.map((row) => ({ ...row, discount: v })));
  }

  function handleSave() {
    if (!scope) return;
    onSaved(scope, linesToPayload(lines));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[min(72rem,96vw)]">
        <DialogHeader>
          {breadcrumb ? (
            <p className="text-sm text-muted-foreground">{breadcrumb}</p>
          ) : null}
          <DialogTitle className="text-primary">{t("dialogTitle")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-8" />
          </div>
        ) : (
          <Table className="table-fixed">
            <colgroup>
              <col />
              <col />
              <col />
              <col className="w-40" />
              <col className="w-44" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colBusiness")}</TableHead>
                <TableHead>{t("colGroup")}</TableHead>
                <TableHead>{t("colCredit")}</TableHead>
                <TableHead>{t("colDiscountPercent")}</TableHead>
                <TableHead className="whitespace-normal">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 min-w-0 flex-1 tabular-nums"
                      placeholder={t("applyAllPlaceholder")}
                      value={applyAll}
                      onChange={(e) => setApplyAll(e.target.value)}
                      disabled={!canSave}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      onClick={handleApplyAll}
                      disabled={!canSave}
                    >
                      {t("applyAll")}
                    </Button>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((row) => (
                <TableRow key={row.member_setting_relation_id}>
                  <TableCell>{row.business_name || "—"}</TableCell>
                  <TableCell>{row.group_name || "—"}</TableCell>
                  <TableCell>{row.credit_name || "—"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-9 w-full tabular-nums"
                      value={row.discount === 0 ? "" : String(row.discount)}
                      placeholder={tForm("placeholder.input", {
                        label: t("colDiscountPercent"),
                      })}
                      disabled={!canSave}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const next = raw === "" ? 0 : Number(raw);
                        setLines((prev) =>
                          prev.map((l) =>
                            l.member_setting_relation_id ===
                            row.member_setting_relation_id
                              ? {
                                  ...l,
                                  discount: Number.isNaN(next) ? 0 : next,
                                }
                              : l
                          )
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell className="p-0" aria-hidden />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || loading}>
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
