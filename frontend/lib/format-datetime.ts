const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type DisplayLocale = "th" | "en";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateParts(d: Date, locale: DisplayLocale, withTime: boolean): string {
  if (Number.isNaN(d.getTime())) return "—";
  const day = pad2(d.getDate());
  const month = locale === "th" ? TH_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
  const year = locale === "th" ? d.getFullYear() + 543 : d.getFullYear();
  const date = `${day} ${month} ${year}`;
  if (!withTime) return date;
  return `${date} ${pad2(d.getHours())}.${pad2(d.getMinutes())}`;
}

export function formatDateTime(iso: string | null | undefined, locale: DisplayLocale): string {
  if (!iso) return "—";
  return formatDateParts(new Date(iso), locale, true);
}

export function formatDate(iso: string | null | undefined, locale: DisplayLocale): string {
  if (!iso) return "—";
  return formatDateParts(new Date(iso), locale, false);
}

// ponytail: self-check — run with `bun frontend/lib/format-datetime.ts`
if (import.meta.main) {
  const d = new Date(2026, 8, 9, 12, 30);
  const th = formatDateParts(d, "th", true);
  const en = formatDateParts(d, "en", true);
  if (th !== "09 ก.ย. 2569 12.30" || en !== "09 Sep 2026 12.30") {
    throw new Error(`format-datetime self-check failed: th=${th} en=${en}`);
  }
}
