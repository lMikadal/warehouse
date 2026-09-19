"use client";

import { useTranslations } from "next-intl";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";

export function MemberUserFormOrdersTab() {
  const t = useTranslations("memberUser");

  return (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>{t("ordersListTitle")}</FormCardTitle>
      </FormCardHeader>
      <FormCardContent>
        <p className="text-sm text-muted-foreground">{t("ordersEmpty")}</p>
      </FormCardContent>
    </FormCard>
  );
}
