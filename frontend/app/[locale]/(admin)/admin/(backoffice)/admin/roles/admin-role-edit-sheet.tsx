"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";

import { AdminRolePermissionMatrix } from "@/components/molecules/admin-role-permission-matrix";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  BOOTSTRAP_ADMIN_ROLE_ID,
  type AdminRoleRow,
} from "@/lib/admin-role-api";
import {
  allMatrixPermissionIds,
  fetchAdminRolePermissionMatrix,
  type PermissionMatrixGroup,
} from "@/lib/admin-role-permission-matrix-api";

export type AdminRoleEditPayload = {
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  permissionIds: number[];
};

export type AdminRoleSheetState =
  | { mode: "edit"; row: AdminRoleRow }
  | { mode: "create" };

export type AdminRoleEditSheetProps = {
  state: AdminRoleSheetState | null;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: number | null,
    payload: AdminRoleEditPayload
  ) => void | Promise<void>;
  initialDetail?: {
    names: { th: string; en: string };
    permission_ids: number[];
    is_active: boolean;
  } | null;
  canSave?: boolean;
};

type RequiredKey = "nameTh" | "nameEn";

function emptyInvalid(): Record<RequiredKey, boolean> {
  return { nameTh: false, nameEn: false };
}

function AdminRoleEditForm({
  mode,
  editId,
  locked,
  initial,
  matrixGroups,
  onSave,
  onClose,
  canSave = true,
}: {
  mode: "edit" | "create";
  editId: number | null;
  locked: boolean;
  initial: AdminRoleEditPayload;
  matrixGroups: PermissionMatrixGroup[];
  onSave: AdminRoleEditSheetProps["onSave"];
  onClose: () => void;
  canSave?: boolean;
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tPage = useTranslations("page.adminRole");

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [permissionIds, setPermissionIds] = useState(initial.permissionIds);
  const [fieldInvalid, setFieldInvalid] = useState(emptyInvalid);

  useEffect(() => {
    setNameTh(initial.nameTh);
    setNameEn(initial.nameEn);
    setIsActive(initial.isActive);
    setPermissionIds(initial.permissionIds);
    setFieldInvalid(emptyInvalid());
  }, [initial]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (locked) return;
    const trimmedTh = nameTh.trim();
    const trimmedEn = nameEn.trim();
    const nextInvalid = emptyInvalid();
    if (!trimmedTh) nextInvalid.nameTh = true;
    if (!trimmedEn) nextInvalid.nameEn = true;
    setFieldInvalid(nextInvalid);
    if (nextInvalid.nameTh || nextInvalid.nameEn) return;

    await onSave(editId, {
      nameTh: trimmedTh,
      nameEn: trimmedEn,
      isActive,
      permissionIds,
    });
    onClose();
  };

  const dismissLabel =
    mode === "create" ? tCrud("btn.back") : tCrud("btn.cancel");

  return (
    <form
      id="admin-role-edit-form"
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <CrudFormSheetHeader
        title={mode === "create" ? tPage("add") : tPage("editTitle")}
      />
      <CrudFormSheetBody className="space-y-4">
        <FormField
          id="admin-role-name-th"
          labelKey="col.nameTh"
          required
          value={nameTh}
          invalid={fieldInvalid.nameTh}
          readOnly={locked || !canSave}
          onChange={setNameTh}
          onClearInvalid={() =>
            setFieldInvalid((p) => (p.nameTh ? { ...p, nameTh: false } : p))
          }
        />
        <FormField
          id="admin-role-name-en"
          labelKey="col.nameEn"
          required
          value={nameEn}
          invalid={fieldInvalid.nameEn}
          readOnly={locked || !canSave}
          onChange={setNameEn}
          onClearInvalid={() =>
            setFieldInvalid((p) => (p.nameEn ? { ...p, nameEn: false } : p))
          }
        />
        <Field>
          <FieldLabel>{tCol("active")}</FieldLabel>
          <StatusSwitchField
            checked={isActive}
            disabled={locked || !canSave}
            onCheckedChange={setIsActive}
          />
        </Field>
        <AdminRolePermissionMatrix
          groups={matrixGroups}
          value={permissionIds}
          onChange={setPermissionIds}
          locked={locked || !canSave}
        />
      </CrudFormSheetBody>
      <CrudFormSheetFooter dismissLabel={dismissLabel} showSave={canSave} />
    </form>
  );
}

export function AdminRoleEditSheet({
  state,
  locale,
  onOpenChange,
  onSave,
  initialDetail,
  canSave = true,
}: AdminRoleEditSheetProps) {
  const open = state != null;
  const editId = state?.mode === "edit" ? state.row.id : null;
  const locked = editId === BOOTSTRAP_ADMIN_ROLE_ID;

  const [matrixGroups, setMatrixGroups] = useState<PermissionMatrixGroup[]>([]);
  const [matrixReady, setMatrixReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setMatrixReady(false);
      return;
    }
    let cancelled = false;
    void fetchAdminRolePermissionMatrix(locale).then((data) => {
      if (cancelled) return;
      setMatrixGroups(data.groups);
      setMatrixReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  const matrixAllIds = allMatrixPermissionIds({ groups: matrixGroups });

  const initial: AdminRoleEditPayload =
    state?.mode === "edit" && initialDetail
      ? {
          nameTh: initialDetail.names.th,
          nameEn: initialDetail.names.en,
          isActive: initialDetail.is_active,
          permissionIds: locked
            ? matrixAllIds
            : [...initialDetail.permission_ids],
        }
      : state?.mode === "edit"
        ? {
            nameTh: "",
            nameEn: "",
            isActive: state.row.is_active,
            permissionIds: [],
          }
        : {
            nameTh: "",
            nameEn: "",
            isActive: true,
            permissionIds: [],
          };

  return (
    <CrudFormSheet open={open} onOpenChange={onOpenChange}>
      {open && matrixReady ? (
        <AdminRoleEditForm
          key={`${editId ?? "new"}-${initialDetail?.permission_ids.length ?? 0}`}
          mode={state!.mode}
          editId={editId}
          locked={locked}
          initial={initial}
          matrixGroups={matrixGroups}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          canSave={canSave}
        />
      ) : null}
    </CrudFormSheet>
  );
}
