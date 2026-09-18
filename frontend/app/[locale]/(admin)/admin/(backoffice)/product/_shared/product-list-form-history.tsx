"use client";

import { useTranslations } from "next-intl";

type Props = {
  itemIds: number[];
};

export function ProductListFormHistory(_props: Props) {
  const tForm = useTranslations("productListForm");

  return (
    <p className="text-muted-foreground py-12 text-center text-sm">
      {tForm("histPhasePending")}
    </p>
  );
}
