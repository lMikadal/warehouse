import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as readRootLocale } from "next/root-params";
import { notFound } from "next/navigation";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await readRootLocale();
    if (paramValue && hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
