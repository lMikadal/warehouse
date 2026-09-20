"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import {
  useAdminBackofficeActor,
  useResourcePermissions,
} from "@/lib/admin-backoffice-actor-context";
import { formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import {
  duplicateQuotation,
  fetchQuotationDetail,
  OrderQuotationApiError,
  pickingQuotation,
  postQuotationAction,
  type QuotationDetail,
} from "@/lib/order-quotation-api";

import { quotationStatusPillClass } from "./quotation-status-styles";

type Props = { id: number };

export function QuotationDetailPage({ id }: Props) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const actor = useAdminBackofficeActor();
  const perms = useResourcePermissions("order", "order_quotation");
  const tPage = useTranslations("page.orderQuotation");
  const tError = useTranslations("error");

  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [creditDate, setCreditDate] = useState("");
  const [stockOpen, setStockOpen] = useState(false);
  const [pickingResult, setPickingResult] = useState<{
    partial?: boolean;
    out_of_stock_count?: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setDetail(await fetchQuotationDetail(locale, id));
    } catch {
      setLoadError(true);
      toast.error(tError("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [id, locale, perms.view, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  const superadmin = actor.type === "superadmin";

  const accept = async (mode: "payment" | "credit") => {
    try {
      const body: Record<string, string> = { mode };
      if (mode === "credit") {
        if (!creditDate) {
          toast.error(tError("required"));
          return;
        }
        body.credit_date = creditDate;
      }
      await postQuotationAction(locale, id, "accept", body);
      setAcceptOpen(false);
      if (mode === "payment") {
        router.push(`/admin/sales/quotation/${id}/payment`);
      } else {
        toast.success(tPage("detail.accept"));
        void load();
      }
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    }
  };

  const runPicking = async (onlyInStock: boolean) => {
    try {
      const res = await pickingQuotation(locale, id, onlyInStock);
      setStockOpen(false);
      if (res.partial && res.out_of_stock_count) {
        setPickingResult(res);
      } else {
        toast.success(tPage("detail.picking"));
        void load();
      }
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="text-muted-foreground">
        {loadError ? tError("loadFailed") : tError("noData")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <CrudPageHeader
        title={detail.sku?.trim() || "—"}
        description={
          <span className={quotationStatusPillClass(detail.status)}>
            {tPage(`saleStatus.${detail.status}`)}
          </span>
        }
        actions={
          detail.status === "draft" && perms.update && !detail.receipt_locked ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/sales/quotation/${id}/edit`)}
            >
              {tPage("detail.edit")}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-4">
          <p className="font-medium">{detail.member_name || "—"}</p>
          <p className="text-muted-foreground text-sm">{detail.member_tel}</p>
          <p className="text-muted-foreground text-sm">{detail.member_email}</p>
        </div>
        <div className="rounded-md border p-4 text-sm">
          <p>
            {tPage("form.issueDate")}: {detail.issue_date || "—"}
          </p>
          <p>
            {tPage("form.validUntil")}: {detail.valid_until || "—"}
          </p>
          <p>
            {tPage("form.reserveStock")}: {detail.reserve_stock ? "✓" : "—"}
          </p>
          <p className="mt-2 tabular-nums font-semibold">
            {detail.grand_total.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.map((it) => (
              <tr key={it.id} className="border-b">
                <td className="p-2">{it.product_item_id}</td>
                <td className="p-2 text-right tabular-nums">{it.amount}</td>
                <td className="p-2 text-right tabular-nums">
                  {it.total_price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground text-xs">
        {formatDateTime(detail.created_at, locale)}
      </p>

      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t bg-background p-4">
        {detail.status === "pending" && superadmin ? (
          <>
            <Button
              variant="outline"
              onClick={() => void postQuotationAction(locale, id, "reject", {}).then(load)}
            >
              {tPage("detail.reject")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void postQuotationAction(locale, id, "return", {}).then(load)}
            >
              {tPage("detail.returnEdit")}
            </Button>
            <Button
              onClick={() => void postQuotationAction(locale, id, "approve", {}).then(load)}
            >
              {tPage("detail.approve")}
            </Button>
          </>
        ) : null}
        {detail.status === "approved" && !detail.receipt_locked ? (
          <>
            <Button variant="outline" onClick={() => window.print()}>
              {tPage("detail.print")}
            </Button>
            <Button onClick={() => setAcceptOpen(true)}>
              {tPage("detail.accept")}
            </Button>
          </>
        ) : null}
        {detail.status === "approved" && detail.accept_mode === "payment" ? (
          <Button
            onClick={() => router.push(`/admin/sales/quotation/${id}/payment`)}
          >
            {tPage("detail.pay")}
          </Button>
        ) : null}
        {detail.status === "success" ? (
          <>
            <Button variant="outline" onClick={() => window.print()}>
              {tPage("detail.print")}
            </Button>
            <Button onClick={() => setStockOpen(true)}>
              {tPage("detail.picking")}
            </Button>
          </>
        ) : null}
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("acceptModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Button onClick={() => void accept("payment")}>
              {tPage("acceptModal.payment")}
            </Button>
            <div className="grid gap-2">
              <Label htmlFor="credit-date">{tPage("acceptModal.creditDate")}</Label>
              <Input
                id="credit-date"
                type="date"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
              />
              <Button variant="secondary" onClick={() => void accept("credit")}>
                {tPage("acceptModal.credit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("detail.picking")}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setStockOpen(false)}>
              {tPage("pickingModal.cancel")}
            </Button>
            <Button onClick={() => void runPicking(true)}>
              {tPage("pickingModal.onlyInStock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickingResult != null} onOpenChange={() => setPickingResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("duplicateModal.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {tPage("duplicateModal.body", {
              count: pickingResult?.out_of_stock_count ?? 0,
            })}
          </p>
          <DialogFooter>
            <Button
              onClick={() => {
                void duplicateQuotation(locale, id).then((j) =>
                  router.push(`/admin/sales/quotation/${j.id}/edit`)
                );
              }}
            >
              {tPage("duplicateModal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
