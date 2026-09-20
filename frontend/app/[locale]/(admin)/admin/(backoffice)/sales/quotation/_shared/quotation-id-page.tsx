"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { fetchQuotationDetail } from "@/lib/order-quotation-api";

import { QuotationDetailPage } from "./quotation-detail-page";
import { QuotationFormPage } from "./quotation-form-page";
import { StoreSalesFormDesktopSplitSkeleton } from "../../store/_shared/store-sales-form-desktop-split-skeleton";

type Props = { id: number };

type Branch = "loading" | "form" | "detail";

export function QuotationIdPage({ id }: Props) {
  const locale = useLocale();
  const [branch, setBranch] = useState<Branch>("loading");

  const resolveBranchFromApi = useCallback(async () => {
    const d = await fetchQuotationDetail(locale, id);
    const next = d.status === "draft" ? "form" : "detail";
    setBranch(next);
    return d.status;
  }, [id, locale]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) await resolveBranchFromApi();
      } catch {
        if (!cancelled) setBranch("detail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, locale, resolveBranchFromApi]);

  if (branch === "loading") {
    return (
      <>
        <div className="flex flex-col gap-4 md:hidden">
          <Skeleton className="h-10 w-64" />
          <StoreSalesFormDesktopSplitSkeleton />
        </div>
        <div className="hidden md:block">
          <StoreSalesFormDesktopSplitSkeleton />
        </div>
      </>
    );
  }

  if (branch === "form") {
    return (
      <QuotationFormPage
        editId={id}
        onSubmitted={() => resolveBranchFromApi()}
      />
    );
  }

  return <QuotationDetailPage id={id} />;
}
