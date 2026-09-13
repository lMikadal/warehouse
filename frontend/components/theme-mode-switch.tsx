"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const modeValues = ["light", "dark", "system"] as const;

type ThemeMode = (typeof modeValues)[number];

const modeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function ThemeDocumentSync() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!resolvedTheme) return;
    document.documentElement.dataset.theme =
      resolvedTheme === "dark" ? "dark" : "light";
  }, [resolvedTheme]);

  useEffect(() => {
    const locale =
      routing.locales.find(
        (loc) =>
          loc !== routing.defaultLocale &&
          (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)),
      ) ?? routing.defaultLocale;
    document.documentElement.lang = locale;
  }, [pathname]);

  return null;
}

export function ThemeModeSwitch() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useTranslations("theme");

  if (!mounted) {
    return (
      <div
        className="bg-muted h-8 w-30 animate-pulse rounded-lg sm:w-54"
        aria-hidden
      />
    );
  }

  const active = (theme ?? "system") as ThemeMode;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-border inline-flex rounded-lg border p-0.5"
    >
      {modeValues.map((value) => {
        const isActive = active === value;
        const Icon = modeIcons[value];
        return (
          <Button
            key={value}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn("gap-1.5 px-2.5", isActive && "shadow-sm")}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
          >
            <Icon className="size-4 text-current" aria-hidden />
            <span className="hidden sm:inline">{t(value)}</span>
          </Button>
        );
      })}
    </div>
  );
}
