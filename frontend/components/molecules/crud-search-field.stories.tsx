"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import { CrudSearchField } from "./crud-search-field";
import { StatusFilterGroup } from "./status-filter-group";

const meta = {
  title: "Molecules/CrudSearchField",
  component: CrudSearchField,
} satisfies Meta<typeof CrudSearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [query, setQuery] = useState("");
    return <CrudSearchField value={query} onChange={setQuery} />;
  },
};

export const Disabled: Story = {
  args: {
    value: "",
    onChange: () => {},
    disabled: true,
  },
  render: function Render() {
    const [query, setQuery] = useState("");
    return (
      <CrudSearchField value={query} onChange={setQuery} disabled />
    );
  },
};

export const ToolbarRowPreview: Story = {
  name: "Toolbar row (with status filter)",
  args: {
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<"" | "active" | "inactive">("");
    return (
      <div className="flex flex-wrap items-center gap-3">
        <CrudSearchField value={query} onChange={setQuery} />
        <StatusFilterGroup value={status} onChange={setStatus} />
      </div>
    );
  },
};
