"use client";

import { History } from "lucide-react";
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
  fetchClaimDetail,
  fetchClaimHistory,
  OrderClaimApiError,
  type ClaimDetail,
} from "@/lib/order-claim-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

import { PurchaseHistoryDialog } from "../../purchase/_shared/purchase-history-dialog";
import { ClaimProcessView } from "./claim-process-view";

/** One screen for both routes: `[id]` processes the claim, `[id]/detail` only reads it. */
export function ClaimDetailPage({
  claimId,
  readOnly = false,
}: {
  claimId: number;
  readOnly?: boolean;
}) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderClaim.edit");
  const tClaim = useTranslations("page.orderClaim");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_claim");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchClaimDetail(claimId));
    } catch (e) {
      toast.error(e instanceof OrderClaimApiError ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [claimId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchClaimHistory(locale, claimId);
      setHistory(res.items);
    } catch {
      toast.error(tClaim("historyLoadError"));
    }
  };

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
        title={`${tClaim("colClaimNumber")} ${detail.sku || tClaim("emptyCell")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openHistory}>
              <History className="size-4" />
              {tClaim("historyModalTitle")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/order/claim")}
            >
              {t("backToList")}
            </Button>
          </div>
        }
      />
      <ClaimProcessView
        detail={detail}
        readOnly={readOnly || !perms.update}
        onMutated={() => void load()}
      />
      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />
    </div>
  );
}
