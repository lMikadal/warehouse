"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** Route `loading.tsx` includes header; in-page refetch keeps real `CrudPageHeader`. */
  showPageHeader?: boolean;
};

export function WarehouseViewPageSkeleton({ showPageHeader = true }: Props) {
  const tCrud = useTranslations("crud");

  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label={tCrud("loading")}
    >
      {showPageHeader ? (
        <header className="space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </header>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="min-h-64 w-full rounded-lg" />
    </div>
  );
}
