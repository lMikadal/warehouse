import type { Preview } from "@storybook/nextjs";

import { ThemeProvider } from "@/components/theme-provider";

import { withIntl } from "./decorators/intl";

import "../app/globals.css";

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    locale: {
      description: "Story locale (next-intl)",
      toolbar: {
        icon: "globe",
        items: [
          { value: "th", title: "ไทย" },
          { value: "en", title: "EN" },
        ],
      },
    },
  },
  initialGlobals: {
    locale: "th",
  },
  decorators: [
    withIntl,
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="warehouse-design-theme"
        disableTransitionOnChange
      >
        <div className="bg-background text-foreground p-6 font-sans">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
