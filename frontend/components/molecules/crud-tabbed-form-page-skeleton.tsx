"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { FormCard, FormCardContent, FormCardHeader } from "./form-card";

export type CrudTabbedFormPageSkeletonProps = {
  showPageHeader?: boolean;
  showFixedFooter?: boolean;
  leftCardCount?: number;
  /** Collapsed pricing-tab variant row strips (product list form). */
  pricingVariantStrips?: number;
  /** Member user edit profile header card above tabs. */
  showEditProfileHeader?: boolean;
  /** Stacked right sidebar cards (e.g. member edit aside); default single card. */
  rightSidebarCards?: number;
  className?: string;
};

export function CrudTabbedFormPageSkeleton({
  showPageHeader = true,
  showFixedFooter = true,
  leftCardCount = 3,
  pricingVariantStrips = 0,
  showEditProfileHeader = false,
  rightSidebarCards = 1,
  className,
}: CrudTabbedFormPageSkeletonProps) {
  const tCrud = useTranslations("crud");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  return (
    <div
      className={cn("flex flex-col gap-4 pb-20", className)}
      aria-busy="true"
      aria-label={tCrud("loading")}
    >
      {showPageHeader ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </header>
      ) : null}

      {showEditProfileHeader ? (
        <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
            <FormCard>
              <FormCardContent className="grid gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)]">
                <Skeleton className="size-24 shrink-0 rounded-md" />
                <div className="min-w-0 space-y-3">
                  <Skeleton className="ml-auto h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-48 max-w-full" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </FormCardContent>
            </FormCard>
            <div className="flex gap-6 border-b border-border pb-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
            {Array.from({ length: leftCardCount }, (_, i) => (
              <FormCard key={i}>
                <FormCardHeader>
                  <Skeleton className="h-5 w-40" />
                </FormCardHeader>
                <FormCardContent className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-10 w-full md:col-span-2" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full md:col-span-2" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </FormCardContent>
              </FormCard>
            ))}
          </div>
          <div className="flex min-w-0 w-full flex-col gap-4 lg:col-start-2 lg:self-start">
            {Array.from({ length: rightSidebarCards }, (_, i) => (
              <FormCard key={`aside-${i}`} className="h-fit">
                <FormCardHeader>
                  <Skeleton className="h-5 w-32" />
                </FormCardHeader>
                <FormCardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </FormCardContent>
              </FormCard>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-6 border-b border-border pb-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>

          <div className="mt-2 grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
              {Array.from({ length: pricingVariantStrips }, (_, i) => (
                <div
                  key={`variant-${i}`}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-3"
                >
                  <Skeleton className="size-11 shrink-0 rounded-md" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 w-28" />
                  <Skeleton className="ml-auto size-9 rounded-md" />
                </div>
              ))}
              {Array.from({ length: leftCardCount }, (_, i) => (
                <FormCard key={i}>
                  <FormCardHeader>
                    <Skeleton className="h-5 w-40" />
                  </FormCardHeader>
                  <FormCardContent className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-10 w-full md:col-span-2" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full md:col-span-2" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </FormCardContent>
                </FormCard>
              ))}
            </div>
            <div className="flex min-w-0 w-full flex-col gap-4 lg:col-start-2 lg:self-start">
              {Array.from({ length: rightSidebarCards }, (_, i) => (
                <FormCard key={`aside-${i}`} className="h-fit">
                  <FormCardHeader>
                    <Skeleton className="h-5 w-32" />
                  </FormCardHeader>
                  <FormCardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </FormCardContent>
                </FormCard>
              ))}
            </div>
          </div>
        </>
      )}

      {showFixedFooter ? (
        <div
          className={cn(
            "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
            footerInsetLeft ? "left-[var(--sidebar-width)]" : "left-0",
          )}
          aria-hidden
        >
          <div className="mx-auto flex w-full max-w-crud-page justify-end gap-2 px-admin-content py-3">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
