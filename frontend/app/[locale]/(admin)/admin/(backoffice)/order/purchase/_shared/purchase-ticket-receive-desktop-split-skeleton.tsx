import { Skeleton } from "@/components/ui/skeleton";

export function PurchaseTicketReceiveDesktopSplitSkeleton() {
  return (
    <div className="flex h-[min(85vh,56rem)] min-h-[480px] w-full gap-3">
      <div className="flex min-w-0 flex-[58] flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="min-h-0 flex-1 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="hidden w-px bg-border md:block" />
      <div className="flex min-w-0 flex-[42] flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="min-h-0 flex-1 w-full" />
      </div>
    </div>
  );
}
