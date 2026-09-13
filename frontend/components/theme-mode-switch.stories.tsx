"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";

import { ThemeModeSwitch } from "./theme-mode-switch";

const meta = {
  title: "Molecules/ThemeModeSwitch",
  component: ThemeModeSwitch,
} satisfies Meta<typeof ThemeModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
