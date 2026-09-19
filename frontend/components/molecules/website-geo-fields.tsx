"use client";

import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Field, FieldLabel } from "@/components/ui/field";
import type { RemoteComboboxLoadContext, RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";
import { comboboxPinned } from "@/lib/combobox-pinned";
import type {
  WebsiteGeoFormValue,
  WebsiteGeoResource,
} from "@/lib/website-geo-form";

export type WebsiteGeoFieldsLoaders = {
  loadOptions: (
    resource: WebsiteGeoResource,
    ctx: RemoteComboboxLoadContext & {
      systemProvinceId?: number;
      systemDistrictId?: number;
    }
  ) => Promise<RemoteComboboxOption[]>;
  resolveLabel: (
    resource: WebsiteGeoResource,
    value: string
  ) => Promise<string | null>;
};

function LabeledRemoteCombobox({
  fieldId,
  labelText,
  ...rest
}: {
  fieldId: string;
  labelText: string;
} & Omit<ComponentProps<typeof RemoteComboboxField>, "id" | "label">) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={fieldId}>{labelText}</FieldLabel>
      <RemoteComboboxField id={fieldId} label={labelText} {...rest} />
    </Field>
  );
}

export function WebsiteGeoFields({
  prefix,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  loaders,
}: {
  prefix: string;
  value: WebsiteGeoFormValue;
  onChange: (patch: Partial<WebsiteGeoFormValue>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  loaders: WebsiteGeoFieldsLoaders;
}) {
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
      <LabeledRemoteCombobox
        fieldId={`${prefix}-province`}
        labelText={tCol("province")}
        value={value.website_province_id}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", { label: tCol("province") })}
        disabled={disabled}
        pinnedItems={comboboxPinned(
          value.website_province_id,
          value.website_province_name
        )}
        onValueChange={(v) =>
          onChange({
            website_province_id: v,
            website_province_name: v ? value.website_province_name : "",
            website_district_id: "",
            website_sub_district_id: "",
            website_district_name: "",
            website_sub_district_name: "",
          })
        }
        autoComplete="off"
        onLoadOptions={({ search, signal }) =>
          loaders.loadOptions("provinces", { search, signal })
        }
        resolveSelectedLabel={
          readOnly
            ? undefined
            : (id) => loaders.resolveLabel("provinces", id)
        }
      />
      <LabeledRemoteCombobox
        fieldId={`${prefix}-district`}
        labelText={tCol("district")}
        value={value.website_district_id}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", { label: tCol("district") })}
        disabled={disabled || !value.website_province_id}
        pinnedItems={comboboxPinned(
          value.website_district_id,
          value.website_district_name
        )}
        catalogKey={value.website_province_id}
        autoComplete="off"
        onValueChange={(v) =>
          onChange({
            website_district_id: v,
            website_sub_district_id: "",
            website_district_name: v ? value.website_district_name : "",
            website_sub_district_name: "",
          })
        }
        onLoadOptions={({ search, signal }) =>
          loaders.loadOptions("districts", {
            search,
            signal,
            systemProvinceId: Number(value.website_province_id),
          })
        }
        resolveSelectedLabel={
          readOnly
            ? undefined
            : (id) => loaders.resolveLabel("districts", id)
        }
      />
      <LabeledRemoteCombobox
        fieldId={`${prefix}-sub-district`}
        labelText={tCol("subDistrict")}
        value={value.website_sub_district_id}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", {
          label: tCol("subDistrict"),
        })}
        disabled={disabled || !value.website_district_id}
        pinnedItems={comboboxPinned(
          value.website_sub_district_id,
          value.website_sub_district_name
        )}
        catalogKey={`${value.website_province_id}:${value.website_district_id}`}
        autoComplete="off"
        onValueChange={(v) =>
          onChange({
            website_sub_district_id: v,
            website_sub_district_name: v ? value.website_sub_district_name : "",
          })
        }
        onLoadOptions={({ search, signal }) =>
          loaders.loadOptions("sub-districts", {
            search,
            signal,
            systemDistrictId: Number(value.website_district_id),
          })
        }
        resolveSelectedLabel={
          readOnly
            ? undefined
            : (id) => loaders.resolveLabel("sub-districts", id)
        }
      />
      <FormField
        id={`${prefix}-postcode`}
        labelKey="col.postcode"
        value={value.postcode}
        onChange={(v) => onChange({ postcode: v })}
        readOnly={disabled}
      />
    </div>
  );
}
