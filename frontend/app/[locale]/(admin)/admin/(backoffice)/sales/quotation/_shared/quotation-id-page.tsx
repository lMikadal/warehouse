"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await fetchQuotationDetail(locale, id);
        if (!cancelled) {
          setBranch(d.status === "draft" ? "form" : "detail");
        }
      } catch {
        if (!cancelled) setBranch("detail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, locale]);

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
    return <QuotationFormPage editId={id} />;
  }

  return <QuotationDetailPage id={id} />;
}
