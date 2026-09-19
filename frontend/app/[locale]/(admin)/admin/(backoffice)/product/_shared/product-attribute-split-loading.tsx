import { Skeleton } from "@/components/ui/skeleton";

export function ProductAttributeSplitLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="flex min-h-0 flex-col gap-3 lg:min-h-[min(70vh,640px)]">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 min-w-48 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-56 rounded-lg" />
          </div>
          <Skeleton className="min-h-64 flex-1 rounded-lg border border-border" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="h-fit w-full self-start rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
