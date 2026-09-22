"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import {
  fetchPurchaseDetail,
  OrderPurchaseApiError,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";

import { PurchaseApprovePage } from "./purchase-approve-page";
import { PurchaseFormPage } from "./purchase-form-page";

type Mode = "loading" | "edit" | "approve" | "redirect" | "error";

/**
 * Status router for `/admin/order/purchase/[id]` (v1 parity):
 * draft/rejected → form; pending → approve; paying → payment; else → detail.
 */
export function PurchaseByIdPage({ purchaseId }: { purchaseId: number }) {
  const router = useRouter();
  const tError = useTranslations("error");
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(purchaseId) || purchaseId <= 0) {
      setMode("error");
      setError(tError("loadFailed"));
      return;
    }

    let cancelled = false;
    setMode("loading");
    setError(null);

    void (async () => {
      try {
        const detail = await fetchPurchaseDetail(purchaseId);
        if (cancelled) return;
        const status: PurchaseStatus = detail.status;
        if (status === "draft" || status === "rejected") {
          setMode("edit");
          return;
        }
        if (status === "pending") {
          setMode("approve");
          return;
        }
        if (status === "paying") {
          setMode("redirect");
          router.replace(`/admin/order/purchase/${purchaseId}/payment`);
          return;
        }
        setMode("redirect");
        router.replace(`/admin/order/purchase/${purchaseId}/detail`);
      } catch (e) {
        if (cancelled) return;
        setMode("error");
        setError(
          e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [purchaseId, router, tError]);

  if (mode === "loading" || mode === "redirect") {
    return (
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (mode === "error") {
    return (
      <p className="text-sm text-muted-foreground">{error ?? tError("loadFailed")}</p>
    );
  }

  if (mode === "approve") {
    return <PurchaseApprovePage purchaseId={purchaseId} />;
  }

  return <PurchaseFormPage editId={purchaseId} />;
}
