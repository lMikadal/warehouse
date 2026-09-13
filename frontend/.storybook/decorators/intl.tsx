import type { Decorator } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";

import { loadMessages, type AppLocale } from "@/messages/load-messages";

export const withIntl: Decorator = (Story, context) => {
  const locale: AppLocale =
    context.globals.locale === "en" ? "en" : "th";
  const messages = loadMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Story />
    </NextIntlClientProvider>
  );
};
