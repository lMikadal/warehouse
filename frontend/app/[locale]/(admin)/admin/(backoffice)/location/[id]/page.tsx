import { getLocale, getTranslations } from "next-intl/server";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { routing } from "@/i18n/routing";
import { getAccessToken } from "@/lib/auth-server";
import { fetchLocationById } from "@/lib/location-api-server";

type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function LocationDetailPage({ params }: Props) {
  const { id: idParam } = await params;
  const locale = await getLocale();
  const tPage = await getTranslations("page.locationLocation");
  const id = Number(idParam);
  let name = idParam;
  const token = await getAccessToken();
  if (token && Number.isFinite(id) && id > 0) {
    const row = await fetchLocationById(token, locale, id);
    if (row) name = row.name;
  }

  return (
    <>
      <CrudPageHeader title={name} description={tPage("viewDescription")} />
      <p className="text-muted-foreground">{tPage("comingSoon")}</p>
    </>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
