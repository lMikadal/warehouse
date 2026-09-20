"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  fetchQuotationDetail,
  OrderQuotationApiError,
  postQuotationAction,
} from "@/lib/order-quotation-api";

type Props = { id: number };

export function QuotationPaymentPage({ id }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const perms = useResourcePermissions("order", "order_quotation");
  const tPage = useTranslations("page.orderQuotation");
  const tError = useTranslations("error");

  const [grandTotal, setGrandTotal] = useState(0);
  const [cashAmount, setCashAmount] = useState("");
  const [methodId, setMethodId] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!perms.view) return;
    void fetchQuotationDetail(locale, id)
      .then((d) => {
        setGrandTotal(d.grand_total);
        setCashAmount(String(d.grand_total));
      })
      .catch(() => toast.error(tError("loadFailed")))
      .finally(() => setLoading(false));
  }, [id, locale, perms.view, tError]);

  const confirm = async () => {
    try {
      await postQuotationAction(locale, id, "payment", {
        methods: [
          {
            setting_payment_method_id: Number(methodId) || 1,
            amount: Number(cashAmount) || 0,
          },
        ],
      });
      toast.success(tPage("payment.confirm"));
      router.push(`/admin/sales/quotation/${id}`);
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    }
  };

  if (!perms.update) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) return null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <CrudPageHeader title={tPage("payment.title")} />
      <div className="rounded-md border p-4">
        <p className="text-lg font-semibold tabular-nums">
          {grandTotal.toFixed(2)}
        </p>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="pay-method-id">Payment method id</Label>
            <Input
              id="pay-method-id"
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pay-amount">Amount</Label>
            <Input
              id="pay-amount"
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => void confirm()}>{tPage("payment.confirm")}</Button>
      </div>
    </div>
  );
}
