"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/molecules/form-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminMenuRow } from "@/lib/admin-menu-mock";

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
  const tError = useTranslations("error");

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [path, setPath] = useState(initial.path);
  const [moduleValue, setModuleValue] = useState(initial.module);
  const [isActive, setIsActive] = useState(initial.isActive);

  const moduleLocked = mode === "edit";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTh = nameTh.trim();
    const trimmedEn = nameEn.trim();
    const trimmedModule = moduleValue.trim();
    if (!trimmedTh || !trimmedEn || (!moduleLocked && !trimmedModule)) {
      toast.error(tError("required"));
      return;
    }

    onSave(editId, {
      nameTh: trimmedTh,
      nameEn: trimmedEn,
      path: path.trim(),
      module: moduleLocked ? initial.module : trimmedModule,
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
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <FormField
          id="menu-edit-name-th"
          labelKey="col.nameTh"
          required
          value={nameTh}
          onChange={setNameTh}
        />

        <FormField
          id="menu-edit-name-en"
          labelKey="col.nameEn"
          required
          value={nameEn}
          onChange={setNameEn}
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
          />
        )}

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-medium">{tCol("active")}</span>
          <StatusSwitchField checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
        <SheetClose render={<Button type="button" variant="outline" size="lg" />}>
          {dismissLabel}
        </SheetClose>
        <Button type="submit" size="lg">
          {tCrud("save")}
        </Button>
      </SheetFooter>
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
    <Sheet open={sheetOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {formProps ? (
          <SystemMenuEditForm
            key={formKey}
            {...formProps}
            onSave={onSave}
            onClose={handleClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
