"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

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
import { Field, FieldLabel } from "@/components/ui/field";
import type { SettingVatItem } from "@/lib/setting-api";

export type SettingVatEditPayload = {
  vatType: "exclude" | "include";
  rate: string;
  isActive: boolean;
};

type Props = {
  row: SettingVatItem;
  open: boolean;
  canSave: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: SettingVatEditPayload) => void | Promise<void>;
};

export function SettingVatEditSheet({
  row,
  open,
  canSave,
  onOpenChange,
  onSave,
}: Props) {
  return (
    <SettingVatEditForm
      key={row.id}
      row={row}
      open={open}
      canSave={canSave}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  );
}

function SettingVatEditForm({
  row,
  open,
  canSave,
  onOpenChange,
  onSave,
}: Props) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const tPage = useTranslations("page");
  const t = useTranslations();

  const [vatType, setVatType] = useState<"exclude" | "include">(row.vat_type);
  const [rate, setRate] = useState(String(row.rate));
  const [isActive, setIsActive] = useState(row.is_active);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!rate.trim()) next.rate = true;
    setInvalid(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave({ vatType, rate, isActive });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudFormSheet open={open} onOpenChange={onOpenChange}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={submit}
        noValidate
      >
        <CrudFormSheetHeader title={tPage("settingVat.title")} />
        <CrudFormSheetBody className="space-y-4">
          <Field className="gap-1.5">
            <FieldLabel>{tCol("vatType")}</FieldLabel>
            <Select
              value={vatType}
              onValueChange={(v) => setVatType(v as "exclude" | "include")}
              disabled={!canSave || saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={tForm("placeholder.select", { label: tCol("vatType") })}
                >
                  {t(`vatType.${vatType}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude">{t("vatType.exclude")}</SelectItem>
                <SelectItem value="include">{t("vatType.include")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <FormField
            id="vat-rate"
            labelKey="col.rate"
            type="number"
            required
            value={rate}
            onChange={setRate}
            readOnly={!canSave || saving}
            invalid={invalid.rate}
            onClearInvalid={() => setInvalid((p) => ({ ...p, rate: false }))}
          />
          <StatusSwitchField
            labelKey="col.status"
            checked={isActive}
            disabled={!canSave || saving}
            onCheckedChange={setIsActive}
          />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={tCrud("btn.cancel")}
          showSave={canSave}
          saveDisabled={saving}
        />
      </form>
    </CrudFormSheet>
  );
}
