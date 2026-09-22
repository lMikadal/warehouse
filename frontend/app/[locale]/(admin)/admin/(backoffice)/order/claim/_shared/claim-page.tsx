"use client";

import { useTranslations } from "next-intl";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";

import { ClaimList } from "./claim-list";

export function ClaimPage() {
  const t = useTranslations("page.orderClaim");

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <CrudPageHeader title={t("pageTitle")} description={t("pageSubtitle")} />
      <ClaimList />
    </div>
  );
}
