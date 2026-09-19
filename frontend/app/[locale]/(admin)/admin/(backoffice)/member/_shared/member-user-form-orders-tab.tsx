"use client";

import { useTranslations } from "next-intl";

export function MemberUserFormOrdersTab() {
  const t = useTranslations("memberUser");

  return (
    <p className="text-muted-foreground py-12 text-center text-sm">
      {t("ordersPhasePending")}
    </p>
  );
}
