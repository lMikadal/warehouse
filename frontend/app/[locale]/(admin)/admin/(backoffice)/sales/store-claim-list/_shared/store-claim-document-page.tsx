"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SalesClaimProcessView } from "../../../order/sales-claim/_shared/sales-claim-process-view";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { SalesClaimDetail } from "@/lib/order-sales-claim-api";
import {
  fetchStoreClaimDocumentDetail,
  OrderStoreClaimApiError,
} from "@/lib/order-store-claim-api";

export function StoreClaimDocumentPage({ claimId }: { claimId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderStoreClaimList");
  const tSales = useTranslations("page.orderSalesClaim");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store_claim_list");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SalesClaimDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchStoreClaimDocumentDetail(locale, claimId));
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError
          ? e.message
          : tPage("documentLoadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [claimId, locale, tPage]);

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[7fr_3fr]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{tPage("documentNotFound")}</p>;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={`${tSales("docTitle")} ${detail.sku?.trim() || tPage("emptyCell")}`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/sales/store-claim-list")}
          >
            {tPage("backToList")}
          </Button>
        }
      />
      <SalesClaimProcessView
        detail={detail}
        readOnly
        onMutated={() => void load()}
      />
    </div>
  );
}
