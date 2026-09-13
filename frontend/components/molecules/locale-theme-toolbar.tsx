"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { ButtonIcon } from "@/components/ui/button-icon";
import { useLocalizedPathname } from "@/hooks/use-localized-pathname";
import { useRouter } from "@/i18n/navigation";
import { cn } from "cn";

const toolbarButtonClass =
  "size-10 border-foreground/10 bg-background/70 backdrop-blur-sm hover:border-primary [&_svg]:size-5";

type LocaleThemeToolbarProps = {
  className?: string;
};

export function LocaleThemeToolbar({ className }: LocaleThemeToolbarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = useLocalizedPathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const nextLocale = locale === "th" ? "en" : "th";
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex gap-1.5", className)}>
      <ButtonIcon
        type="button"
        variant="outline"
        size="md"
        className={toolbarButtonClass}
        aria-label={t("lang.toggle")}
        onClick={() => router.replace(pathname, { locale: nextLocale })}
      >
        <Languages className="text-current" />
      </ButtonIcon>
      <ButtonIcon
        type="button"
        variant="outline"
        size="md"
        className={toolbarButtonClass}
        aria-label={t("theme.toggle")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? (
          <Sun className="text-current" />
        ) : (
          <Moon className="text-current" />
        )}
      </ButtonIcon>
    </div>
  );
}
