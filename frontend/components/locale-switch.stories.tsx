"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { LocaleSwitch } from "./locale-switch";

const meta = {
  title: "Molecules/LocaleSwitch",
  component: LocaleSwitch,
} satisfies Meta<typeof LocaleSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
