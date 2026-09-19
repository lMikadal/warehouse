"use client";

import type { Meta, StoryObj } from "@storybook/nextjs";
import { useCallback, useMemo, useState } from "react";

import type { RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";
import {
  emptyWebsiteGeo,
  type WebsiteGeoFormValue,
  type WebsiteGeoResource,
} from "@/lib/website-geo-form";

import {
  WebsiteGeoFields,
  type WebsiteGeoFieldsLoaders,
} from "./website-geo-fields";

const MOCK: Record<WebsiteGeoResource, RemoteComboboxOption[]> = {
  provinces: [
    { value: "1", label: "Bangkok" },
    { value: "2", label: "Chiang Mai" },
  ],
  districts: [
    { value: "10", label: "Pathum Wan" },
    { value: "11", label: "Chatuchak" },
  ],
  "sub-districts": [
    { value: "100", label: "Lumphini" },
    { value: "101", label: "Silom" },
  ],
};

function mockLoaders(): WebsiteGeoFieldsLoaders {
  return {
    loadOptions: async (resource, ctx) => {
      const q = ctx.search.trim().toLowerCase();
      let rows = MOCK[resource];
      if (resource === "districts" && ctx.systemProvinceId !== 1) {
        rows = [];
      }
      if (resource === "sub-districts" && ctx.systemDistrictId !== 10) {
        rows = [];
      }
      if (!q) return rows;
      return rows.filter((o) => o.label.toLowerCase().includes(q));
    },
    resolveLabel: async (resource, value) =>
      MOCK[resource].find((o) => o.value === value)?.label ?? null,
  };
}

const meta = {
  title: "Molecules/WebsiteGeoFields",
  component: WebsiteGeoFields,
  parameters: { layout: "padded" },
} satisfies Meta<typeof WebsiteGeoFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render() {
    const [value, setValue] = useState<WebsiteGeoFormValue>(() => ({
      ...emptyWebsiteGeo(),
      website_province_id: "1",
      website_province_name: "Bangkok",
    }));
    const loaders = useMemo(() => mockLoaders(), []);
    const onChange = useCallback((patch: Partial<WebsiteGeoFormValue>) => {
      setValue((prev) => ({ ...prev, ...patch }));
    }, []);
    return (
      <div className="max-w-4xl">
        <WebsiteGeoFields
          prefix="demo"
          value={value}
          onChange={onChange}
          loaders={loaders}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: function Render() {
    const loaders = mockLoaders();
    return (
      <div className="max-w-4xl">
        <WebsiteGeoFields
          prefix="demo-disabled"
          value={{
            ...emptyWebsiteGeo(),
            website_province_id: "1",
            website_province_name: "Bangkok",
            website_district_id: "10",
            website_district_name: "Pathum Wan",
          }}
          onChange={() => {}}
          disabled
          loaders={loaders}
        />
      </div>
    );
  },
};
