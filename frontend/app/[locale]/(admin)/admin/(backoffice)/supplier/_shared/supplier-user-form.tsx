"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Fragment,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import {
  FormCard,
  FormCardAction,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import { fetchSettingLangById, fetchSettingLangList } from "@/lib/setting-api";
import {
  loadGeoComboboxOptions,
  resolveGeoComboboxLabel,
} from "@/lib/system-geo-combobox";
import {
  createSupplierBank,
  createSupplierContact,
  createSupplierUser,
  deleteSupplierBank,
  deleteSupplierContact,
  fetchSupplierUser,
  patchSupplierBank,
  patchSupplierContact,
  patchSupplierUser,
  SupplierUserApiError,
  type SupplierBankInput,
  type SupplierContactInput,
  type SupplierInformationInput,
  type SupplierInformationType,
} from "@/lib/supplier-user-api";
import {
  SupplierBankList,
  type SupplierBankListRow,
} from "./supplier-bank-list";
import {
  SupplierContactList,
  type SupplierContactListRow,
} from "./supplier-contact-list";

type InfoBlockKey = "contact" | "tax" | "delivery";

type InfoState = {
  setting_prefix_id: string;
  name: string;
  branch: "" | "headquarter" | "branch";
  branch_name: string;
  tax_number: string;
  address: string;
  website_province_id: string;
  website_district_id: string;
  website_sub_district_id: string;
  postcode: string;
  tel: string;
  email: string;
};

const emptyInfo = (): InfoState => ({
  setting_prefix_id: "",
  name: "",
  branch: "",
  branch_name: "",
  tax_number: "",
  address: "",
  website_province_id: "",
  website_district_id: "",
  website_sub_district_id: "",
  postcode: "",
  tel: "",
  email: "",
});

type DraftContact = SupplierContactListRow;
type DraftBank = SupplierBankListRow;
type SupplierFormTab = "general" | "contacts" | "financial";

function infoToApi(block: InfoState, isSame?: boolean): SupplierInformationInput {
  return {
    setting_prefix_id: block.setting_prefix_id
      ? Number(block.setting_prefix_id)
      : null,
    name: block.name.trim() || null,
    branch: block.branch || null,
    branch_name: block.branch_name.trim() || null,
    tax_number: block.tax_number.trim() || null,
    address: block.address.trim() || null,
    website_province_id: block.website_province_id
      ? Number(block.website_province_id)
      : null,
    website_district_id: block.website_district_id
      ? Number(block.website_district_id)
      : null,
    website_sub_district_id: block.website_sub_district_id
      ? Number(block.website_sub_district_id)
      : null,
    postcode: block.postcode.trim() || null,
    tel: block.tel.trim() || null,
    email: block.email.trim() || null,
    is_same_information: isSame,
  };
}

function infoFromApi(row?: SupplierInformationInput): InfoState {
  if (!row) return emptyInfo();
  return {
    setting_prefix_id:
      row.setting_prefix_id != null ? String(row.setting_prefix_id) : "",
    name: row.name ?? "",
    branch: (row.branch as InfoState["branch"]) ?? "",
    branch_name: row.branch_name ?? "",
    tax_number: row.tax_number ?? "",
    address: row.address ?? "",
    website_province_id:
      row.website_province_id != null ? String(row.website_province_id) : "",
    website_district_id:
      row.website_district_id != null ? String(row.website_district_id) : "",
    website_sub_district_id:
      row.website_sub_district_id != null
        ? String(row.website_sub_district_id)
        : "",
    postcode: row.postcode ?? "",
    tel: row.tel ?? "",
    email: row.email ?? "",
  };
}

function copyInfo(src: InfoState): InfoState {
  return { ...src };
}

const TAX_OTP_GROUPS = [1, 4, 5, 2, 1] as const;

function taxDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 13);
}

function TaxNumberOtpField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const digits = taxDigitsOnly(value);
  const slotGroups: number[][] = [];
  let slotIndex = 0;
  for (const size of TAX_OTP_GROUPS) {
    slotGroups.push(
      Array.from({ length: size }, () => {
        const index = slotIndex;
        slotIndex += 1;
        return index;
      })
    );
  }
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputOTP
        id={id}
        maxLength={13}
        value={digits}
        disabled={disabled}
        onChange={(v) => onChange(taxDigitsOnly(v))}
      >
        {slotGroups.map((indices, groupIndex) => (
          <Fragment key={groupIndex}>
            {groupIndex > 0 ? <InputOTPSeparator /> : null}
            <InputOTPGroup>
              {indices.map((index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </Fragment>
        ))}
      </InputOTP>
    </Field>
  );
}

function LabeledRemoteCombobox({
  fieldId,
  labelText,
  ...rest
}: {
  fieldId: string;
  labelText: string;
} & Omit<ComponentProps<typeof RemoteComboboxField>, "id" | "label">) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={fieldId}>{labelText}</FieldLabel>
      <RemoteComboboxField id={fieldId} label={labelText} {...rest} />
    </Field>
  );
}

type InfoBlockRenderOpts = {
  disabled?: boolean;
  requireName?: boolean;
  prefix: InfoBlockKey;
  showPrefix?: boolean;
  showTax?: boolean;
  showBranch?: boolean;
  showContactFields?: boolean;
  nameLabelKey?: string;
  headerSwitch?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
  };
};

export type SupplierUserFormProps = {
  supplierId?: number;
};

export function SupplierUserForm({ supplierId }: SupplierUserFormProps) {
  const isEdit = supplierId != null && supplierId > 0;
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.supplierUser");
  const tCol = useTranslations("col");
  const tSupplier = useTranslations("supplier");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tError = useTranslations("error");
  const t = useTranslations();
  const perms = useResourcePermissions("supplier", "supplier_user");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState<SupplierFormTab>("general");
  const [saving, setSaving] = useState(false);
  const [sku, setSku] = useState("");
  const [creditTerm, setCreditTerm] = useState("");
  const [creditTermNote, setCreditTermNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [contactInfo, setContactInfo] = useState(emptyInfo);
  const [taxInfo, setTaxInfo] = useState(emptyInfo);
  const [deliveryInfo, setDeliveryInfo] = useState(emptyInfo);
  const [taxSame, setTaxSame] = useState(false);
  const [contacts, setContacts] = useState<DraftContact[]>([]);
  const [banks, setBanks] = useState<DraftBank[]>([]);
  const [contactDialog, setContactDialog] = useState<
    { mode: "create" } | { mode: "edit"; id: number } | null
  >(null);
  const [bankDialog, setBankDialog] = useState<
    { mode: "create" } | { mode: "edit"; id: number } | null
  >(null);
  const [draftContact, setDraftContact] = useState<SupplierContactInput>({
    name: "",
  });
  const [draftBank, setDraftBank] = useState<SupplierBankInput>({
    setting_bank_id: 0,
    name: "",
    number: "",
    is_active: true,
    is_default: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const canSave = isEdit ? perms.update : perms.create;

  const loadDetail = useCallback(async (options?: { keepUi?: boolean }) => {
    if (!isEdit || supplierId == null) return;
    if (!options?.keepUi) setLoading(true);
    try {
      const d = await fetchSupplierUser(locale, supplierId);
      setSku(d.sku);
      setCreditTerm(d.credit_term != null ? String(d.credit_term) : "");
      setCreditTermNote(d.credit_term_note ?? "");
      setIsActive(d.is_active);
      setContactInfo(infoFromApi(d.information.contact));
      setTaxInfo(infoFromApi(d.information.tax_invoice));
      setDeliveryInfo(infoFromApi(d.information.delivery));
      setTaxSame(d.information.tax_invoice?.is_same_information ?? false);
      setContacts(d.contacts);
      setBanks(d.banks);
    } catch (e) {
      toast.error(
        e instanceof SupplierUserApiError ? e.message : t("error.generic")
      );
    } finally {
      setLoading(false);
    }
  }, [isEdit, supplierId, locale, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (taxSame) setTaxInfo(copyInfo(contactInfo));
  }, [taxSame, contactInfo]);

  const informationPayload = useMemo(() => {
    const contact = infoToApi(contactInfo);
    const tax = taxSame
      ? { ...infoToApi(contactInfo), is_same_information: true }
      : infoToApi(taxInfo, false);
    const delivery = infoToApi(deliveryInfo);
    return {
      contact,
      tax_invoice: tax,
      delivery,
    } satisfies Partial<Record<SupplierInformationType, SupplierInformationInput>>;
  }, [contactInfo, taxInfo, deliveryInfo, taxSame]);

  const validateMain = () => {
    const errs: Record<string, boolean> = {};
    if (!sku.trim()) errs.sku = true;
    if (!contactInfo.name.trim()) errs.contact_name = true;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = async () => {
    if (!canSave || !validateMain()) {
      toast.error(tError("required"));
      return;
    }
    setSaving(true);
    try {
      const credit = creditTerm.trim() ? Number(creditTerm) : null;
      if (isEdit && supplierId != null) {
        await patchSupplierUser(locale, supplierId, {
          sku: sku.trim(),
          credit_term: credit,
          credit_term_note: creditTermNote.trim() || null,
          is_active: isActive,
          information: informationPayload,
        });
        toast.success(tCrud("toast.saved"));
      } else {
        const created = await createSupplierUser(locale, {
          sku: sku.trim(),
          credit_term: credit,
          credit_term_note: creditTermNote.trim() || null,
          is_active: isActive,
          information: informationPayload,
          contacts: [...contacts]
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
            .map(({ name, email, tel, position }) => ({
              name,
              email: email ?? null,
              tel: tel ?? null,
              position: position ?? null,
            })),
          banks: [...banks]
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
            .map((b) => ({
              setting_bank_id: b.setting_bank_id,
              name: b.name,
              number: b.number,
              branch: b.branch ?? null,
              is_active: b.is_active,
              is_default: b.is_default,
            })),
        });
        toast.success(tCrud("toast.created"));
        router.replace(`/admin/supplier/${created.id}`);
      }
    } catch (e) {
      toast.error(
        e instanceof SupplierUserApiError ? e.message : t("error.generic")
      );
    } finally {
      setSaving(false);
    }
  };

  const openContactEdit = (row?: DraftContact) => {
    if (row) {
      setDraftContact({
        name: row.name,
        email: row.email ?? "",
        tel: row.tel ?? "",
        position: row.position ?? "",
      });
      setContactDialog({ mode: "edit", id: row.id });
    } else {
      setDraftContact({ name: "" });
      setContactDialog({ mode: "create" });
    }
  };

  const saveContactDialog = async () => {
    if (!draftContact.name.trim()) {
      toast.error(tError("required"));
      return;
    }
    if (isEdit && supplierId != null) {
      try {
        if (contactDialog?.mode === "edit") {
          await patchSupplierContact(
            locale,
            supplierId,
            contactDialog.id,
            draftContact
          );
        } else {
          await createSupplierContact(locale, supplierId, draftContact);
        }
        toast.success(tCrud("toast.saved"));
        setContactDialog(null);
        void loadDetail({ keepUi: true });
      } catch (e) {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }
      return;
    }
    if (contactDialog?.mode === "edit") {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactDialog.id
            ? {
                ...c,
                name: draftContact.name,
                email: draftContact.email ?? null,
                tel: draftContact.tel ?? null,
                position: draftContact.position ?? null,
              }
            : c
        )
      );
    } else {
      const id = -Date.now();
      setContacts((prev) => [
        ...prev,
        {
          id,
          name: draftContact.name,
          email: draftContact.email ?? null,
          tel: draftContact.tel ?? null,
          position: draftContact.position ?? null,
          sort_order: (prev.length + 1) * 100,
          _draft: true,
        },
      ]);
    }
    setContactDialog(null);
    toast.success(tCrud("toast.saved"));
  };

  const removeContact = async (row: DraftContact) => {
    if (isEdit && supplierId != null && !row._draft) {
      try {
        await deleteSupplierContact(locale, supplierId, row.id);
        toast.success(tCrud("toast.deleted"));
        void loadDetail({ keepUi: true });
      } catch (e) {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== row.id));
    toast.success(tCrud("toast.deleted"));
  };

  const openBankEdit = (row?: DraftBank) => {
    if (row) {
      setDraftBank({
        setting_bank_id: row.setting_bank_id,
        name: row.name,
        number: row.number,
        branch: row.branch ?? "",
        is_active: row.is_active,
        is_default: row.is_default,
      });
      setBankDialog({ mode: "edit", id: row.id });
    } else {
      setDraftBank({
        setting_bank_id: 0,
        name: "",
        number: "",
        branch: "",
        is_active: true,
        is_default: false,
      });
      setBankDialog({ mode: "create" });
    }
  };

  const saveBankDialog = async () => {
    if (
      !draftBank.name.trim() ||
      !draftBank.number.trim() ||
      !draftBank.setting_bank_id
    ) {
      toast.error(tError("required"));
      return;
    }
    if (isEdit && supplierId != null) {
      try {
        if (bankDialog?.mode === "edit") {
          await patchSupplierBank(locale, supplierId, bankDialog.id, draftBank);
        } else {
          await createSupplierBank(locale, supplierId, draftBank);
        }
        toast.success(tCrud("toast.saved"));
        setBankDialog(null);
        void loadDetail({ keepUi: true });
      } catch (e) {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }
      return;
    }
    if (bankDialog?.mode === "edit") {
      setBanks((prev) =>
        prev.map((b) =>
          b.id === bankDialog.id
            ? {
                ...b,
                ...draftBank,
                branch: draftBank.branch ?? null,
              }
            : b
        )
      );
    } else {
      const id = -Date.now();
      setBanks((prev) => [
        ...prev,
        {
          id,
          setting_bank_id: draftBank.setting_bank_id,
          name: draftBank.name,
          number: draftBank.number,
          branch: draftBank.branch ?? null,
          is_active: draftBank.is_active ?? true,
          is_default: draftBank.is_default ?? false,
          sort_order: (prev.length + 1) * 100,
          _draft: true,
        },
      ]);
    }
    setBankDialog(null);
    toast.success(tCrud("toast.saved"));
  };

  const removeBank = async (row: DraftBank) => {
    if (isEdit && supplierId != null && !row._draft) {
      try {
        await deleteSupplierBank(locale, supplierId, row.id);
        toast.success(tCrud("toast.deleted"));
        void loadDetail({ keepUi: true });
      } catch (e) {
        toast.error(
          e instanceof SupplierUserApiError ? e.message : t("error.generic")
        );
      }
      return;
    }
    setBanks((prev) => prev.filter((b) => b.id !== row.id));
    toast.success(tCrud("toast.deleted"));
  };

  const renderInfoBlock = (
    title: string,
    block: InfoState,
    setBlock: (v: InfoState) => void,
    opts: InfoBlockRenderOpts
  ) => {
    const disabled = opts.disabled ?? false;
    const prefix = opts.prefix;
    const showPrefix = opts.showPrefix ?? true;
    const showTax = opts.showTax ?? true;
    const showBranch = opts.showBranch ?? true;
    const showContactFields = opts.showContactFields ?? true;
    const nameLabelKey = opts.nameLabelKey ?? "col.companyName";
    const set = (patch: Partial<InfoState>) =>
      setBlock({ ...block, ...patch });
    const hideBody = opts.headerSwitch?.checked === true;
    return (
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{title}</FormCardTitle>
          {opts.headerSwitch ? (
            <FormCardAction>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`${prefix}-same-switch`}
                  className="text-sm font-medium"
                >
                  {opts.headerSwitch.label}
                </Label>
                <Switch
                  id={`${prefix}-same-switch`}
                  checked={opts.headerSwitch.checked}
                  onCheckedChange={opts.headerSwitch.onCheckedChange}
                />
              </div>
            </FormCardAction>
          ) : null}
        </FormCardHeader>
        {hideBody ? null : (
        <FormCardContent className="grid gap-4 md:grid-cols-2">
          {showPrefix ? (
            <LabeledRemoteCombobox
              fieldId={`${prefix}-prefix`}
              labelText={tCol("prefix")}
              value={block.setting_prefix_id}
              inputClassName="w-full"
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", {
                label: tCol("prefix"),
              })}
              disabled={disabled}
              onValueChange={(v) => set({ setting_prefix_id: v })}
              onLoadOptions={async ({ search, signal }) => {
                const { items } = await fetchSettingLangList(
                  locale,
                  "prefixes",
                  {
                    page: 1,
                    limit: 50,
                    search,
                    isCompany: true,
                    isActive: true,
                  }
                );
                if (signal?.aborted) return [];
                return items.map((i) => ({
                  value: String(i.id),
                  label: i.name,
                }));
              }}
              resolveSelectedLabel={async (value) => {
                const item = await fetchSettingLangById(
                  locale,
                  "prefixes",
                  Number(value)
                );
                return item.name;
              }}
            />
          ) : null}
          <FormField
            id={`${prefix}-company-name`}
            labelKey={nameLabelKey}
            required={opts.requireName}
            invalid={!!(fieldErrors.contact_name && opts.requireName)}
            onClearInvalid={() =>
              setFieldErrors((e) => ({ ...e, contact_name: false }))
            }
            className={showPrefix ? undefined : "md:col-span-2"}
            value={block.name}
            onChange={(v) => set({ name: v })}
            readOnly={disabled}
          />
          {showTax ? (
            <div className="md:col-span-2">
              <TaxNumberOtpField
                id={`${prefix}-tax`}
                label={tCol("taxNumber")}
                value={block.tax_number}
                disabled={disabled}
                onChange={(v) => set({ tax_number: v })}
              />
            </div>
          ) : null}
          {showBranch ? (
            <Field className="md:col-span-2 gap-1.5">
              <FieldLabel>{tCol("branch")}</FieldLabel>
              <div className="flex flex-wrap items-center gap-4">
                <RadioGroup
                  value={block.branch || ""}
                  onValueChange={(v) =>
                    set({ branch: v as InfoState["branch"] })
                  }
                  className="flex flex-wrap gap-4"
                  disabled={disabled}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="headquarter" id={`${prefix}-hq`} />
                    <Label htmlFor={`${prefix}-hq`}>
                      {tSupplier("branchHeadquarter")}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="branch" id={`${prefix}-br`} />
                    <Label htmlFor={`${prefix}-br`}>
                      {tSupplier("branchOffice")}
                    </Label>
                  </div>
                </RadioGroup>
                {block.branch === "branch" ? (
                  <Input
                    id={`${prefix}-branch-name`}
                    value={block.branch_name}
                    disabled={disabled}
                    placeholder={tForm("placeholder.input", {
                      label: tCol("branchName"),
                    })}
                    onChange={(e) => set({ branch_name: e.target.value })}
                    className="min-w-[10rem] flex-1"
                  />
                ) : null}
              </div>
            </Field>
          ) : null}
          <Field className="md:col-span-2 gap-1.5">
            <FieldLabel htmlFor={`${prefix}-address`}>{tCol("address")}</FieldLabel>
            <Textarea
              id={`${prefix}-address`}
              value={block.address}
              disabled={disabled}
              placeholder={tForm("placeholder.input", { label: tCol("address") })}
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
            <LabeledRemoteCombobox
              fieldId={`${prefix}-province`}
              labelText={tCol("province")}
              value={block.website_province_id}
              inputClassName="w-full"
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", {
                label: tCol("province"),
              })}
              disabled={disabled}
              onValueChange={(v) =>
                set({
                  website_province_id: v,
                  website_district_id: "",
                  website_sub_district_id: "",
                })
              }
              onLoadOptions={({ search, signal }) =>
                loadGeoComboboxOptions("provinces", locale, { search, signal })
              }
              resolveSelectedLabel={(value) =>
                resolveGeoComboboxLabel("provinces", locale, value)
              }
            />
            <LabeledRemoteCombobox
              fieldId={`${prefix}-district`}
              labelText={tCol("district")}
              value={block.website_district_id}
              inputClassName="w-full"
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", {
                label: tCol("district"),
              })}
              disabled={disabled || !block.website_province_id}
              onValueChange={(v) =>
                set({ website_district_id: v, website_sub_district_id: "" })
              }
              onLoadOptions={({ search, signal }) =>
                loadGeoComboboxOptions("districts", locale, {
                  search,
                  signal,
                  systemProvinceId: Number(block.website_province_id),
                })
              }
              resolveSelectedLabel={(value) =>
                resolveGeoComboboxLabel("districts", locale, value)
              }
            />
            <LabeledRemoteCombobox
              fieldId={`${prefix}-sub-district`}
              labelText={tCol("subDistrict")}
              value={block.website_sub_district_id}
              inputClassName="w-full"
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", {
                label: tCol("subDistrict"),
              })}
              disabled={disabled || !block.website_district_id}
              onValueChange={(v) => set({ website_sub_district_id: v })}
              onLoadOptions={({ search, signal }) =>
                loadGeoComboboxOptions("sub-districts", locale, {
                  search,
                  signal,
                  systemDistrictId: Number(block.website_district_id),
                })
              }
              resolveSelectedLabel={(value) =>
                resolveGeoComboboxLabel("sub-districts", locale, value)
              }
            />
            <FormField
              id={`${prefix}-postcode`}
              labelKey="col.postcode"
              value={block.postcode}
              onChange={(v) => set({ postcode: v })}
              readOnly={disabled}
            />
          </div>
          {showContactFields ? (
            <>
              <FormField
                id={`${prefix}-tel`}
                labelKey="col.tel"
                type="tel"
                value={block.tel}
                onChange={(v) => set({ tel: v.replace(/[^0-9-]/g, "") })}
                readOnly={disabled}
              />
              <FormField
                id={`${prefix}-email`}
                labelKey="col.email"
                type="email"
                value={block.email}
                onChange={(v) => set({ email: v })}
                readOnly={disabled}
              />
            </>
          ) : null}
        </FormCardContent>
        )}
      </FormCard>
    );
  };

  if (loading) {
    return <CrudTabbedFormPageSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 pb-20">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SupplierFormTab)}
          className="w-full"
        >
        <TabsList variant="line">
          <TabsTrigger value="general">{tSupplier("tabGeneral")}</TabsTrigger>
          <TabsTrigger value="contacts">{tSupplier("tabContacts")}</TabsTrigger>
          <TabsTrigger value="financial">{tSupplier("tabFinancial")}</TabsTrigger>
        </TabsList>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start">
          <div className="min-w-0 flex flex-col gap-4">
            <TabsContent value="general" className="mt-0 flex flex-col gap-4">
          {renderInfoBlock(tSupplier("contactInfo"), contactInfo, setContactInfo, {
            requireName: true,
            prefix: "contact",
          })}

          {renderInfoBlock(tSupplier("taxInvoiceInfo"), taxInfo, setTaxInfo, {
            disabled: taxSame,
            prefix: "tax",
            headerSwitch: {
              checked: taxSame,
              onCheckedChange: setTaxSame,
              label: tSupplier("invoiceSameAsContact"),
            },
          })}

          {renderInfoBlock(
            tSupplier("deliveryInfo"),
            deliveryInfo,
            setDeliveryInfo,
            {
              prefix: "delivery",
              showPrefix: false,
              showTax: false,
              showBranch: false,
              showContactFields: false,
              nameLabelKey: "col.recipientName",
            }
          )}
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <SupplierContactList
                contacts={contacts}
                isEdit={isEdit}
                locale={locale}
                supplierId={supplierId}
                canManage={isEdit ? perms.update : perms.create}
                canDelete={isEdit ? perms.delete : perms.create}
                onAdd={() => openContactEdit()}
                onEdit={(row) => openContactEdit(row)}
                onDelete={(row) => void removeContact(row)}
                onContactsChange={setContacts}
                onReload={() => void loadDetail({ keepUi: true })}
              />
            </TabsContent>

            <TabsContent value="financial" className="mt-0 flex flex-col gap-4">
              <FormCard>
                <FormCardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="supplier-credit-term"
                    labelKey="col.creditTerm"
                    type="number"
                    value={creditTerm}
                    onChange={setCreditTerm}
                  />
                  <FormField
                    id="supplier-credit-note"
                    labelKey="col.creditTermNote"
                    value={creditTermNote}
                    onChange={setCreditTermNote}
                  />
                </FormCardContent>
              </FormCard>
              <SupplierBankList
                banks={banks}
                isEdit={isEdit}
                locale={locale}
                supplierId={supplierId}
                canManage={isEdit ? perms.update : perms.create}
                canDelete={isEdit ? perms.delete : perms.create}
                onAdd={() => openBankEdit()}
                onEdit={(row) => openBankEdit(row)}
                onDelete={(row) => void removeBank(row)}
                onBanksChange={setBanks}
                onReload={() => void loadDetail({ keepUi: true })}
              />
            </TabsContent>
          </div>

          <aside className="min-w-0">
            <FormCard>
              <FormCardContent className="flex flex-col gap-4">
                <FormField
                  id="supplier-sku"
                  labelKey="col.sku"
                  required
                  invalid={fieldErrors.sku}
                  onClearInvalid={() =>
                    setFieldErrors((e) => ({ ...e, sku: false }))
                  }
                  value={sku}
                  onChange={setSku}
                />
                <StatusSwitchField
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  labelKey="col.status"
                />
              </FormCardContent>
            </FormCard>
          </aside>
        </div>
        </Tabs>
      </div>

      <div
        className={cn(
          "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
          footerInsetLeft ? "left-[var(--sidebar-width)]" : "left-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-crud-page justify-end gap-2 px-admin-content py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/supplier")}
          >
            {isEdit ? tCrud("btn.cancel") : tCrud("btn.back")}
          </Button>
          {canSave ? (
            <Button
              type="button"
              size="lg"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {tCrud("btn.save")}
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={contactDialog != null}
        onOpenChange={(open) => !open && setContactDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSupplier("editContact")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField
              id="contact-dialog-name"
              labelKey="col.name"
              required
              value={draftContact.name}
              onChange={(v) => setDraftContact((d) => ({ ...d, name: v }))}
            />
            <FormField
              id="contact-dialog-email"
              labelKey="col.email"
              type="email"
              value={draftContact.email ?? ""}
              onChange={(v) => setDraftContact((d) => ({ ...d, email: v }))}
            />
            <FormField
              id="contact-dialog-tel"
              labelKey="col.tel"
              type="tel"
              value={draftContact.tel ?? ""}
              onChange={(v) =>
                setDraftContact((d) => ({
                  ...d,
                  tel: v.replace(/[^0-9-]/g, ""),
                }))
              }
            />
            <FormField
              id="contact-dialog-position"
              labelKey="col.position"
              value={draftContact.position ?? ""}
              onChange={(v) => setDraftContact((d) => ({ ...d, position: v }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setContactDialog(null)}>
              {tCrud("btn.cancel")}
            </Button>
            <Button size="lg" onClick={() => void saveContactDialog()}>
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bankDialog != null}
        onOpenChange={(open) => !open && setBankDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tSupplier("editBank")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <RemoteComboboxField
              id="bank-dialog-bank"
              label={tCol("bank")}
              value={
                draftBank.setting_bank_id
                  ? String(draftBank.setting_bank_id)
                  : ""
              }
              inputClassName="w-full"
              emptyLabel={tForm("combobox.noResults")}
              placeholder={tForm("placeholder.select", { label: tCol("bank") })}
              onValueChange={(v) =>
                setDraftBank((d) => ({
                  ...d,
                  setting_bank_id: Number(v),
                }))
              }
              onLoadOptions={async ({ search, signal }) => {
                const { items } = await fetchSettingLangList(locale, "banks", {
                  page: 1,
                  limit: 50,
                  search,
                  isActive: true,
                });
                if (signal?.aborted) return [];
                return items.map((i) => ({ value: String(i.id), label: i.name }));
              }}
              resolveSelectedLabel={async (value) => {
                const item = await fetchSettingLangById(
                  locale,
                  "banks",
                  Number(value)
                );
                return item.name;
              }}
            />
            <FormField
              id="bank-dialog-name"
              labelKey="supplier.bankAccountName"
              required
              value={draftBank.name}
              onChange={(v) => setDraftBank((d) => ({ ...d, name: v }))}
            />
            <FormField
              id="bank-dialog-number"
              labelKey="supplier.bankAccountNumber"
              required
              value={draftBank.number}
              onChange={(v) => setDraftBank((d) => ({ ...d, number: v }))}
            />
            <FormField
              id="bank-dialog-branch"
              labelKey="supplier.bankBranch"
              value={draftBank.branch ?? ""}
              onChange={(v) => setDraftBank((d) => ({ ...d, branch: v }))}
            />
            <div className="flex flex-col gap-3">
              <StatusSwitchField
                className="w-full"
                checked={draftBank.is_active ?? true}
                onCheckedChange={(v) =>
                  setDraftBank((d) => ({ ...d, is_active: v }))
                }
                labelKey="col.active"
              />
              <StatusSwitchField
                className="w-full"
                checked={draftBank.is_default ?? false}
                onCheckedChange={(v) =>
                  setDraftBank((d) => ({ ...d, is_default: v }))
                }
                labelKey="col.default"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setBankDialog(null)}>
              {tCrud("btn.cancel")}
            </Button>
            <Button size="lg" onClick={() => void saveBankDialog()}>
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
