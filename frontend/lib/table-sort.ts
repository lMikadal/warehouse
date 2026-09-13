/** Column header sort — none → asc → desc → none (design crud-list). */
export type TableSortDirection = "asc" | "desc";

export function cycleTableSort(
  activeKey: string | null,
  activeDir: TableSortDirection | null,
  columnKey: string
): { sortKey: string | null; sortDir: TableSortDirection | null } {
  if (activeKey !== columnKey) {
    return { sortKey: columnKey, sortDir: "asc" };
  }
  if (activeDir === "asc") {
    return { sortKey: columnKey, sortDir: "desc" };
  }
  return { sortKey: null, sortDir: null };
}

export function tableSortAriaSort(
  activeKey: string | null,
  activeDir: TableSortDirection | null,
  columnKey: string
): "none" | "ascending" | "descending" {
  if (activeKey !== columnKey || !activeDir) return "none";
  return activeDir === "desc" ? "descending" : "ascending";
}

// ponytail: self-check — fails if header sort cycle drifts from design crud-list
if (process.env.NODE_ENV !== "production") {
  let s = cycleTableSort(null, null, "id");
  if (s.sortKey !== "id" || s.sortDir !== "asc") {
    throw new Error("cycleTableSort self-check failed at asc");
  }
  s = cycleTableSort("id", "asc", "id");
  if (s.sortDir !== "desc") {
    throw new Error("cycleTableSort self-check failed at desc");
  }
  s = cycleTableSort("id", "desc", "id");
  if (s.sortKey !== null || s.sortDir !== null) {
    throw new Error("cycleTableSort self-check failed at clear");
  }
}
