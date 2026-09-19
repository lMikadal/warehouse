"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

function MemberTierCardSkeleton() {
  return (
    <article className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="min-w-[8rem] flex-1 space-y-2">
          <Skeleton className="h-4 w-36 max-w-full" />
          <Skeleton className="h-3 w-28 max-w-full" />
          <Skeleton className="h-2 w-full max-w-xs" />
        </div>
        <div className="min-w-[8rem] shrink-0 space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
        <div className="flex gap-1.5">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
      <div className="border-t border-border px-4 pb-4 pt-2">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </article>
  );
}

/** In-page list refetch skeleton (header + form stay visible). */
export function MemberTierListCardsSkeleton({ count = 3 }: { count?: number }) {
  const tCrud = useTranslations("crud");

  return (
    <div
      aria-busy="true"
      aria-label={tCrud("loading")}
      className="space-y-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <MemberTierCardSkeleton key={i} />
      ))}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
      </div>
    </div>
  );
}

/** Expanded tier relations loading placeholder. */
export function MemberTierRelationsSkeleton() {
  return (
    <div className="mt-3 space-y-2" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-24 w-full min-w-[42rem] rounded-md" />
    </div>
  );
}

export function MemberTierPageSkeleton() {
  const tCrud = useTranslations("crud");

  return (
    <div aria-busy="true" aria-label={tCrud("loading")} className="flex flex-col">
      <div className="mb-4 grid gap-4 lg:grid-cols-[min(100%,320px)_1fr]">
        <header className="space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </header>
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[min(100%,320px)_1fr] lg:items-start">
        <Skeleton className="min-h-96 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <MemberTierListCardsSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
