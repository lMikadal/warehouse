export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

/** Page numbers and `"..."` ellipsis — ported from design/js/components/crud-list.js */
export function buildPageItems(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | "...")[] = [1];
  let windowStart = Math.max(2, current - 1);
  let windowEnd = Math.min(total - 1, current + 1);
  if (current <= 4) {
    windowStart = 2;
    windowEnd = Math.min(5, total - 1);
  }
  if (current >= total - 3) {
    windowStart = Math.max(2, total - 4);
    windowEnd = total - 1;
  }
  if (windowStart > 2) items.push("...");
  for (let p = windowStart; p <= windowEnd; p++) items.push(p);
  if (windowEnd < total - 1) items.push("...");
  if (total > 1) items.push(total);
  return items;
}

// ponytail: self-check — fails if ellipsis window drifts from design crud-list
if (process.env.NODE_ENV !== "production") {
  const sample = buildPageItems(5, 20);
  if (
    sample[0] !== 1 ||
    sample[sample.length - 1] !== 20 ||
    !sample.includes("...")
  ) {
    throw new Error("buildPageItems self-check failed");
  }
}
