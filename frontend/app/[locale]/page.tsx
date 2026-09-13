import { Package } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeModeSwitch } from "@/components/theme-mode-switch";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("app");
  const home = await getTranslations("home");
  const demo = await getTranslations("demo");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 font-medium">
          <Package className="size-5 text-primary" aria-hidden />
          {t("frontendTitle")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitch />
          <ThemeModeSwitch />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {home("heading")}
          </h1>
          <p className="text-muted-foreground text-sm">{home("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>{demo("primary")}</Button>
          <Button variant="secondary">{demo("secondary")}</Button>
          <Button variant="outline">{demo("outline")}</Button>
          <Button variant="destructive">{demo("destructive")}</Button>
        </div>
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
