import { routing } from "@/i18n/routing";

import { OrderComparePage } from "../_shared/order-compare-page";

export default function OrderCompareRoutePage() {
  return <OrderComparePage />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
