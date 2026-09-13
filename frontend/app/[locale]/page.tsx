import { getTranslations } from "next-intl/server";

import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeModeSwitch } from "@/components/theme-mode-switch";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default async function HomePage() {
  const t = await getTranslations("app");
  const home = await getTranslations("home");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 font-medium">
          {t("frontendTitle")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitch />
          <ThemeModeSwitch />
        </div>
      </header>
      <main className="flex w-full max-w-lg flex-1 flex-col gap-6 px-6">
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/login">{home("adminLogin")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
