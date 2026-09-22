import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while client-only resizable split loads (matches route loading.tsx). */
export function TicketFormDesktopSplitSkeleton() {
  return (
    <div className="flex min-h-0 w-full gap-2">
      <Skeleton className="h-96 min-w-0 flex-[3]" />
      <Skeleton className="w-px shrink-0 self-stretch" />
      <Skeleton className="h-96 min-w-0 flex-[2]" />
    </div>
  );
}
