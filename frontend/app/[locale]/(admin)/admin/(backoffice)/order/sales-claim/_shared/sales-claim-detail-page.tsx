"use client";

import { Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  fetchSalesClaimDetail,
  OrderSalesClaimApiError,
  type SalesClaimDetail,
} from "@/lib/order-sales-claim-api";

import { SalesClaimProcessView } from "./sales-claim-process-view";

/** One screen for both routes: `[id]` processes the claim, `[id]/detail` only reads it. */
export function SalesClaimDetailPage({
  claimId,
  readOnly = false,
}: {
  claimId: number;
  readOnly?: boolean;
}) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderSalesClaim");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_sales_claim");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SalesClaimDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchSalesClaimDetail(locale, claimId));
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : t("loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [claimId, locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{t("notFound")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={`${t("docTitle")} ${detail.sku?.trim() || t("emptyCell")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {detail.status === "success" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="text-current" />
                {t("printButton")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/order/sales-claim")}
            >
              {t("backToList")}
            </Button>
          </div>
        }
      />
      <SalesClaimProcessView
        detail={detail}
        readOnly={readOnly || !perms.update}
        onMutated={() => void load()}
      />
    </div>
  );
}
