"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";

import {
  ImageUploadField,
  type ImageUploadFieldProps,
} from "./image-upload-field";
import type { ImageUploadItem } from "@/lib/system-file-api";

const mockUpload = (): ImageUploadFieldProps["uploadFile"] => async (file) => {
  await new Promise((r) => setTimeout(r, 400));
  return {
    kind: "remote",
    id: Math.floor(Math.random() * 1_000_000),
    url: URL.createObjectURL(file),
  };
};

const meta = {
  title: "Molecules/ImageUploadField",
  component: ImageUploadField,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ImageUploadField>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockRemoteItem = (): ImageUploadItem => ({
  kind: "remote",
  id: 1,
  url: "https://placehold.co/112x112/png?text=Logo",
});

export const SingleLogo: Story = {
  args: {
    id: "logo",
    labelKey: "col.logo",
    purpose: "setting_bank_logo",
    value: [],
    onChange: () => {},
    maxFiles: 1,
  },
  render: function Render() {
    const [value, setValue] = useState<ImageUploadItem[]>(() => [mockRemoteItem()]);
    return (
      <div className="w-80">
        <ImageUploadField
          id="logo"
          labelKey="col.logo"
          purpose="setting_bank_logo"
          value={value}
          onChange={setValue}
          maxFiles={1}
          uploadTiming="immediate"
          uploadFile={mockUpload()}
        />
      </div>
    );
  },
};

export const SingleLogoFullWidth: Story = {
  args: {
    id: "logo-fw",
    labelKey: "col.logo",
    purpose: "setting_bank_logo",
    value: [],
    onChange: () => {},
    maxFiles: 1,
  },
  render: function Render() {
    const [value, setValue] = useState<ImageUploadItem[]>(() => [mockRemoteItem()]);
    return (
      <div className="w-80">
        <ImageUploadField
          id="logo-fw"
          labelKey="col.logo"
          purpose="setting_bank_logo"
          value={value}
          onChange={setValue}
          maxFiles={1}
          showLabel={false}
          fullWidth
          uploadTiming="immediate"
          uploadFile={mockUpload()}
        />
      </div>
    );
  },
};

export const Gallery: Story = {
  args: {
    id: "gallery",
    labelKey: "col.logo",
    purpose: "product_item_image",
    value: [],
    onChange: () => {},
    maxFiles: 8,
  },
  render: function Render() {
    const [value, setValue] = useState<ImageUploadItem[]>([]);
    return (
      <div className="max-w-lg">
        <ImageUploadField
          id="gallery"
          labelKey="col.logo"
          purpose="product_item_image"
          value={value}
          onChange={setValue}
          maxFiles={8}
          uploadTiming="immediate"
          uploadFile={mockUpload()}
        />
      </div>
    );
  },
};
