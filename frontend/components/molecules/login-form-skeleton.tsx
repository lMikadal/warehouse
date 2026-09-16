"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { FormCard, FormCardContent, FormCardHeader } from "./form-card";

export type LoginFormSkeletonProps = {
  className?: string;
};

export function LoginFormSkeleton({ className }: LoginFormSkeletonProps) {
  const tCrud = useTranslations("crud");

  return (
    <FormCard
      className={cn(
        "w-full max-w-form shrink-0 bg-background px-2 py-7 lg:rounded-none lg:border-0 lg:px-0 lg:py-0 lg:shadow-none lg:ring-0",
        className
      )}
      aria-busy="true"
      aria-label={tCrud("loading")}
    >
      <FormCardHeader className="items-center space-y-3 text-center lg:items-start lg:text-left">
        <Skeleton className="h-8 w-48 lg:h-9" />
        <Skeleton className="h-4 w-64 lg:hidden" />
      </FormCardHeader>
      <FormCardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-login" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full rounded-login" />
        </div>
        <Skeleton className="mt-3 h-11 w-full rounded-md" />
      </FormCardContent>
    </FormCard>
  );
}
