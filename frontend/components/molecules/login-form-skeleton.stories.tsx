import type { Meta, StoryObj } from "@storybook/nextjs";

import { LoginFormSkeleton } from "./login-form-skeleton";

const meta = {
  title: "Molecules/LoginFormSkeleton",
  component: LoginFormSkeleton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof LoginFormSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
