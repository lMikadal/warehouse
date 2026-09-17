import { cn } from "@/lib/utils";

/** Design `.wh-view-tree-item` — nested tree node wrapper */
export const whViewTreeItemClass = cn(
  "relative",
  "[.wh-view-tree__children>&]:before:absolute",
  "[.wh-view-tree__children>&]:before:-left-4",
  "[.wh-view-tree__children>&]:before:top-5",
  "[.wh-view-tree__children>&]:before:h-px",
  "[.wh-view-tree__children>&]:before:w-3",
  "[.wh-view-tree__children>&]:before:bg-border/80"
);

/** Design `.wh-view-tree__children` */
export const whViewTreeChildrenClass =
  "wh-view-tree__children ml-3 border-l border-border/80 pl-4";

/** Design `.wh-view-row` */
export const whViewRowClass =
  "wh-view-row flex flex-nowrap items-center gap-x-2 gap-y-1 rounded-[calc(var(--radius)-2px)] px-2 py-2.5 sm:gap-x-3 hover:bg-muted/25";

export function whViewRowIconClass(type: string): string {
  return cn(
    "flex size-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-4px)]",
    type === "zone" && "bg-sky-100 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400",
    type === "shelf" &&
      "bg-violet-100 text-violet-600 dark:bg-violet-600/20 dark:text-violet-400",
    type === "rack" &&
      "bg-orange-100 text-orange-600 dark:bg-orange-600/20 dark:text-orange-400",
    type === "bin" &&
      "bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-400"
  );
}
