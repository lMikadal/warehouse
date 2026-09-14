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
import { Switch } from "@/components/ui/switch";
import type { SystemLanguageRow } from "@/lib/system-language-api";

export type SystemLanguageEditPayload = {
  locale: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
};

export type SystemLanguageSheetState =
  | { mode: "edit"; row: SystemLanguageRow }
  | { mode: "create" };

export type SystemLanguageEditSheetProps = {
  state: SystemLanguageSheetState | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: number | null,
    payload: SystemLanguageEditPayload
  ) => void | Promise<void>;
};

type RequiredKey = "locale" | "name";

function emptyInvalid(): Record<RequiredKey, boolean> {
  return { locale: false, name: false };
}

function SystemLanguageEditForm({
  mode,
  initial,
  editId,
  onSave,
  onClose,
}: {
  mode: "edit" | "create";
  initial: SystemLanguageEditPayload;
  editId: number | null;
  onSave: SystemLanguageEditSheetProps["onSave"];
  onClose: () => void;
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  const [locale, setLocale] = useState(initial.locale);
  const [name, setName] = useState(initial.name);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [fieldInvalid, setFieldInvalid] = useState(emptyInvalid);

  const clearInvalid = (key: RequiredKey) => {
    setFieldInvalid((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedLocale = locale.trim().toLowerCase();
    const trimmedName = name.trim();
    const nextInvalid = emptyInvalid();
    if (!trimmedLocale) nextInvalid.locale = true;
    if (!trimmedName) nextInvalid.name = true;
    setFieldInvalid(nextInvalid);
    if (nextInvalid.locale) {
      document.getElementById("language-edit-locale")?.focus();
      return;
    }
    if (nextInvalid.name) {
      document.getElementById("language-edit-name")?.focus();
      return;
    }
    await onSave(editId, {
      locale: trimmedLocale,
      name: trimmedName,
      isActive: isDefault ? true : isActive,
      isDefault,
    });
    onClose();
  };

  const dismissLabel =
    mode === "create" ? tCrud("btn.back") : tCrud("btn.cancel");

  return (
    <form
      id="system-language-edit-form"
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit}
      noValidate
    >
      <CrudFormSheetBody>
        <FormField
          id="language-edit-locale"
          labelKey="col.locale"
          required
          value={locale}
          onChange={setLocale}
          invalid={fieldInvalid.locale}
          onClearInvalid={() => clearInvalid("locale")}
        />
        <FormField
          id="language-edit-name"
          labelKey="col.name"
          required
          value={name}
          onChange={setName}
          invalid={fieldInvalid.name}
          onClearInvalid={() => clearInvalid("name")}
        />
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-medium">{tCol("default")}</span>
          <Switch
            checked={isDefault}
            aria-label={tCol("default")}
            onCheckedChange={(checked) => {
              const on = checked === true;
              setIsDefault(on);
              if (on) setIsActive(true);
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-medium">{tCol("status")}</span>
          <StatusSwitchField
            checked={isActive}
            disabled={isDefault}
            onCheckedChange={setIsActive}
          />
        </div>
      </CrudFormSheetBody>
      <CrudFormSheetFooter dismissLabel={dismissLabel} />
    </form>
  );
}

export function SystemLanguageEditSheet({
  state,
  onOpenChange,
  onSave,
}: SystemLanguageEditSheetProps) {
  const tPage = useTranslations("page.adminLanguage");
  const open = state != null;
  const mode = state?.mode ?? "create";
  const title =
    mode === "create" ? tPage("add") : tPage("editTitle");

  const initial: SystemLanguageEditPayload =
    state?.mode === "edit"
      ? {
          locale: state.row.locale,
          name: state.row.name,
          isActive: state.row.is_active,
          isDefault: state.row.is_default,
        }
      : {
          locale: "",
          name: "",
          isActive: true,
          isDefault: false,
        };

  const editId = state?.mode === "edit" ? state.row.id : null;

  return (
    <CrudFormSheet open={open} onOpenChange={onOpenChange}>
      <CrudFormSheetHeader title={title} />
      {open ? (
        <SystemLanguageEditForm
          key={editId ?? "create"}
          mode={mode}
          initial={initial}
          editId={editId}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </CrudFormSheet>
  );
}
