"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

function ToastDemoPanel() {
  const t = useTranslations("toast");

  return (
    <div className="flex max-w-md flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => toast.success(t("demoSuccess"))}
      >
        Success
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => toast.error(t("demoError"))}
      >
        Error
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => toast.warning(t("demoWarning"))}
      >
        Warning
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => toast.info(t("demoInfo"))}
      >
        Info
      </Button>
    </div>
  );
}

const meta = {
  title: "UI/Toaster",
  component: Toaster,
  parameters: {
    docs: {
      description: {
        component:
          "Transient feedback via Sonner. In app code: `import { toast } from \"sonner\"` then `toast.success(t('key'))` (same for error, warning, info). Mount `<Toaster />` once in the locale layout.",
      },
    },
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => <ToastDemoPanel />,
};
