import { Warehouse } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { LocaleThemeToolbar } from "@/components/molecules/locale-theme-toolbar";

type Props = {
  children: ReactNode;
};

export default async function AdminAuthLayout({ children }: Props) {
  const tApp = await getTranslations("app");
  const tPageLogin = await getTranslations("page.login");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_80%_55%_at_15%_-5%,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent_55%),var(--color-background)] dark:bg-[radial-gradient(ellipse_80%_55%_at_15%_-5%,color-mix(in_srgb,var(--color-primary)_14%,transparent),transparent_55%),var(--color-background)]">
      <header className="fixed top-0 right-0 z-20 p-3 sm:p-4">
        <LocaleThemeToolbar />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pt-18 pb-6 lg:flex-row lg:items-stretch lg:justify-stretch lg:p-0">
        <aside className="text-primary-foreground relative hidden overflow-hidden lg:flex lg:w-[42%] lg:flex-col lg:items-center lg:justify-center lg:p-10 lg:text-center">
          <div
            className="absolute inset-0 bg-linear-to-br from-primary from-0% via-primary via-55% to-[color-mix(in_srgb,var(--color-primary)_72%,black)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-size-[2rem_2rem]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-[-20%] bottom-[-30%] size-96 rounded-full bg-white/8"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col items-center">
            <Warehouse className="mb-5 size-14" strokeWidth={1.5} aria-hidden />
            <span className="text-3xl font-bold tracking-tight">
              {tApp("name")}
            </span>
            <p className="mt-3.5 max-w-72 text-base leading-normal opacity-[0.88]">
              {tPageLogin("desc")}
            </p>
          </div>
        </aside>

        <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center lg:px-10 lg:py-12 xl:px-20">
          {children}
        </div>
      </div>
    </div>
  );
}
