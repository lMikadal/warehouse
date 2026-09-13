"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useTranslations } from "next-intl";

import { EntityNameCell } from "./entity-name-cell";

const meta = {
  title: "Molecules/EntityNameCell",
  component: EntityNameCell,
} satisfies Meta<typeof EntityNameCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithEdit: Story = {
  args: {
    name: "ATW",
    onEdit: () => {},
  },
  render: function Render() {
    const t = useTranslations("story");
    return (
      <EntityNameCell
        name={t("sampleName")}
        onEdit={() => undefined}
      />
    );
  },
};

export const ReadOnly: Story = {
  args: {
    name: "ATW",
  },
  render: function Render() {
    const t = useTranslations("story");
    return <EntityNameCell name={t("sampleName")} />;
  },
};
