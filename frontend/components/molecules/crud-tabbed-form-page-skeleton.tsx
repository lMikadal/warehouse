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
  className?: string;
};

export function CrudTabbedFormPageSkeleton({
  showPageHeader = true,
  showFixedFooter = true,
  leftCardCount = 3,
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

      <div className="flex gap-6 border-b border-border pb-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>

      <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
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
        <FormCard className="h-fit">
          <FormCardHeader>
            <Skeleton className="h-5 w-24" />
          </FormCardHeader>
          <FormCardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-28" />
          </FormCardContent>
        </FormCard>
      </div>

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
