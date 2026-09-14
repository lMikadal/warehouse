"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import type { SystemGeoListConfig } from "./system-geo-config";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SystemGeoRow } from "@/lib/system-geo-api";

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

export type ParentOption = { value: string; label: string };

export type SystemGeoEditSheetProps = {
  config: SystemGeoListConfig;
  state: SystemGeoSheetState | null;
  parentOptions: ParentOption[];
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
  parentOptions,
  onSave,
  onClose,
}: {
  config: SystemGeoListConfig;
  mode: "edit" | "create";
  initial: SystemGeoEditPayload;
  editId: number | null;
  parentOptions: ParentOption[];
  onSave: SystemGeoEditSheetProps["onSave"];
  onClose: () => void;
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");

  const [sku, setSku] = useState(initial.sku);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [parentId, setParentId] = useState(initial.parentId);
  const [fieldInvalid, setFieldInvalid] = useState(() => emptyInvalid(config));

  const needsParent = Boolean(config.createParentKey);
  const parentLabelKey = config.parentSelectLabel ?? "country";

  const clearInvalid = (key: RequiredKey) => {
    setFieldInvalid((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextInvalid = emptyInvalid(config);
    if (!nameTh.trim()) nextInvalid.nameTh = true;
    if (!nameEn.trim()) nextInvalid.nameEn = true;
    if (needsParent && !parentId.trim()) nextInvalid.parentId = true;
    setFieldInvalid(nextInvalid);
    if (nextInvalid.nameTh || nextInvalid.nameEn || nextInvalid.parentId) return;

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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <CrudFormSheetBody>
        {needsParent ? (
          <div className="form-field space-y-2">
            <label htmlFor="geo-edit-parent">
              <span>{tCol(parentLabelKey)}</span>
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Select
              value={parentId || undefined}
              onValueChange={(v) => {
                setParentId(v);
                clearInvalid("parentId");
              }}
            >
              <SelectTrigger id="geo-edit-parent" aria-invalid={fieldInvalid.parentId}>
                <SelectValue
                  placeholder={tForm("placeholder.select", {
                    label: tCol(parentLabelKey),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-h-5">
              {fieldInvalid.parentId ? (
                <p className="text-sm text-destructive" role="alert">
                  {tCrud("error.required")}
                </p>
              ) : null}
            </div>
          </div>
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
          invalid={fieldInvalid.nameTh}
          onChange={setNameTh}
          onClearInvalid={() => clearInvalid("nameTh")}
        />

        <FormField
          id="geo-edit-name-en"
          labelKey="form.field.nameEn"
          required
          value={nameEn}
          invalid={fieldInvalid.nameEn}
          onChange={setNameEn}
          onClearInvalid={() => clearInvalid("nameEn")}
        />

        <StatusSwitchField checked={isActive} onCheckedChange={setIsActive} />
      </CrudFormSheetBody>
      <CrudFormSheetFooter
        dismissLabel={
          editId != null ? tCrud("btn.cancel") : tCrud("btn.back")
        }
      />
    </form>
  );
}

export function SystemGeoEditSheet({
  config,
  state,
  parentOptions,
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
          parentId: parentOptions[0]?.value ?? "",
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
          parentOptions={parentOptions}
          onSave={async (id, payload) => {
            await onSave(id, payload);
          }}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </CrudFormSheet>
  );
}
