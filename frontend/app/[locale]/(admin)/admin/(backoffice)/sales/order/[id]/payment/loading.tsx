import { Skeleton } from "@/components/ui/skeleton";

export default function PickingPaymentLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
