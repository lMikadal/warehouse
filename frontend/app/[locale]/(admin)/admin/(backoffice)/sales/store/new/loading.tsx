import { Skeleton } from "@/components/ui/skeleton";

export default function StoreSalesNewLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-[6fr_4fr]">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
