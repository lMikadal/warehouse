import type { Preview } from "@storybook/nextjs";

import { ThemeProvider } from "@/components/theme-provider";

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
  decorators: [
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
