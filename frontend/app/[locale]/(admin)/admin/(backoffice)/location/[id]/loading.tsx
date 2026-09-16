import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-24 w-full max-w-md" />
    </div>
  );
}
