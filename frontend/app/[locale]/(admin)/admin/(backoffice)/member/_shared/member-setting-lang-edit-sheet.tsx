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
import type { MemberSettingItem } from "@/lib/member-setting-api";

export type MemberSettingEditPayload = {
  sku: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
};

export type MemberSettingSheetState =
  | { mode: "edit"; row: MemberSettingItem; names: { th: string; en: string } }
  | { mode: "create" };

type Props = {
  pageKey: "memberSettingCredit" | "memberSettingGroup" | "memberSettingBusiness";
  state: MemberSettingSheetState | null;
  canSave?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: MemberSettingEditPayload) => void | Promise<void>;
};

export function MemberSettingLangEditSheet({
  pageKey,
  state,
  canSave = true,
  onOpenChange,
  onSave,
}: Props) {
  if (!state) return null;
  const mode = state.mode;
  const editId = mode === "edit" ? state.row.id : null;
  const initial: MemberSettingEditPayload =
    mode === "edit"
      ? {
          sku: state.row.sku ?? "",
          nameTh: state.names.th,
          nameEn: state.names.en,
          isActive: state.row.is_active,
        }
      : { sku: "", nameTh: "", nameEn: "", isActive: true };

  return (
    <MemberSettingEditForm
      key={mode === "edit" ? `edit-${state.row.id}` : "create"}
      pageKey={pageKey}
      mode={mode}
      initial={initial}
      editId={editId}
      canSave={canSave}
      onClose={() => onOpenChange(false)}
      onSave={onSave}
    />
  );
}

function MemberSettingEditForm({
  pageKey,
  mode,
  initial,
  editId,
  canSave,
  onClose,
  onSave,
}: {
  pageKey: Props["pageKey"];
  mode: "edit" | "create";
  initial: MemberSettingEditPayload;
  editId: number | null;
  canSave: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
}) {
  const tCrud = useTranslations("crud");
  const tPage = useTranslations(`page.${pageKey}`);
  const tError = useTranslations("error");

  const [sku, setSku] = useState(initial.sku);
  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    setInvalid(next);
    setFieldErrors({});
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave(editId, { sku, nameTh, nameEn, isActive });
      onClose();
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "conflict"
      ) {
        setFieldErrors({ sku: tError("skuTaken") });
        setInvalid({ sku: true });
      }
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
            id="member-setting-sku"
            labelKey="col.sku"
            value={sku}
            onChange={(v) => {
              setSku(v);
              setInvalid((p) => ({ ...p, sku: false }));
              setFieldErrors((p) => ({ ...p, sku: "" }));
            }}
            invalid={invalid.sku}
            errorMessage={fieldErrors.sku}
          />
          <FormField
            id="member-setting-name-th"
            labelKey="col.nameTh"
            required
            value={nameTh}
            onChange={(v) => {
              setNameTh(v);
              setInvalid((p) => ({ ...p, nameTh: false }));
            }}
            invalid={invalid.nameTh}
          />
          <FormField
            id="member-setting-name-en"
            labelKey="col.nameEn"
            required
            value={nameEn}
            onChange={(v) => {
              setNameEn(v);
              setInvalid((p) => ({ ...p, nameEn: false }));
            }}
            invalid={invalid.nameEn}
          />
          <StatusSwitchField
            labelKey="col.active"
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={!canSave}
          />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={
            editId != null ? tCrud("btn.cancel") : tCrud("btn.back")
          }
          showSave={canSave}
          saveDisabled={saving}
        />
      </form>
    </CrudFormSheet>
  );
}
