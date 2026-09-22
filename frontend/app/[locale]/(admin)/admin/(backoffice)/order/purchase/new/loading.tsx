import { Skeleton } from "@/components/ui/skeleton";

import { PurchaseTicketReceiveDesktopSplitSkeleton } from "../_shared/purchase-ticket-receive-desktop-split-skeleton";

export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <PurchaseTicketReceiveDesktopSplitSkeleton />
    </div>
  );
}
