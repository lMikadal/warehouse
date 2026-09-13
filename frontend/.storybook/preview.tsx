import type { Decorator, Preview } from "@storybook/nextjs";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import { withIntl } from "./decorators/intl";
import { StorybookThemeBridge } from "./decorators/theme-bridge";

import "../app/globals.css";

const withThemeShell: Decorator = (Story, context) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    storageKey="warehouse-design-theme"
    disableTransitionOnChange
  >
    <StorybookThemeBridge globals={context.globals as Record<string, unknown>} />
    <TooltipProvider>
      <div className="bg-background text-foreground p-6 font-sans">
        <Story />
      </div>
    </TooltipProvider>
  </ThemeProvider>
);

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
  decorators: [withIntl, withThemeShell],
};

export default preview;
