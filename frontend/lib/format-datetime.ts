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
] as const;

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
] as const;

export type DisplayLocale = "th" | "en";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateParts(
  d: Date,
  locale: DisplayLocale,
  withTime: boolean
): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  const day = pad2(d.getDate());
  const month =
    locale === "th" ? TH_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
  const year = locale === "th" ? d.getFullYear() + 543 : d.getFullYear();
  let out = `${day} ${month} ${year}`;
  if (!withTime) return out;
  out += ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return out;
}

export function formatDateTime(
  iso: string | null | undefined,
  locale: DisplayLocale
): string {
  if (!iso) return "—";
  return formatDateParts(new Date(iso), locale, true);
}

export function formatDate(
  iso: string | null | undefined,
  locale: DisplayLocale
): string {
  if (!iso) return "—";
  return formatDateParts(new Date(iso), locale, false);
}
