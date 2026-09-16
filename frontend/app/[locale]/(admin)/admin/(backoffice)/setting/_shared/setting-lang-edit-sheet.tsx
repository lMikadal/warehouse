"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import type { SettingLangListConfig } from "./setting-config";
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
import type { SettingLangItem } from "@/lib/setting-api";

export type SettingLangEditPayload = {
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  isSale: boolean;
  isPurchase: boolean;
  isDefault: boolean;
  isClaim: boolean;
  isReturn: boolean;
  prefixType: string;
  code: string;
};

export type SettingLangSheetState =
  | { mode: "edit"; row: SettingLangItem; names: { th: string; en: string } }
  | { mode: "create"; prefixType?: string };

type Props = {
  config: SettingLangListConfig;
  state: SettingLangSheetState | null;
  canSave?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | null, payload: SettingLangEditPayload) => void | Promise<void>;
};

function defaults(config: SettingLangListConfig, state: SettingLangSheetState): SettingLangEditPayload {
  if (state.mode === "edit") {
    return {
      nameTh: state.names.th,
      nameEn: state.names.en,
      isActive: state.row.is_active,
      isSale: state.row.is_sale ?? true,
      isPurchase: state.row.is_purchase ?? false,
      isDefault: state.row.is_default ?? false,
      isClaim: state.row.is_claim ?? false,
      isReturn: state.row.is_return ?? false,
      prefixType: state.row.type ?? "person",
      code: state.row.code ?? "",
    };
  }
  return {
    nameTh: "",
    nameEn: "",
    isActive: true,
    isSale: true,
    isPurchase: false,
    isDefault: false,
    isClaim: false,
    isReturn: false,
    prefixType: state.prefixType ?? "person",
    code: "",
  };
}

export function SettingLangEditSheet({
  config,
  state,
  canSave = true,
  onOpenChange,
  onSave,
}: Props) {
  if (!state) return null;
  const mode = state.mode;
  const editId = mode === "edit" ? state.row.id : null;
  const initial = defaults(config, state);

  return (
    <SettingLangEditForm
      key={mode === "edit" ? `edit-${state.row.id}` : "create"}
      config={config}
      mode={mode}
      initial={initial}
      editId={editId}
      canSave={canSave}
      onClose={() => onOpenChange(false)}
      onSave={onSave}
    />
  );
}

function SettingLangEditForm({
  config,
  mode,
  initial,
  editId,
  canSave,
  onClose,
  onSave,
}: {
  config: SettingLangListConfig;
  mode: "edit" | "create";
  initial: SettingLangEditPayload;
  editId: number | null;
  canSave: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const tPage = useTranslations("page");
  const t = useTranslations();

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [isSale, setIsSale] = useState(initial.isSale);
  const [isPurchase, setIsPurchase] = useState(initial.isPurchase);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [isClaim, setIsClaim] = useState(initial.isClaim);
  const [isReturn, setIsReturn] = useState(initial.isReturn);
  const [prefixType, setPrefixType] = useState(initial.prefixType);
  const [code, setCode] = useState(initial.code);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const pageTitle = tPage(`${config.pageKey}.title`);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    if (config.showCodeColumn && !code.trim()) next.code = true;
    if (config.claimFlags && !isClaim && !isReturn) next.claim = true;
    setInvalid(next);
    if (Object.keys(next).length > 0) return;
    await onSave(editId, {
      nameTh,
      nameEn,
      isActive,
      isSale,
      isPurchase,
      isDefault,
      isClaim,
      isReturn,
      prefixType,
      code,
    });
  };

  return (
    <CrudFormSheet open onOpenChange={(o) => !o && onClose()}>
      <form onSubmit={submit}>
        <CrudFormSheetHeader
          title={mode === "edit" ? pageTitle : tCrud("btn.create")}
        />
        <CrudFormSheetBody>
          {config.prefixTypeFilter && mode === "create" && (
            <Field className="gap-1.5">
              <FieldLabel>{tCol("type")}</FieldLabel>
              <Select
                value={prefixType}
                onValueChange={(v) => setPrefixType(v ?? "person")}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={tForm("placeholder.select", { label: tCol("type") })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">{t("prefixType.person")}</SelectItem>
                  <SelectItem value="company">{t("prefixType.company")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          {config.showCodeColumn && (
            <FormField
              id="setting-code"
              labelKey="col.settingCode"
              required
              value={code}
              onChange={setCode}
              invalid={invalid.code}
              onClearInvalid={() => setInvalid((p) => ({ ...p, code: false }))}
            />
          )}
          <FormField
            id="setting-name-th"
            labelKey="col.nameTh"
            required
            value={nameTh}
            onChange={setNameTh}
            invalid={invalid.nameTh}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameTh: false }))}
          />
          <FormField
            id="setting-name-en"
            labelKey="col.nameEn"
            required
            value={nameEn}
            onChange={setNameEn}
            invalid={invalid.nameEn}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameEn: false }))}
          />
          {config.paymentFilters && (
            <>
              <StatusSwitchField checked={isSale} onCheckedChange={setIsSale} />
              <StatusSwitchField checked={isPurchase} onCheckedChange={setIsPurchase} />
            </>
          )}
          {config.claimFlags && (
            <>
              <StatusSwitchField checked={isClaim} onCheckedChange={setIsClaim} />
              <StatusSwitchField checked={isReturn} onCheckedChange={setIsReturn} />
              {invalid.claim ? (
                <p className="text-sm text-destructive" role="alert">
                  {t("error.required")}
                </p>
              ) : null}
            </>
          )}
          {config.saleDefault && (
            <StatusSwitchField checked={isDefault} onCheckedChange={setIsDefault} />
          )}
          <StatusSwitchField checked={isActive} onCheckedChange={setIsActive} />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={
            mode === "edit" ? tCrud("btn.cancel") : tCrud("btn.back")
          }
          showSave={canSave}
        />
      </form>
    </CrudFormSheet>
  );
}
