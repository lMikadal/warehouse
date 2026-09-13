import type { Decorator } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "@/messages/en.json";
import thMessages from "@/messages/th.json";

export const withIntl: Decorator = (Story, context) => {
  const locale =
    context.globals.locale === "en" ? "en" : ("th" as "th" | "en");
  const messages = locale === "en" ? enMessages : thMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Story />
    </NextIntlClientProvider>
  );
};
