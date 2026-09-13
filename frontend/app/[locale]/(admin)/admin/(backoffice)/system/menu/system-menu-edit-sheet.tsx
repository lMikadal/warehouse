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
import { Input } from "@/components/ui/input";
import type { AdminMenuRow } from "@/lib/admin-menu-mock";

type MenuRequiredFieldKey = "nameTh" | "nameEn" | "module";

const MENU_REQUIRED_FIELDS: {
  key: MenuRequiredFieldKey;
  id: string;
}[] = [
  { key: "nameTh", id: "menu-edit-name-th" },
  { key: "nameEn", id: "menu-edit-name-en" },
  { key: "module", id: "menu-edit-module" },
];

function emptyMenuRequiredInvalid(): Record<MenuRequiredFieldKey, boolean> {
  return { nameTh: false, nameEn: false, module: false };
}

export type SystemMenuEditPayload = {
  nameTh: string;
  nameEn: string;
  path: string;
  module: string;
  isActive: boolean;
};

export type SystemMenuSheetState =
  | { mode: "edit"; row: AdminMenuRow }
  | { mode: "create" };

export type SystemMenuEditSheetProps = {
  state: SystemMenuSheetState | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: SystemMenuEditPayload) => void;
};

type SystemMenuEditFormProps = {
  mode: "edit" | "create";
  initial: {
    nameTh: string;
    nameEn: string;
    path: string;
    module: string;
    isActive: boolean;
  };
  editId: number | null;
  onSave: (id: number | null, payload: SystemMenuEditPayload) => void;
  onClose: () => void;
};

function SystemMenuEditForm({
  mode,
  initial,
  editId,
  onSave,
  onClose,
}: SystemMenuEditFormProps) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [path, setPath] = useState(initial.path);
  const [moduleValue, setModuleValue] = useState(initial.module);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [fieldInvalid, setFieldInvalid] = useState(emptyMenuRequiredInvalid);

  const moduleLocked = mode === "edit";

  const clearFieldInvalid = (key: MenuRequiredFieldKey) => {
    setFieldInvalid((prev) =>
      prev[key] ? { ...prev, [key]: false } : prev
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = {
      nameTh: nameTh.trim(),
      nameEn: nameEn.trim(),
      module: moduleValue.trim(),
    };

    const nextInvalid = emptyMenuRequiredInvalid();
    let firstInvalidId: string | undefined;

    for (const field of MENU_REQUIRED_FIELDS) {
      if (field.key === "module" && moduleLocked) continue;

      const empty = !trimmed[field.key];
      nextInvalid[field.key] = empty;
      if (empty && firstInvalidId === undefined) {
        firstInvalidId = field.id;
      }
    }

    setFieldInvalid(nextInvalid);

    if (firstInvalidId) {
      document.getElementById(firstInvalidId)?.focus();
      return;
    }

    onSave(editId, {
      nameTh: trimmed.nameTh,
      nameEn: trimmed.nameEn,
      path: path.trim(),
      module: moduleLocked ? initial.module : trimmed.module,
      isActive,
    });
    onClose();
  };

  const dismissLabel = mode === "create" ? tCrud("back") : tCrud("cancel");

  return (
    <form
      id="system-menu-edit-form"
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit}
      noValidate
    >
      <CrudFormSheetBody>
        <FormField
          id="menu-edit-name-th"
          labelKey="col.nameTh"
          required
          value={nameTh}
          onChange={setNameTh}
          invalid={fieldInvalid.nameTh}
          onClearInvalid={() => clearFieldInvalid("nameTh")}
        />

        <FormField
          id="menu-edit-name-en"
          labelKey="col.nameEn"
          required
          value={nameEn}
          onChange={setNameEn}
          invalid={fieldInvalid.nameEn}
          onClearInvalid={() => clearFieldInvalid("nameEn")}
        />

        <FormField
          id="menu-edit-path"
          labelKey="col.path"
          value={path}
          onChange={setPath}
        />

        {moduleLocked ? (
          <FormField
            id="menu-edit-module"
            labelKey="col.module"
            value={moduleValue}
            onChange={() => {}}
          >
            <Input
              id="menu-edit-module"
              disabled
              value={moduleValue}
              readOnly
            />
          </FormField>
        ) : (
          <FormField
            id="menu-edit-module"
            labelKey="col.module"
            required
            value={moduleValue}
            onChange={setModuleValue}
            invalid={fieldInvalid.module}
            onClearInvalid={() => clearFieldInvalid("module")}
          />
        )}

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-medium">{tCol("active")}</span>
          <StatusSwitchField checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </CrudFormSheetBody>

      <CrudFormSheetFooter dismissLabel={dismissLabel} />
    </form>
  );
}

export function SystemMenuEditSheet({
  state,
  onOpenChange,
  onSave,
}: SystemMenuEditSheetProps) {
  const tCrud = useTranslations("crud");
  const tPage = useTranslations("page");

  const sheetOpen = state != null;

  const handleClose = () => onOpenChange(false);

  const title =
    state?.mode === "create" ? tPage("adminMenuAdd") : tCrud("edit");

  const formKey =
    state?.mode === "edit" ? `edit-${state.row.id}` : "create";

  const formProps =
    state?.mode === "edit"
      ? {
          mode: "edit" as const,
          editId: state.row.id,
          initial: {
            nameTh: state.row.labels.th,
            nameEn: state.row.labels.en,
            path: state.row.path ?? "",
            module: state.row.module,
            isActive: state.row.is_active,
          },
        }
      : state?.mode === "create"
        ? {
            mode: "create" as const,
            editId: null,
            initial: {
              nameTh: "",
              nameEn: "",
              path: "",
              module: "",
              isActive: true,
            },
          }
        : null;

  return (
    <CrudFormSheet open={sheetOpen} onOpenChange={onOpenChange}>
      <CrudFormSheetHeader title={title} />

      {formProps ? (
        <SystemMenuEditForm
          key={formKey}
          {...formProps}
          onSave={onSave}
          onClose={handleClose}
        />
      ) : null}
    </CrudFormSheet>
  );
}
