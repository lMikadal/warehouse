import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ id: string; locale: string }> };

/** Legacy path — pending approve now lives on `/purchase/[id]`. */
export default async function PurchaseApproveRoute({ params }: Props) {
  const { id, locale } = await params;
  redirect({ href: `/admin/order/purchase/${id}`, locale });
}
