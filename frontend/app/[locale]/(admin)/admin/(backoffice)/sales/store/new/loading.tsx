import { Skeleton } from "@/components/ui/skeleton";

export default function StoreSalesNewLoading() {
  return (
    <>
      <div className="flex flex-col gap-4 md:hidden">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="hidden min-h-0 w-full gap-2 md:flex">
        <Skeleton className="h-96 min-w-0 flex-[3]" />
        <Skeleton className="w-px shrink-0 self-stretch" />
        <Skeleton className="h-96 min-w-0 flex-[2] md:max-h-[calc(100svh-3.5rem-1rem-1.5rem)] md:h-[min(24rem,calc(100svh-3.5rem-1rem-1.5rem))]" />
      </div>
    </>
  );
}
