"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useCallback, useState } from "react";

import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import {
  RemoteMultiComboboxField,
  type RemoteComboboxLoadContext,
} from "@/components/molecules/remote-multi-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import type { MemberSettingItem } from "@/lib/member-setting-api";
import { fetchMemberBusinessSettingFilters } from "@/lib/member-setting-api";

export type MemberBusinessEditPayload = {
  sku: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  creditIds: string[];
  groupIds: string[];
};

export type MemberBusinessSheetState =
  | {
      mode: "edit";
      row: MemberSettingItem;
      names: { th: string; en: string };
      creditIds: string[];
      groupIds: string[];
    }
  | { mode: "create" };

type Props = {
  state: MemberBusinessSheetState | null;
  canSave?: boolean;
  showRelationFields?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: MemberBusinessEditPayload) => void | Promise<void>;
};

export function MemberSettingBusinessEditSheet({
  state,
  canSave = true,
  showRelationFields = true,
  onOpenChange,
  onSave,
}: Props) {
  if (!state) return null;
  const mode = state.mode;
  const editId = mode === "edit" ? state.row.id : null;
  const initial: MemberBusinessEditPayload =
    mode === "edit"
      ? {
          sku: state.row.sku ?? "",
          nameTh: state.names.th,
          nameEn: state.names.en,
          isActive: state.row.is_active,
          creditIds: state.creditIds,
          groupIds: state.groupIds,
        }
      : {
          sku: "",
          nameTh: "",
          nameEn: "",
          isActive: true,
          creditIds: [],
          groupIds: [],
        };

  return (
    <MemberBusinessEditForm
      key={mode === "edit" ? `edit-${state.row.id}` : "create"}
      mode={mode}
      initial={initial}
      editId={editId}
      canSave={canSave}
      showRelationFields={showRelationFields}
      onClose={() => onOpenChange(false)}
      onSave={onSave}
    />
  );
}

function MemberBusinessEditForm({
  mode,
  initial,
  editId,
  canSave,
  showRelationFields,
  onClose,
  onSave,
}: {
  mode: "edit" | "create";
  initial: MemberBusinessEditPayload;
  editId: number | null;
  canSave: boolean;
  showRelationFields: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
}) {
  const locale = useLocale();
  const tCrud = useTranslations("crud");
  const tPage = useTranslations("page.memberSettingBusiness");
  const tBiz = useTranslations("memberSettingBusiness");
  const tForm = useTranslations("form");
  const tError = useTranslations("error");

  const [sku, setSku] = useState(initial.sku);
  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [creditIds, setCreditIds] = useState(initial.creditIds);
  const [groupIds, setGroupIds] = useState(initial.groupIds);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadCredits = useCallback(
    async (ctx: RemoteComboboxLoadContext) => {
      const res = await fetchMemberBusinessSettingFilters(locale, "credits", {
        page: 1,
        limit: 50,
        search: ctx.search.trim() || undefined,
      });
      if (ctx.signal.aborted) return [];
      return res.items.map((i) => ({ value: String(i.id), label: i.name }));
    },
    [locale]
  );

  const loadGroups = useCallback(
    async (ctx: RemoteComboboxLoadContext) => {
      const res = await fetchMemberBusinessSettingFilters(locale, "groups", {
        page: 1,
        limit: 50,
        search: ctx.search.trim() || undefined,
      });
      if (ctx.signal.aborted) return [];
      return res.items.map((i) => ({ value: String(i.id), label: i.name }));
    },
    [locale]
  );

  const resolveCreditLabels = useCallback(
    async (values: string[]) => {
      const out: { value: string; label: string }[] = [];
      for (const v of values) {
        const id = Number(v);
        if (!id) continue;
        try {
          const res = await fetchMemberBusinessSettingFilters(locale, "credits", {
            id,
            page: 1,
            limit: 1,
          });
          const row = res.items[0];
          out.push({ value: v, label: row?.name ?? v });
        } catch {
          out.push({ value: v, label: v });
        }
      }
      return out;
    },
    [locale]
  );

  const resolveGroupLabels = useCallback(
    async (values: string[]) => {
      const out: { value: string; label: string }[] = [];
      for (const v of values) {
        const id = Number(v);
        if (!id) continue;
        try {
          const res = await fetchMemberBusinessSettingFilters(locale, "groups", {
            id,
            page: 1,
            limit: 1,
          });
          const row = res.items[0];
          out.push({ value: v, label: row?.name ?? v });
        } catch {
          out.push({ value: v, label: v });
        }
      }
      return out;
    },
    [locale]
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    const errs: Record<string, string> = {};
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    if (showRelationFields) {
      const hasCredits = creditIds.length > 0;
      const hasGroups = groupIds.length > 0;
      if (hasCredits && !hasGroups) {
        next.groupIds = true;
        errs.groupIds = tError("required");
      }
      if (hasGroups && !hasCredits) {
        next.creditIds = true;
        errs.creditIds = tError("required");
      }
    }
    setInvalid(next);
    setFieldErrors(errs);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave(editId, {
        sku,
        nameTh,
        nameEn,
        isActive,
        creditIds,
        groupIds,
      });
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
            id="member-business-sku"
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
            id="member-business-name-th"
            labelKey="col.nameTh"
            required
            value={nameTh}
            onChange={setNameTh}
            invalid={invalid.nameTh}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameTh: false }))}
          />
          <FormField
            id="member-business-name-en"
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
          {showRelationFields ? (
            <>
              <RemoteMultiComboboxField
                id="member-business-credits"
                label={tBiz("paymentMethods")}
                values={creditIds}
                onValuesChange={(vals) => {
                  setCreditIds(vals);
                  setInvalid((p) => ({ ...p, creditIds: false }));
                  setFieldErrors((p) => ({ ...p, creditIds: "" }));
                }}
                placeholder={tForm("placeholder.select", {
                  label: tBiz("paymentMethods"),
                })}
                emptyLabel={tForm("combobox.noResults")}
                onLoadOptions={loadCredits}
                resolveSelectedLabels={resolveCreditLabels}
              />
              {invalid.creditIds && fieldErrors.creditIds ? (
                <p className="text-destructive text-sm" role="alert">
                  {fieldErrors.creditIds}
                </p>
              ) : null}
              <RemoteMultiComboboxField
                id="member-business-groups"
                label={tBiz("types")}
                values={groupIds}
                onValuesChange={(vals) => {
                  setGroupIds(vals);
                  setInvalid((p) => ({ ...p, groupIds: false }));
                  setFieldErrors((p) => ({ ...p, groupIds: "" }));
                }}
                placeholder={tForm("placeholder.select", {
                  label: tBiz("types"),
                })}
                emptyLabel={tForm("combobox.noResults")}
                onLoadOptions={loadGroups}
                resolveSelectedLabels={resolveGroupLabels}
              />
              {invalid.groupIds && fieldErrors.groupIds ? (
                <p className="text-destructive text-sm" role="alert">
                  {fieldErrors.groupIds}
                </p>
              ) : null}
            </>
          ) : null}
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
