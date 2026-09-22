"use client";

import { useTranslations } from "next-intl";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";

import { ReceiveList } from "./receive-list";

export function ReceivePage() {
  const t = useTranslations("page.orderReceive");

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <CrudPageHeader title={t("title")} description={t("subtitle")} />
      <ReceiveList />
    </div>
  );
}
