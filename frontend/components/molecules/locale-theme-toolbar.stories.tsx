"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { LocaleThemeToolbar } from "./locale-theme-toolbar";

const meta = {
  title: "Molecules/LocaleThemeToolbar",
  component: LocaleThemeToolbar,
} satisfies Meta<typeof LocaleThemeToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
