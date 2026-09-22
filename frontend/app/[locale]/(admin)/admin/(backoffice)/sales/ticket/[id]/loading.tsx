import { Skeleton } from "@/components/ui/skeleton";

import { TicketFormDesktopSplitSkeleton } from "../_shared/ticket-form-desktop-split-skeleton";

export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <TicketFormDesktopSplitSkeleton />
    </div>
  );
}
