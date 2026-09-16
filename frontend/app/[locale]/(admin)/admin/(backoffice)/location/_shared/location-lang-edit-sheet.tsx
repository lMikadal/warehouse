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
import type { LocationItem } from "@/lib/location-api";

export type LocationEditPayload = {
  nameTh: string;
  nameEn: string;
  isActive: boolean;
};

export type LocationSheetState =
  | { mode: "edit"; row: LocationItem; names: { th: string; en: string } }
  | { mode: "create" };

type Props = {
  state: LocationSheetState | null;
  canSave?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: LocationEditPayload) => void | Promise<void>;
};

export function LocationLangEditSheet({
  state,
  canSave = true,
  onOpenChange,
  onSave,
}: Props) {
  if (!state) return null;
  const mode = state.mode;
  const editId = mode === "edit" ? state.row.id : null;
  const initial: LocationEditPayload =
    mode === "edit"
      ? {
          nameTh: state.names.th,
          nameEn: state.names.en,
          isActive: state.row.is_active,
        }
      : { nameTh: "", nameEn: "", isActive: true };

  return (
    <LocationEditForm
      key={mode === "edit" ? `edit-${state.row.id}` : "create"}
      mode={mode}
      initial={initial}
      editId={editId}
      canSave={canSave}
      onClose={() => onOpenChange(false)}
      onSave={onSave}
    />
  );
}

function LocationEditForm({
  mode,
  initial,
  editId,
  canSave,
  onClose,
  onSave,
}: {
  mode: "edit" | "create";
  initial: LocationEditPayload;
  editId: number | null;
  canSave: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
}) {
  const tCrud = useTranslations("crud");
  const tPage = useTranslations("page.locationLocation");

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    setInvalid(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave(editId, { nameTh, nameEn, isActive });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudFormSheet open onOpenChange={(o) => !o && onClose()}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => void submit(e)}
        noValidate
      >
        <CrudFormSheetHeader
          title={mode === "edit" ? tPage("title") : tCrud("btn.create")}
        />
        <CrudFormSheetBody className="space-y-4">
          <FormField
            id="location-name-th"
            labelKey="col.nameTh"
            required
            value={nameTh}
            onChange={setNameTh}
            invalid={invalid.nameTh}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameTh: false }))}
          />
          <FormField
            id="location-name-en"
            labelKey="col.nameEn"
            required
            value={nameEn}
            onChange={setNameEn}
            invalid={invalid.nameEn}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameEn: false }))}
          />
          <StatusSwitchField
            labelKey="col.active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={tCrud("btn.cancel")}
          saveDisabled={!canSave || saving}
        />
      </form>
    </CrudFormSheet>
  );
}
