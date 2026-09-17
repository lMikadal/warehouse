"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";

import { loadMessages } from "@/messages/load-messages";

import {
  CommaTagsField,
  parseCommaTags,
  serializeCommaTags,
} from "./comma-tags-field";

const messages = loadMessages("en");

function Intl({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

const meta = {
  title: "Molecules/CommaTagsField",
  component: CommaTagsField,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <Intl>
        <Story />
      </Intl>
    ),
  ],
} satisfies Meta<typeof CommaTagsField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    placeholder: "Please enter tags",
    value: "",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("");
    return (
      <div className="w-80 space-y-2">
        <CommaTagsField
          id="tags-empty"
          placeholder="Please enter tags"
          value={value}
          onChange={setValue}
          aria-label="Tags"
        />
        <p className="text-xs text-muted-foreground">Stored: {value || "—"}</p>
      </div>
    );
  },
};

export const Prefilled: Story = {
  args: {
    placeholder: "Please enter tags",
    value: "OEM,ทดสอบ",
    onChange: () => {},
  },
  render: function Render() {
    const [value, setValue] = useState("OEM,ทดสอบ");
    return (
      <div className="w-80 space-y-2">
        <CommaTagsField
          id="tags-prefilled"
          placeholder="Please enter tags"
          value={value}
          onChange={setValue}
          aria-label="Tags"
        />
        <p className="text-xs text-muted-foreground">Stored: {value}</p>
      </div>
    );
  },
};

export const ParseSerializeSelfCheck: Story = {
  args: {
    placeholder: "",
    value: "",
    onChange: () => {},
  },
  render: () => {
    const raw = " a, b ,a, ,c ";
    const tags = parseCommaTags(raw);
    const ok =
      tags.join("|") === "a|b|c" &&
      serializeCommaTags(tags) === "a,b,c" &&
      parseCommaTags("").length === 0;
    return (
      <p className="text-sm" data-ok={ok ? "true" : "false"}>
        parse/serialize self-check: {ok ? "ok" : "failed"}
      </p>
    );
  },
};
