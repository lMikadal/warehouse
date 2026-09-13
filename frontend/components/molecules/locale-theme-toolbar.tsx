"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "cn";

type LocaleThemeToolbarProps = {
  className?: string;
};

export function LocaleThemeToolbar({ className }: LocaleThemeToolbarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const nextLocale = locale === "th" ? "en" : "th";
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex gap-1.5", className)}>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-(--login-radius) border border-foreground/10 bg-background/70 backdrop-blur-sm hover:border-primary"
        aria-label={t("lang.toggle")}
        onClick={() => router.replace(pathname, { locale: nextLocale })}
      >
        <Languages className="size-5 text-current" />
      </button>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-(--login-radius) border border-foreground/10 bg-background/70 backdrop-blur-sm hover:border-primary"
        aria-label={t("theme.toggle")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? (
          <Sun className="size-5 text-current" />
        ) : (
          <Moon className="size-5 text-current" />
        )}
      </button>
    </div>
  );
}
