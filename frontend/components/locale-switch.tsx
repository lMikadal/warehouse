"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useLocalizedPathname } from "@/hooks/use-localized-pathname";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = useLocalizedPathname();
  const t = useTranslations("lang");

  return (
    <div
      role="group"
      aria-label={t("toggle")}
      className="border-border inline-flex rounded-lg border p-0.5"
    >
      {routing.locales.map((loc) => {
        const isActive = locale === loc;
        return (
          <Button
            key={loc}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn("min-w-10 px-2.5", isActive && "shadow-sm")}
            aria-pressed={isActive}
            onClick={() => router.replace(pathname, { locale: loc })}
          >
            {t(loc)}
          </Button>
        );
      })}
    </div>
  );
}
