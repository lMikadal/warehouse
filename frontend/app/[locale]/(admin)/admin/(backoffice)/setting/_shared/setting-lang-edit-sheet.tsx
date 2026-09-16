"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { SettingLangListConfig } from "./setting-config";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import type { SettingLangItem } from "@/lib/setting-api";
import {
  fetchSystemFile,
  revokeImageUploadItems,
  type ImageUploadItem,
} from "@/lib/system-file-api";

export type SettingLangEditPayload = {
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  isSale: boolean;
  isPurchase: boolean;
  isDefault: boolean;
  isClaim: boolean;
  isReturn: boolean;
  isPerson: boolean;
  isCompany: boolean;
  code: string;
  logoItems?: ImageUploadItem[];
  initialLogoRemoteId?: number | null;
};

export type SettingLangSheetState =
  | { mode: "edit"; row: SettingLangItem; names: { th: string; en: string } }
  | { mode: "create" };

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
      isPerson: state.row.is_person ?? false,
      isCompany: state.row.is_company ?? false,
      code: "",
      initialLogoRemoteId: state.row.system_file_id ?? null,
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
    isPerson: true,
    isCompany: false,
    code: "",
    initialLogoRemoteId: null,
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
  const tPage = useTranslations("page");
  const tError = useTranslations("error");
  const t = useTranslations();
  const locale = useLocale();

  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [isSale, setIsSale] = useState(initial.isSale);
  const [isPurchase, setIsPurchase] = useState(initial.isPurchase);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [isClaim, setIsClaim] = useState(initial.isClaim);
  const [isReturn, setIsReturn] = useState(initial.isReturn);
  const [isPerson, setIsPerson] = useState(initial.isPerson);
  const [isCompany, setIsCompany] = useState(initial.isCompany);
  const [code, setCode] = useState(initial.code);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [logoFiles, setLogoFiles] = useState<ImageUploadItem[]>([]);
  const logoFilesRef = useRef(logoFiles);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    logoFilesRef.current = logoFiles;
  }, [logoFiles]);

  const pageTitle = tPage(`${config.pageKey}.title`);

  useEffect(() => {
    if (!config.logoPurpose) return;
    let cancelled = false;
    (async () => {
      const id = initial.initialLogoRemoteId;
      if (id == null) {
        if (!cancelled) setLogoFiles([]);
        return;
      }
      try {
        const item = await fetchSystemFile(locale, id);
        if (!cancelled) setLogoFiles([item]);
      } catch {
        if (!cancelled) setLogoFiles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.logoPurpose, initial.initialLogoRemoteId, locale]);

  useEffect(() => {
    return () => revokeImageUploadItems(logoFilesRef.current);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    if (config.showCodeColumn && !code.trim()) next.code = true;
    if (config.claimFlags && !isClaim && !isReturn) next.claim = true;
    if (config.prefixFlags && !isPerson && !isCompany) next.prefixAudience = true;
    setInvalid(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave(editId, {
        nameTh,
        nameEn,
        isActive,
        isSale,
        isPurchase,
        isDefault,
        isClaim,
        isReturn,
        isPerson,
        isCompany,
        code,
        logoItems: config.logoPurpose ? logoFiles : undefined,
        initialLogoRemoteId: config.logoPurpose
          ? initial.initialLogoRemoteId
          : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudFormSheet open onOpenChange={(o) => !o && onClose()}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={submit}
        noValidate
      >
        <CrudFormSheetHeader
          title={mode === "edit" ? pageTitle : tCrud("btn.create")}
        />
        <CrudFormSheetBody className="space-y-4">
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
          {config.logoPurpose ? (
            <ImageUploadField
              id="setting-logo"
              labelKey="col.logo"
              purpose={config.logoPurpose}
              value={logoFiles}
              onChange={setLogoFiles}
              maxFiles={1}
              showLabel={false}
              fullWidth
              disabled={!canSave || saving}
            />
          ) : null}
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
              <StatusSwitchField
                labelKey="col.sale"
                checked={isSale}
                onCheckedChange={setIsSale}
              />
              <StatusSwitchField
                labelKey="col.purchase"
                checked={isPurchase}
                onCheckedChange={setIsPurchase}
              />
            </>
          )}
          {config.claimFlags && (
            <>
              <StatusSwitchField
                labelKey="col.claim"
                checked={isClaim}
                onCheckedChange={setIsClaim}
              />
              <StatusSwitchField
                labelKey="col.return"
                checked={isReturn}
                onCheckedChange={setIsReturn}
              />
              {invalid.claim ? (
                <p className="text-sm text-destructive" role="alert">
                  {tError("claimReasonType")}
                </p>
              ) : null}
            </>
          )}
          {config.prefixFlags && (
            <>
              <StatusSwitchField
                labelKey="col.isPerson"
                checked={isPerson}
                onCheckedChange={setIsPerson}
              />
              <StatusSwitchField
                labelKey="col.isCompany"
                checked={isCompany}
                onCheckedChange={setIsCompany}
              />
              {invalid.prefixAudience ? (
                <p className="text-sm text-destructive" role="alert">
                  {tError("prefixAudienceType")}
                </p>
              ) : null}
            </>
          )}
          {config.saleDefault && (
            <StatusSwitchField
              labelKey="col.default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          )}
          <StatusSwitchField
            labelKey="col.status"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={
            mode === "edit" ? tCrud("btn.cancel") : tCrud("btn.back")
          }
          showSave={canSave}
          saveDisabled={saving}
        />
      </form>
    </CrudFormSheet>
  );
}
