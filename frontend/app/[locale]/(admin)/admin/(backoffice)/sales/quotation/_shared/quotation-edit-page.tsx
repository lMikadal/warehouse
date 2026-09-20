"use client";

import { useRouter } from "@/i18n/navigation";

import { QuotationFormPage } from "./quotation-form-page";

type Props = { id: number };

export function QuotationEditPage({ id }: Props) {
  const router = useRouter();
  return (
    <QuotationFormPage
      editId={id}
      onSubmitted={async () => {
        router.replace(`/admin/sales/quotation/${id}`);
      }}
    />
  );
}
