"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useCallback, useState } from "react";
import { toast } from "sonner";

import type { SystemGeoListConfig } from "./system-geo-config";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Field, FieldLabel } from "@/components/ui/field";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { SystemGeoRow } from "@/lib/system-geo-api";
import {
  geoResourceForParentKey,
  loadGeoComboboxOptions,
  resolveGeoComboboxLabel,
} from "@/lib/system-geo-combobox";

export type SystemGeoEditPayload = {
  sku: string;
  postcode: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  parentId: string;
};

export type SystemGeoSheetState =
  | { mode: "edit"; row: SystemGeoRow; names: { th: string; en: string } }
  | { mode: "create" };

export type SystemGeoEditSheetProps = {
  config: SystemGeoListConfig;
  state: SystemGeoSheetState | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: number | null,
    payload: SystemGeoEditPayload
  ) => void | Promise<void>;
};

type RequiredKey = "nameTh" | "nameEn" | "parentId";

function emptyInvalid(config: SystemGeoListConfig): Record<RequiredKey, boolean> {
  const base = { nameTh: false, nameEn: false, parentId: false };
  if (!config.createParentKey) {
    base.parentId = false;
  }
  return base;
}

function SystemGeoEditForm({
  config,
  mode,
  initial,
  editId,
  onSave,
  onClose,
}: {
  config: SystemGeoListConfig;
  mode: "edit" | "create";
  initial: SystemGeoEditPayload;
  editId: number | null;
  onSave: SystemGeoEditSheetProps["onSave"];
  onClose: () => void;
}) {
  const locale = useLocale() as DisplayLocale;
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const t = useTranslations();

  const [sku, setSku] = useState(initial.sku);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [parentId, setParentId] = useState(initial.parentId);
  const [fieldInvalid, setFieldInvalid] = useState(() => emptyInvalid(config));

  const needsParent = Boolean(config.createParentKey);
  const parentLabelKey = config.parentSelectLabel ?? "country";
  const parentResource = config.createParentKey
    ? geoResourceForParentKey(config.createParentKey)
    : null;

  const loadParentOptions = useCallback(
    (ctx: { search: string; signal: AbortSignal }) => {
      if (!parentResource) return Promise.resolve([]);
      return loadGeoComboboxOptions(parentResource, locale, {
        search: ctx.search,
        signal: ctx.signal,
        isActive: true,
      });
    },
    [locale, parentResource]
  );

  const resolveParentLabel = useCallback(
    (value: string) => {
      if (!parentResource) return Promise.resolve(null);
      return resolveGeoComboboxLabel(parentResource, locale, value);
    },
    [locale, parentResource]
  );

  const clearInvalid = (key: RequiredKey) => {
    setFieldInvalid((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const parentLabel = tCol(parentLabelKey);
  const nameThLabel = t("form.field.nameTh");
  const nameEnLabel = t("form.field.nameEn");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextInvalid = emptyInvalid(config);
    const parentEmpty = needsParent && !parentId.trim();
    const nameThEmpty = !nameTh.trim();
    const nameEnEmpty = !nameEn.trim();
    if (parentEmpty) nextInvalid.parentId = true;
    if (nameThEmpty) nextInvalid.nameTh = true;
    if (nameEnEmpty) nextInvalid.nameEn = true;
    setFieldInvalid(nextInvalid);
    if (parentEmpty || nameThEmpty || nameEnEmpty) {
      if (parentEmpty) {
        toast.error(tForm("placeholder.select", { label: parentLabel }));
        document.getElementById("geo-edit-parent")?.focus();
      } else if (nameThEmpty) {
        toast.error(tForm("placeholder.input", { label: nameThLabel }));
        document.getElementById("geo-edit-name-th")?.focus();
      } else {
        toast.error(tForm("placeholder.input", { label: nameEnLabel }));
        document.getElementById("geo-edit-name-en")?.focus();
      }
      return;
    }

    await onSave(editId, {
      sku: sku.trim(),
      postcode: postcode.trim(),
      nameTh: nameTh.trim(),
      nameEn: nameEn.trim(),
      isActive,
      parentId: parentId.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <CrudFormSheetBody>
        {needsParent && parentResource ? (
          <Field
            data-invalid={fieldInvalid.parentId ? true : undefined}
            className="gap-1.5"
          >
            <FieldLabel htmlFor="geo-edit-parent">
              {tCol(parentLabelKey)}
              <span className="text-[#dc2626]" aria-hidden>
                {" "}
                *
              </span>
            </FieldLabel>
            <RemoteComboboxField
              id="geo-edit-parent"
              label={tCol(parentLabelKey)}
              value={parentId}
              inputClassName="w-full"
              invalid={fieldInvalid.parentId}
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", {
                label: tCol(parentLabelKey),
              })}
              onLoadOptions={loadParentOptions}
              resolveSelectedLabel={resolveParentLabel}
              onValueChange={(v) => {
                setParentId(v);
                clearInvalid("parentId");
              }}
            />
          </Field>
        ) : null}

        <FormField
          id="geo-edit-sku"
          labelKey="col.sku"
          value={sku}
          onChange={setSku}
        />

        {config.showPostcode ? (
          <FormField
            id="geo-edit-postcode"
            labelKey="col.postcode"
            value={postcode}
            onChange={setPostcode}
          />
        ) : null}

        <FormField
          id="geo-edit-name-th"
          labelKey="form.field.nameTh"
          required
          value={nameTh}
          onChange={setNameTh}
          invalid={fieldInvalid.nameTh}
          onClearInvalid={() => clearInvalid("nameTh")}
        />

        <FormField
          id="geo-edit-name-en"
          labelKey="form.field.nameEn"
          required
          value={nameEn}
          onChange={setNameEn}
          invalid={fieldInvalid.nameEn}
          onClearInvalid={() => clearInvalid("nameEn")}
        />

        <Field className="gap-1.5">
          <FieldLabel htmlFor="geo-edit-active">{tCol("status")}</FieldLabel>
          <StatusSwitchField
            id="geo-edit-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </Field>
      </CrudFormSheetBody>

      <CrudFormSheetFooter
        dismissLabel={mode === "create" ? tCrud("btn.back") : tCrud("btn.cancel")}
      />
    </form>
  );
}

export function SystemGeoEditSheet({
  config,
  state,
  onOpenChange,
  onSave,
}: SystemGeoEditSheetProps) {
  const tPage = useTranslations(`page.${config.pageKey}`);
  const open = state != null;
  const mode = state?.mode ?? "create";
  const editId = state?.mode === "edit" ? state.row.id : null;

  const initial: SystemGeoEditPayload =
    state?.mode === "edit"
      ? {
          sku: state.row.sku === "—" ? "" : state.row.sku,
          postcode: state.row.postcode === "—" ? "" : state.row.postcode,
          nameTh: state.names.th,
          nameEn: state.names.en,
          isActive: state.row.is_active,
          parentId: String(
            state.row.system_country_id ??
              state.row.system_province_id ??
              state.row.system_district_id ??
              ""
          ),
        }
      : {
          sku: "",
          postcode: "",
          nameTh: "",
          nameEn: "",
          isActive: true,
          parentId: "",
        };

  const title = mode === "edit" ? tPage("editTitle") : tPage("add");

  return (
    <CrudFormSheet open={open} onOpenChange={onOpenChange}>
      <CrudFormSheetHeader title={title} />
      {open ? (
        <SystemGeoEditForm
          key={editId ?? "create"}
          config={config}
          mode={mode}
          initial={initial}
          editId={editId}
          onSave={async (id, payload) => {
            await onSave(id, payload);
          }}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </CrudFormSheet>
  );
}
