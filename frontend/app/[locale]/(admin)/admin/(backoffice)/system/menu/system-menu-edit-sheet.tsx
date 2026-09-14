"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useCallback, useMemo, useState } from "react";

import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  type AdminMenuRow,
  MENU_PARENT_ROOT_VALUE,
} from "@/lib/admin-menu-mock";
import {
  loadMenuParentComboboxOptions,
  resolveMenuParentComboboxLabel,
} from "@/lib/system-menu-combobox";
import type { DisplayLocale } from "@/lib/format-datetime";

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
  parentId: number | null;
};

export type SystemMenuSheetState =
  | { mode: "edit"; row: AdminMenuRow }
  | { mode: "create" };

export type SystemMenuEditSheetProps = {
  state: SystemMenuSheetState | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: number | null,
    payload: SystemMenuEditPayload
  ) => void | Promise<void>;
};

type SystemMenuEditFormProps = {
  mode: "edit" | "create";
  initial: {
    nameTh: string;
    nameEn: string;
    path: string;
    module: string;
    isActive: boolean;
    parentValue: string;
  };
  editId: number | null;
  editTreePath: string | null;
  onSave: (
    id: number | null,
    payload: SystemMenuEditPayload
  ) => void | Promise<void>;
  onClose: () => void;
};

function SystemMenuEditForm({
  mode,
  initial,
  editId,
  editTreePath,
  onSave,
  onClose,
}: SystemMenuEditFormProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations();
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tError = useTranslations("error");

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [path, setPath] = useState(initial.path);
  const [moduleValue, setModuleValue] = useState(initial.module);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [parentValue, setParentValue] = useState(initial.parentValue);
  const [fieldInvalid, setFieldInvalid] = useState(emptyMenuRequiredInvalid);
  const [parentInvalid, setParentInvalid] = useState(false);

  const locked = mode === "edit";

  const rootParentOption = useMemo(
    () => ({ value: MENU_PARENT_ROOT_VALUE, label: tForm("field.parentRoot") }),
    [tForm]
  );

  const loadParentOptions = useCallback(
    (ctx: { search: string; signal: AbortSignal }) =>
      loadMenuParentComboboxOptions(locale, {
        search: ctx.search,
        signal: ctx.signal,
        editMenuId: editId,
        editTreePath,
      }),
    [locale, editId, editTreePath]
  );

  const resolveParentLabel = useCallback(
    (value: string) => {
      if (value === MENU_PARENT_ROOT_VALUE) {
        return Promise.resolve(tForm("field.parentRoot"));
      }
      return resolveMenuParentComboboxLabel(locale, value);
    },
    [locale, tForm]
  );

  const parentLabel = t("form.field.parent");
  const parentPlaceholder = tForm("placeholder.select", { label: parentLabel });

  const clearFieldInvalid = (key: MenuRequiredFieldKey) => {
    setFieldInvalid((prev) =>
      prev[key] ? { ...prev, [key]: false } : prev
    );
  };

  const parseParentId = (value: string): number | null => {
    if (value === MENU_PARENT_ROOT_VALUE) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = {
      nameTh: nameTh.trim(),
      nameEn: nameEn.trim(),
      module: moduleValue.trim(),
    };

    const nextInvalid = emptyMenuRequiredInvalid();
    let firstInvalidId: string | undefined;

    for (const field of MENU_REQUIRED_FIELDS) {
      if (field.key === "module" && locked) continue;

      const empty = !trimmed[field.key];
      nextInvalid[field.key] = empty;
      if (empty && firstInvalidId === undefined) {
        firstInvalidId = field.id;
      }
    }

    setFieldInvalid(nextInvalid);

    const parentId = parseParentId(parentValue);
    const parentMissing =
      parentValue !== MENU_PARENT_ROOT_VALUE &&
      parentId == null;
    setParentInvalid(parentMissing);

    if (firstInvalidId) {
      document.getElementById(firstInvalidId)?.focus();
      return;
    }
    if (parentMissing) {
      document.getElementById("menu-edit-parent")?.focus();
      return;
    }

    await onSave(editId, {
      nameTh: trimmed.nameTh,
      nameEn: trimmed.nameEn,
      path: locked ? initial.path : path.trim(),
      module: locked ? initial.module : trimmed.module,
      isActive,
      parentId,
    });
    onClose();
  };

  const dismissLabel = mode === "create" ? tCrud("btn.back") : tCrud("btn.cancel");

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
          labelKey="form.field.nameTh"
          required
          value={nameTh}
          onChange={setNameTh}
          invalid={fieldInvalid.nameTh}
          onClearInvalid={() => clearFieldInvalid("nameTh")}
        />

        <FormField
          id="menu-edit-name-en"
          labelKey="form.field.nameEn"
          required
          value={nameEn}
          onChange={setNameEn}
          invalid={fieldInvalid.nameEn}
          onClearInvalid={() => clearFieldInvalid("nameEn")}
        />

        <Field
          data-invalid={parentInvalid ? true : undefined}
          className="gap-1.5"
        >
          <FieldLabel htmlFor="menu-edit-parent">{parentLabel}</FieldLabel>
          <RemoteComboboxField
            id="menu-edit-parent"
            label={parentLabel}
            placeholder={parentPlaceholder}
            emptyLabel={tForm("combobox.noResults")}
            inputClassName="w-full"
            value={parentValue}
            invalid={parentInvalid}
            pinnedItems={[rootParentOption]}
            onLoadOptions={loadParentOptions}
            resolveSelectedLabel={resolveParentLabel}
            showClear={parentValue !== MENU_PARENT_ROOT_VALUE}
            onValueChange={(next) => {
              setParentValue(next === "" ? MENU_PARENT_ROOT_VALUE : next);
              setParentInvalid(false);
            }}
          />
          {parentInvalid ? (
            <FieldError id="menu-edit-parent-error">
              {tError("invalidParent")}
            </FieldError>
          ) : null}
        </Field>

        <FormField
          id="menu-edit-module"
          labelKey="form.field.module"
          required={!locked}
          value={moduleValue}
          onChange={setModuleValue}
          invalid={fieldInvalid.module}
          onClearInvalid={() => clearFieldInvalid("module")}
          readOnly={locked}
        />

        <FormField
          id="menu-edit-path"
          labelKey="form.field.path"
          value={path}
          onChange={setPath}
          readOnly={locked}
        />

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-medium">{tForm("field.active")}</span>
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
  const tPageMenu = useTranslations("page.adminMenu");

  const sheetOpen = state != null;

  const handleClose = () => onOpenChange(false);

  const title =
    state?.mode === "create" ? tPageMenu("add") : tCrud("btn.edit");

  const formKey =
    state?.mode === "edit" ? `edit-${state.row.id}` : "create";

  const formProps =
    state?.mode === "edit"
      ? {
          mode: "edit" as const,
          editId: state.row.id,
          editTreePath: state.row.tree_path,
          initial: {
            nameTh: state.row.labels.th,
            nameEn: state.row.labels.en,
            path: state.row.path ?? "",
            module: state.row.module,
            isActive: state.row.is_active,
            parentValue:
              state.row.parent_id == null
                ? MENU_PARENT_ROOT_VALUE
                : String(state.row.parent_id),
          },
        }
      : state?.mode === "create"
        ? {
            mode: "create" as const,
            editId: null,
            editTreePath: null,
            initial: {
              nameTh: "",
              nameEn: "",
              path: "",
              module: "",
              isActive: true,
              parentValue: MENU_PARENT_ROOT_VALUE,
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
