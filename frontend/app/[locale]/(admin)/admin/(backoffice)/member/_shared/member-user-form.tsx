"use client";

import {
  ClipboardList,
  FileText,
  Star,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Fragment,
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { CrudTabbedFormPageSkeleton } from "@/components/molecules/crud-tabbed-form-page-skeleton";
import {
  FormCard,
  FormCardAction,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  createMemberUser,
  fetchMemberUser,
  MemberUserApiError,
  patchMemberUser,
  type MemberAddressInput,
  type MemberUserDetail,
  type MemberUserDiscountRow,
  type MemberUserFileRow,
  type MemberUserHistoryRow,
} from "@/lib/member-user-api";
import {
  loadMemberUserAdminOptions,
  loadMemberUserBusinessFilterOptions,
  loadMemberUserPrefixOptions,
  loadMemberUserTierOptions,
  fetchMemberUserBusinessRelations,
  fetchMemberUserSettingRelationById,
} from "@/lib/member-user-filters-combobox";
import {
  creditOptionsFromRelations,
  filterOptionsBySearch,
  groupOptionsFromRelations,
  hydrateProfileFromRelationRows,
  pruneGroupIds,
  resolveSettingRelationIds,
  type MemberBusinessRelationRow,
} from "@/lib/member-user-relations";
import {
  loadGeoComboboxOptions,
  resolveGeoComboboxLabel,
} from "@/lib/system-geo-combobox";
import {
  fetchSystemFile,
  resolveSettingLogoFileId,
  type ImageUploadItem,
} from "@/lib/system-file-api";

import { MemberUserFormDiscountsTab } from "./member-user-form-discounts-tab";
import { MemberUserFormEditAside } from "./member-user-form-edit-aside";
import { MemberUserFormEditHeader } from "./member-user-form-edit-header";
import { MemberUserFormFilesTab } from "./member-user-form-files-tab";
import { MemberUserFormOrdersTab } from "./member-user-form-orders-tab";

const AVATAR_PURPOSE = "member_avatar";
const TAX_OTP_GROUPS = [1, 4, 5, 2, 1] as const;

type MemberFormTab = "info" | "orders" | "discounts" | "files";

type GeoState = {
  website_province_id: string;
  website_province_name: string;
  website_district_id: string;
  website_district_name: string;
  website_sub_district_id: string;
  website_sub_district_name: string;
  postcode: string;
};

type GeneralState = GeoState & {
  memberType: "person" | "company";
  setting_prefix_id: string;
  setting_prefix_name: string;
  name: string;
  store_name: string;
  tax_number: string;
  branch: "" | "headquarter" | "branch";
  branch_name: string;
  address: string;
  tel: string;
  email: string;
};

type FinancialState = GeoState & {
  name: string;
  address: string;
  tel: string;
  credit_limit: string;
  credit_date: string;
  relationship: string;
};

type DocumentState = GeoState & {
  name: string;
  address: string;
  tel: string;
  email: string;
};

const emptyGeo = (): GeoState => ({
  website_province_id: "",
  website_province_name: "",
  website_district_id: "",
  website_district_name: "",
  website_sub_district_id: "",
  website_sub_district_name: "",
  postcode: "",
});

const emptyGeneral = (): GeneralState => ({
  memberType: "person",
  setting_prefix_id: "",
  setting_prefix_name: "",
  name: "",
  store_name: "",
  tax_number: "",
  branch: "",
  branch_name: "",
  address: "",
  tel: "",
  email: "",
  ...emptyGeo(),
});

const emptyFinancial = (): FinancialState => ({
  name: "",
  address: "",
  tel: "",
  credit_limit: "",
  credit_date: "",
  relationship: "",
  ...emptyGeo(),
});

const emptyDocument = (): DocumentState => ({
  name: "",
  address: "",
  tel: "",
  email: "",
  ...emptyGeo(),
});

function comboboxPinned(value: string, label: string) {
  if (!value) return [];
  const trimmed = label.trim();
  if (!trimmed) return [];
  return [{ value, label: trimmed }];
}

function taxDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 13);
}

function TaxNumberOtpField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const tErr = useTranslations("error");
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
    <Field className="gap-1.5" data-invalid={invalid ? true : undefined}>
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
      {invalid ? (
        <FieldError id={`${id}-error`}>{tErr("required")}</FieldError>
      ) : null}
    </Field>
  );
}

function FieldLabelRequired({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      <span className="text-[#dc2626]" aria-hidden="true">
        {" "}
        *
      </span>
    </FieldLabel>
  );
}

function LabeledRemoteCombobox({
  fieldId,
  labelText,
  required,
  invalid,
  ...rest
}: {
  fieldId: string;
  labelText: string;
  required?: boolean;
  invalid?: boolean;
} & Omit<ComponentProps<typeof RemoteComboboxField>, "id" | "label">) {
  return (
    <Field className="gap-1.5" data-invalid={invalid ? true : undefined}>
      {required ? (
        <FieldLabelRequired htmlFor={fieldId}>{labelText}</FieldLabelRequired>
      ) : (
        <FieldLabel htmlFor={fieldId}>{labelText}</FieldLabel>
      )}
      <RemoteComboboxField
        id={fieldId}
        label={labelText}
        invalid={invalid}
        {...rest}
      />
    </Field>
  );
}

function generalFromDetail(d: MemberUserDetail): GeneralState {
  return {
    memberType: d.type === "company" ? "company" : "person",
    setting_prefix_id:
      d.setting_prefix_id != null ? String(d.setting_prefix_id) : "",
    setting_prefix_name: "",
    name: d.name ?? "",
    store_name: d.store_name ?? "",
    tax_number: d.tax_number ?? "",
    branch: (d.branch as GeneralState["branch"]) ?? "",
    branch_name: d.branch_name ?? "",
    address: d.address ?? "",
    website_province_id:
      d.website_province_id != null ? String(d.website_province_id) : "",
    website_province_name: "",
    website_district_id:
      d.website_district_id != null ? String(d.website_district_id) : "",
    website_district_name: "",
    website_sub_district_id:
      d.website_sub_district_id != null
        ? String(d.website_sub_district_id)
        : "",
    website_sub_district_name: "",
    postcode: d.postcode ?? "",
    tel: d.tel ?? "",
    email: d.email ?? "",
  };
}

function taxFromAddress(addr?: MemberAddressInput): GeneralState {
  const base = emptyGeneral();
  if (!addr) return base;
  return {
    ...base,
    memberType: addr.member_type === "company" ? "company" : "person",
    setting_prefix_id:
      addr.setting_prefix_id != null ? String(addr.setting_prefix_id) : "",
    name: addr.name ?? "",
    store_name: addr.store_name ?? "",
    tax_number: addr.tax_number ?? "",
    branch: (addr.branch as GeneralState["branch"]) ?? "",
    branch_name: addr.branch_name ?? "",
    address: addr.address ?? "",
    website_province_id:
      addr.website_province_id != null ? String(addr.website_province_id) : "",
    website_district_id:
      addr.website_district_id != null ? String(addr.website_district_id) : "",
    website_sub_district_id:
      addr.website_sub_district_id != null
        ? String(addr.website_sub_district_id)
        : "",
    postcode: addr.postcode ?? "",
    tel: addr.tel ?? "",
    email: addr.email ?? "",
  };
}

function financialFromAddress(addr?: MemberAddressInput): FinancialState {
  const base = emptyFinancial();
  if (!addr) return base;
  return {
    ...base,
    name: addr.name ?? "",
    address: addr.address ?? "",
    tel: addr.tel ?? "",
    credit_limit:
      addr.credit_limit != null ? String(addr.credit_limit) : "",
    credit_date: addr.credit_date != null ? String(addr.credit_date) : "",
    relationship: addr.relationship ?? "",
    website_province_id:
      addr.website_province_id != null ? String(addr.website_province_id) : "",
    website_district_id:
      addr.website_district_id != null ? String(addr.website_district_id) : "",
    website_sub_district_id:
      addr.website_sub_district_id != null
        ? String(addr.website_sub_district_id)
        : "",
    postcode: addr.postcode ?? "",
  };
}

function documentFromAddress(addr?: MemberAddressInput): DocumentState {
  const base = emptyDocument();
  if (!addr) return base;
  return {
    ...base,
    name: addr.name ?? "",
    address: addr.address ?? "",
    tel: addr.tel ?? "",
    email: addr.email ?? "",
    website_province_id:
      addr.website_province_id != null ? String(addr.website_province_id) : "",
    website_district_id:
      addr.website_district_id != null ? String(addr.website_district_id) : "",
    website_sub_district_id:
      addr.website_sub_district_id != null
        ? String(addr.website_sub_district_id)
        : "",
    postcode: addr.postcode ?? "",
  };
}

function generalToMainBody(g: GeneralState) {
  return {
    type: g.memberType,
    setting_prefix_id: g.setting_prefix_id
      ? Number(g.setting_prefix_id)
      : null,
    name: g.name.trim(),
    store_name: g.store_name.trim() || null,
    tax_number: g.tax_number.trim() || null,
    branch: g.branch || null,
    branch_name: g.branch_name.trim() || null,
    address: g.address.trim() || null,
    website_province_id: g.website_province_id
      ? Number(g.website_province_id)
      : null,
    website_district_id: g.website_district_id
      ? Number(g.website_district_id)
      : null,
    website_sub_district_id: g.website_sub_district_id
      ? Number(g.website_sub_district_id)
      : null,
    postcode: g.postcode.trim() || null,
    tel: g.tel.trim() || null,
    email: g.email.trim() || null,
  };
}

function generalToTaxAddress(
  g: GeneralState,
  isSame: boolean
): MemberAddressInput {
  return {
    type: "tax",
    member_type: g.memberType,
    setting_prefix_id: g.setting_prefix_id
      ? Number(g.setting_prefix_id)
      : null,
    name: g.name.trim() || null,
    store_name: g.store_name.trim() || null,
    tax_number: g.tax_number.trim() || null,
    branch: g.branch || null,
    branch_name: g.branch_name.trim() || null,
    address: g.address.trim() || null,
    website_province_id: g.website_province_id
      ? Number(g.website_province_id)
      : null,
    website_district_id: g.website_district_id
      ? Number(g.website_district_id)
      : null,
    website_sub_district_id: g.website_sub_district_id
      ? Number(g.website_sub_district_id)
      : null,
    postcode: g.postcode.trim() || null,
    tel: g.tel.trim() || null,
    email: g.email.trim() || null,
    is_same_information: isSame,
  };
}

function documentToAddress(d: DocumentState, isSame: boolean): MemberAddressInput {
  return {
    type: "doc",
    name: d.name.trim() || null,
    address: d.address.trim() || null,
    tel: d.tel.trim() || null,
    email: d.email.trim() || null,
    website_province_id: d.website_province_id
      ? Number(d.website_province_id)
      : null,
    website_district_id: d.website_district_id
      ? Number(d.website_district_id)
      : null,
    website_sub_district_id: d.website_sub_district_id
      ? Number(d.website_sub_district_id)
      : null,
    postcode: d.postcode.trim() || null,
    is_same_information: isSame,
  };
}

function financialToAddress(f: FinancialState): MemberAddressInput {
  return {
    type: "financial",
    name: f.name.trim() || null,
    address: f.address.trim() || null,
    tel: f.tel.trim() || null,
    credit_limit: f.credit_limit.trim() ? Number(f.credit_limit) : null,
    credit_date: f.credit_date.trim() ? Number(f.credit_date) : null,
    relationship: f.relationship.trim() || null,
    website_province_id: f.website_province_id
      ? Number(f.website_province_id)
      : null,
    website_district_id: f.website_district_id
      ? Number(f.website_district_id)
      : null,
    website_sub_district_id: f.website_sub_district_id
      ? Number(f.website_sub_district_id)
      : null,
    postcode: f.postcode.trim() || null,
  };
}

function copyGeneral(src: GeneralState): GeneralState {
  return { ...src };
}

function copyDocumentFromGeneral(g: GeneralState): DocumentState {
  return {
    name: g.name,
    address: g.address,
    tel: g.tel,
    email: g.email,
    website_province_id: g.website_province_id,
    website_province_name: g.website_province_name,
    website_district_id: g.website_district_id,
    website_district_name: g.website_district_name,
    website_sub_district_id: g.website_sub_district_id,
    website_sub_district_name: g.website_sub_district_name,
    postcode: g.postcode,
  };
}

export type MemberUserFormProps = {
  editId?: number;
};

export function MemberUserForm({ editId }: MemberUserFormProps) {
  const isEdit = editId != null && editId > 0;
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tErr = useTranslations("error");
  const perms = useResourcePermissions("member", "member_user");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<MemberFormTab>("info");
  const [sku, setSku] = useState("");
  const [general, setGeneral] = useState(emptyGeneral);
  const [taxInfo, setTaxInfo] = useState(emptyGeneral);
  const [taxSame, setTaxSame] = useState(false);
  const [financial, setFinancial] = useState(emptyFinancial);
  const [documentInfo, setDocumentInfo] = useState(emptyDocument);
  const [docSame, setDocSame] = useState(false);
  const [memberTierId, setMemberTierId] = useState("");
  const [memberTierName, setMemberTierName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [creditIds, setCreditIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [businessRelations, setBusinessRelations] = useState<
    MemberBusinessRelationRow[]
  >([]);
  const [ownerAdminUserIds, setOwnerAdminUserIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [avatarItems, setAvatarItems] = useState<ImageUploadItem[]>([]);
  const [initialFileId, setInitialFileId] = useState<number | null>(null);
  const [discounts, setDiscounts] = useState<MemberUserDiscountRow[]>([]);
  const [files, setFiles] = useState<MemberUserFileRow[]>([]);
  const [histories, setHistories] = useState<MemberUserHistoryRow[]>([]);
  const [createdAt, setCreatedAt] = useState("");
  const [staffLabels, setStaffLabels] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const canSave = isEdit ? perms.update : perms.create;
  const formReadOnly = isEdit && !canSave;

  const loadDetail = useCallback(async () => {
    if (!isEdit || editId == null) return;
    setLoading(true);
    try {
      const d = await fetchMemberUser(locale, editId);
      setSku(d.sku ?? "");
      setGeneral(generalFromDetail(d));
      const taxAddr = d.addresses.find((a) => a.type === "tax");
      const finAddr = d.addresses.find((a) => a.type === "financial");
      const docAddr = d.addresses.find((a) => a.type === "doc");
      setTaxInfo(taxFromAddress(taxAddr));
      setTaxSame(taxAddr?.is_same_information ?? false);
      setFinancial(financialFromAddress(finAddr));
      setDocumentInfo(documentFromAddress(docAddr));
      setDocSame(docAddr?.is_same_information ?? false);
      setMemberTierId(d.member_tier_id != null ? String(d.member_tier_id) : "");
      setMemberTierName("");
      const relationIds = d.setting_relation_ids ?? [];
      const relRows = (
        await Promise.all(
          relationIds.map((id) =>
            fetchMemberUserSettingRelationById(locale, id)
          )
        )
      ).filter((row): row is NonNullable<typeof row> => row != null);
      const profile = hydrateProfileFromRelationRows(relRows);
      setBusinessId(profile.businessId);
      setCreditIds(profile.creditIds);
      setGroupIds(profile.groupIds);
      if (profile.businessId) {
        const bizNum = Number(profile.businessId);
        const rels = await fetchMemberUserBusinessRelations(locale, bizNum);
        setBusinessRelations(rels);
        const { options } = await loadMemberUserBusinessFilterOptions(
          locale,
          "",
          1,
          bizNum
        );
        setBusinessName(options[0]?.label ?? "");
      } else {
        setBusinessRelations([]);
        setBusinessName("");
      }
      setOwnerAdminUserIds((d.owner_admin_user_ids ?? []).map(String));
      setNote(d.note ?? "");
      setIsActive(d.is_active);
      setDiscounts(d.discounts);
      setFiles(d.files);
      setHistories(d.histories ?? []);
      setCreatedAt(d.created_at ?? "");
      setInitialFileId(d.system_file_id ?? null);
      if (d.system_file_id) {
        const file = await fetchSystemFile(locale, d.system_file_id);
        setAvatarItems([file]);
      } else {
        setAvatarItems([]);
      }
    } catch (e) {
      toast.error(
        e instanceof MemberUserApiError ? e.message : tErr("generic")
      );
    } finally {
      setLoading(false);
    }
  }, [isEdit, editId, locale, tErr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- edit fetch hydrates form state
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!memberTierId) {
      setMemberTierName("");
      return;
    }
    void loadMemberUserTierOptions(locale, "", 1, Number(memberTierId)).then(
      ({ options }) => {
        setMemberTierName(options[0]?.label ?? "");
      }
    );
  }, [memberTierId, locale]);

  useEffect(() => {
    if (ownerAdminUserIds.length === 0) {
      setStaffLabels({});
      return;
    }
    void Promise.all(
      ownerAdminUserIds.map(async (id) => {
        const { options } = await loadMemberUserAdminOptions(
          locale,
          "",
          1,
          Number(id)
        );
        return [id, options[0]?.label ?? id] as const;
      })
    ).then((pairs) => {
      setStaffLabels(Object.fromEntries(pairs));
    });
  }, [ownerAdminUserIds, locale]);

  const addressesPayload = useMemo((): MemberAddressInput[] => {
    const tax = taxSame
      ? generalToTaxAddress(general, true)
      : generalToTaxAddress(taxInfo, false);
    const doc = docSame
      ? { ...documentToAddress(copyDocumentFromGeneral(general), true) }
      : documentToAddress(documentInfo, false);
    return [tax, doc, financialToAddress(financial)];
  }, [general, taxInfo, taxSame, documentInfo, docSame, financial]);

  useEffect(() => {
    if (!businessId) {
      setBusinessRelations([]);
      return;
    }
    let cancelled = false;
    void fetchMemberUserBusinessRelations(locale, Number(businessId))
      .then((rows) => {
        if (!cancelled) setBusinessRelations(rows);
      })
      .catch(() => {
        if (!cancelled) setBusinessRelations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, locale]);

  useEffect(() => {
    setGroupIds((prev) => pruneGroupIds(businessRelations, creditIds, prev));
  }, [creditIds, businessRelations]);

  const creditProfileOptions = useMemo(
    () => creditOptionsFromRelations(businessRelations),
    [businessRelations]
  );
  const groupProfileOptions = useMemo(
    () => groupOptionsFromRelations(businessRelations, creditIds),
    [businessRelations, creditIds]
  );

  const relationCatalogKey = useMemo(() => {
    if (!businessId) return "";
    const ids = [...businessRelations.map((r) => r.id)].sort((a, b) => a - b);
    return `${businessId}:${ids.join(",")}`;
  }, [businessId, businessRelations]);

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!businessId) errs.business = true;
    if (creditIds.length === 0) errs.credits = true;
    if (groupIds.length === 0) errs.groups = true;
    if (!general.name.trim()) errs.name = true;
    if (!general.tel.trim()) errs.tel = true;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = async () => {
    if (!canSave || !validate()) {
      toast.error(tErr("required"));
      return;
    }
    setSaving(true);
    try {
      const fileId = await resolveSettingLogoFileId(
        locale,
        AVATAR_PURPOSE,
        avatarItems,
        initialFileId
      );
      const relationIds = resolveSettingRelationIds(
        businessRelations,
        creditIds,
        groupIds
      );
      const body = {
        sku: sku.trim() || null,
        member_tier_id: memberTierId ? Number(memberTierId) : null,
        ...generalToMainBody(general),
        note: note.trim() || null,
        is_active: isActive,
        setting_relation_ids: relationIds,
        owner_admin_user_ids: ownerAdminUserIds.map(Number),
        addresses: addressesPayload,
        ...(fileId !== undefined ? { system_file_id: fileId } : {}),
      };
      if (isEdit && editId != null) {
        await patchMemberUser(locale, editId, body);
        toast.success(tCrud("toast.saved"));
        await loadDetail();
      } else {
        const created = await createMemberUser(locale, body);
        toast.success(tCrud("toast.created"));
        router.replace(`/admin/member/users/${created.id}`);
      }
    } catch (e) {
      toast.error(
        e instanceof MemberUserApiError ? e.message : tErr("generic")
      );
    } finally {
      setSaving(false);
    }
  };

  const renderGeoFields = (
    prefix: string,
    block: GeoState,
    setBlock: (patch: Partial<GeoState>) => void,
    disabled: boolean
  ) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-4">
      <LabeledRemoteCombobox
        fieldId={`${prefix}-province`}
        labelText={tCol("province")}
        value={block.website_province_id}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", { label: tCol("province") })}
        disabled={disabled}
        pinnedItems={comboboxPinned(
          block.website_province_id,
          block.website_province_name
        )}
        onValueChange={(v) =>
          setBlock({
            website_province_id: v,
            website_district_id: "",
            website_sub_district_id: "",
          })
        }
        onLoadOptions={({ search, signal }) =>
          loadGeoComboboxOptions("provinces", locale, { search, signal })
        }
        resolveSelectedLabel={
          formReadOnly
            ? undefined
            : (value) => resolveGeoComboboxLabel("provinces", locale, value)
        }
      />
      <LabeledRemoteCombobox
        fieldId={`${prefix}-district`}
        labelText={tCol("district")}
        value={block.website_district_id}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", { label: tCol("district") })}
        disabled={disabled || !block.website_province_id}
        pinnedItems={comboboxPinned(
          block.website_district_id,
          block.website_district_name
        )}
        onValueChange={(v) =>
          setBlock({ website_district_id: v, website_sub_district_id: "" })
        }
        onLoadOptions={({ search, signal }) =>
          loadGeoComboboxOptions("districts", locale, {
            search,
            signal,
            systemProvinceId: Number(block.website_province_id),
          })
        }
        resolveSelectedLabel={
          formReadOnly
            ? undefined
            : (value) => resolveGeoComboboxLabel("districts", locale, value)
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
        pinnedItems={comboboxPinned(
          block.website_sub_district_id,
          block.website_sub_district_name
        )}
        onValueChange={(v) => setBlock({ website_sub_district_id: v })}
        onLoadOptions={({ search, signal }) =>
          loadGeoComboboxOptions("sub-districts", locale, {
            search,
            signal,
            systemDistrictId: Number(block.website_district_id),
          })
        }
        resolveSelectedLabel={
          formReadOnly
            ? undefined
            : (value) =>
                resolveGeoComboboxLabel("sub-districts", locale, value)
        }
      />
      <FormField
        id={`${prefix}-postcode`}
        labelKey="col.postcode"
        value={block.postcode}
        onChange={(v) => setBlock({ postcode: v })}
        readOnly={disabled}
      />
    </div>
  );

  const renderGeneralBlock = (
    title: string,
    block: GeneralState,
    setBlock: (v: GeneralState) => void,
    opts: {
      disabled?: boolean;
      prefix: string;
      requireName?: boolean;
      requireTel?: boolean;
      headerSwitch?: {
        checked: boolean;
        onCheckedChange: (v: boolean) => void;
        label: string;
      };
    }
  ) => {
    const disabled = (opts.disabled ?? false) || formReadOnly;
    const isCompany = block.memberType === "company";
    const set = (patch: Partial<GeneralState>) =>
      setBlock({ ...block, ...patch });
    const hideBody = opts.headerSwitch?.checked === true;
    return (
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{title}</FormCardTitle>
          {opts.headerSwitch ? (
            <FormCardAction>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${opts.prefix}-same`} className="text-sm">
                  {opts.headerSwitch.label}
                </Label>
                <Switch
                  id={`${opts.prefix}-same`}
                  checked={opts.headerSwitch.checked}
                  onCheckedChange={opts.headerSwitch.onCheckedChange}
                  disabled={formReadOnly}
                />
              </div>
            </FormCardAction>
          ) : null}
        </FormCardHeader>
        {hideBody ? null : (
          <FormCardContent className="grid gap-4 md:grid-cols-2">
            <Field className="md:col-span-2 gap-1.5">
              <FieldLabel>{t("infoType")}</FieldLabel>
              <RadioGroup
                value={block.memberType}
                onValueChange={(v) => {
                  const next = v as "person" | "company";
                  if (next === block.memberType) return;
                  const patch: Partial<GeneralState> = {
                    memberType: next,
                    setting_prefix_id: "",
                    setting_prefix_name: "",
                  };
                  if (next === "company") {
                    patch.store_name = "";
                  } else {
                    patch.branch = "";
                    patch.branch_name = "";
                  }
                  set(patch);
                }}
                className="flex flex-wrap gap-4"
                disabled={disabled}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="person"
                    id={`${opts.prefix}-type-person`}
                  />
                  <Label htmlFor={`${opts.prefix}-type-person`}>
                    {t("person")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="company"
                    id={`${opts.prefix}-type-company`}
                  />
                  <Label htmlFor={`${opts.prefix}-type-company`}>
                    {t("company")}
                  </Label>
                </div>
              </RadioGroup>
            </Field>
            <div
              className={`md:col-span-2 grid grid-cols-1 gap-4 ${isCompany ? "md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,1fr)]"}`}
            >
              <LabeledRemoteCombobox
                key={`${opts.prefix}-prefix-${block.memberType}`}
                fieldId={`${opts.prefix}-prefix`}
                labelText={tCol("prefix")}
                value={block.setting_prefix_id}
                inputClassName="w-full"
                emptyLabel={tForm("combobox.noResults")}
                placeholder={tForm("placeholder.select", {
                  label: tCol("prefix"),
                })}
                disabled={disabled}
                pinnedItems={comboboxPinned(
                  block.setting_prefix_id,
                  block.setting_prefix_name
                )}
                onValueChange={(v) => set({ setting_prefix_id: v })}
                onLoadOptions={async ({ search }) => {
                  const { options } = await loadMemberUserPrefixOptions(
                    locale,
                    block.memberType,
                    search,
                    1,
                    block.setting_prefix_id
                      ? Number(block.setting_prefix_id)
                      : undefined
                  );
                  return options;
                }}
              />
              <FormField
                id={`${opts.prefix}-name`}
                labelKey="memberUser.customerName"
                required={opts.requireName}
                invalid={!!(fieldErrors.name && opts.requireName)}
                onClearInvalid={() =>
                  setFieldErrors((e) => ({ ...e, name: false }))
                }
                value={block.name}
                onChange={(v) => set({ name: v })}
                readOnly={disabled}
              />
              {!isCompany ? (
                <FormField
                  id={`${opts.prefix}-store`}
                  labelKey="memberUser.storeName"
                  value={block.store_name}
                  onChange={(v) => set({ store_name: v })}
                  readOnly={disabled}
                />
              ) : null}
            </div>
            <div className="md:col-span-2">
              <TaxNumberOtpField
                id={`${opts.prefix}-tax`}
                label={tCol("taxNumber")}
                value={block.tax_number}
                disabled={disabled}
                onChange={(v) => set({ tax_number: v })}
              />
            </div>
            {isCompany ? (
              <Field className="md:col-span-2 gap-1.5">
                <FieldLabel>{tCol("branch")}</FieldLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <RadioGroup
                    value={block.branch || ""}
                    onValueChange={(v) =>
                      set({ branch: v as GeneralState["branch"] })
                    }
                    className="flex flex-wrap gap-4"
                    disabled={disabled}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="headquarter"
                        id={`${opts.prefix}-hq`}
                      />
                      <Label htmlFor={`${opts.prefix}-hq`}>
                        {t("headquarter")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem
                        value="branch"
                        id={`${opts.prefix}-br`}
                      />
                      <Label htmlFor={`${opts.prefix}-br`}>
                        {tCol("branch")}
                      </Label>
                    </div>
                  </RadioGroup>
                  {block.branch === "branch" ? (
                    <Input
                      id={`${opts.prefix}-branch-name`}
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
              <FieldLabel htmlFor={`${opts.prefix}-address`}>
                {tCol("address")}
              </FieldLabel>
              <Textarea
                id={`${opts.prefix}-address`}
                value={block.address}
                disabled={disabled}
                placeholder={tForm("placeholder.input", {
                  label: tCol("address"),
                })}
                onChange={(e) => set({ address: e.target.value })}
              />
            </Field>
            {renderGeoFields(opts.prefix, block, set, disabled)}
            <FormField
              id={`${opts.prefix}-tel`}
              labelKey="col.tel"
              type="tel"
              required={opts.requireTel}
              invalid={!!(fieldErrors.tel && opts.requireTel)}
              onClearInvalid={() =>
                setFieldErrors((e) => ({ ...e, tel: false }))
              }
              value={block.tel}
              onChange={(v) => set({ tel: v.replace(/[^0-9-]/g, "") })}
              readOnly={disabled}
            />
            <FormField
              id={`${opts.prefix}-email`}
              labelKey="col.email"
              type="email"
              value={block.email}
              onChange={(v) => set({ email: v })}
              readOnly={disabled}
            />
          </FormCardContent>
        )}
      </FormCard>
    );
  };

  const sidebarPanel = (
    <aside className="flex min-w-0 w-full flex-col gap-4 lg:col-start-2 lg:self-start">
      <FormCard>
        <FormCardContent className="flex flex-col gap-4">
          <StatusSwitchField
            checked={isActive}
            onCheckedChange={setIsActive}
            labelKey="col.status"
            disabled={formReadOnly}
          />
          <RemoteMultiComboboxField
            id="mu-staff"
            label={t("adminUsers")}
            values={ownerAdminUserIds}
            onValuesChange={setOwnerAdminUserIds}
            placeholder={tForm("placeholder.select", {
              label: t("staff"),
            })}
            emptyLabel={tForm("combobox.noResults")}
            disabled={formReadOnly}
            onLoadOptions={async ({ search }) => {
              const { options } = await loadMemberUserAdminOptions(
                locale,
                search,
                1
              );
              return options;
            }}
            resolveSelectedLabels={async (vals) => {
              const out = await Promise.all(
                vals.map(async (v) => {
                  const { options } = await loadMemberUserAdminOptions(
                    locale,
                    "",
                    1,
                    Number(v)
                  );
                  return options[0] ?? { value: v, label: v };
                })
              );
              return out;
            }}
          />
          <Field className="gap-1.5">
            <FieldLabel htmlFor="mu-note">{tCol("note")}</FieldLabel>
            <Textarea
              id="mu-note"
              value={note}
              disabled={formReadOnly}
              placeholder={tForm("placeholder.input", { label: tCol("note") })}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </FormCardContent>
      </FormCard>
    </aside>
  );

  const memberProfileRow = (
    <div className="grid gap-3 lg:grid-cols-4">
      <LabeledRemoteCombobox
        fieldId="mu-business"
        labelText={t("business")}
        required
        invalid={!!fieldErrors.business}
        value={businessId}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", { label: t("business") })}
        disabled={formReadOnly}
        pinnedItems={comboboxPinned(businessId, businessName)}
        onValueChange={(v) => {
          setBusinessId(v);
          setBusinessRelations([]);
          void loadMemberUserBusinessFilterOptions(locale, "", 1, Number(v)).then(
            ({ options }) => {
              setBusinessName(options[0]?.label ?? "");
            }
          );
          setCreditIds([]);
          setGroupIds([]);
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.business;
            return next;
          });
        }}
        onLoadOptions={async ({ search, page }) => {
          const { options } = await loadMemberUserBusinessFilterOptions(
            locale,
            search,
            page ?? 1
          );
          return options;
        }}
        resolveSelectedLabel={
          formReadOnly
            ? undefined
            : async (value) => {
                const { options } = await loadMemberUserBusinessFilterOptions(
                  locale,
                  "",
                  1,
                  Number(value)
                );
                const label = options[0]?.label ?? null;
                if (label) setBusinessName(label);
                return label;
              }
        }
      />
      <RemoteMultiComboboxField
        id="mu-credits"
        label={t("creditType")}
        required
        invalid={!!fieldErrors.credits}
        catalogKey={relationCatalogKey}
        values={creditIds}
        onValuesChange={(vals) => {
          setCreditIds(vals);
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.credits;
            return next;
          });
        }}
        placeholder={tForm("placeholder.select", { label: t("creditType") })}
        emptyLabel={tForm("combobox.noResults")}
        disabled={formReadOnly || !businessId}
        onLoadOptions={async ({ search }) =>
          filterOptionsBySearch(creditProfileOptions, search)
        }
        resolveSelectedLabels={async (vals) =>
          vals.map(
            (v) =>
              creditProfileOptions.find((o) => o.value === v) ?? {
                value: v,
                label: v,
              }
          )
        }
      />
      <RemoteMultiComboboxField
        id="mu-groups"
        label={t("groupType")}
        required
        invalid={!!fieldErrors.groups}
        catalogKey={`${relationCatalogKey}:${creditIds.join(",")}`}
        values={groupIds}
        onValuesChange={(vals) => {
          setGroupIds(vals);
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.groups;
            return next;
          });
        }}
        placeholder={tForm("placeholder.select", { label: t("groupType") })}
        emptyLabel={tForm("combobox.noResults")}
        disabled={formReadOnly || creditIds.length === 0}
        onLoadOptions={async ({ search }) =>
          filterOptionsBySearch(groupProfileOptions, search)
        }
        resolveSelectedLabels={async (vals) =>
          vals.map(
            (v) =>
              groupProfileOptions.find((o) => o.value === v) ?? {
                value: v,
                label: v,
              }
          )
        }
      />
      <LabeledRemoteCombobox
        fieldId="mu-tier"
        labelText={t("memberTier")}
        value={memberTierId}
        inputClassName="w-full"
        emptyLabel={tForm("combobox.noResults")}
        placeholder={tForm("placeholder.select", {
          label: t("memberTier"),
        })}
        disabled={formReadOnly}
        pinnedItems={comboboxPinned(memberTierId, memberTierName)}
        onValueChange={setMemberTierId}
        onLoadOptions={async ({ search }) => {
          const { options } = await loadMemberUserTierOptions(
            locale,
            search,
            1,
            memberTierId ? Number(memberTierId) : undefined
          );
          return options;
        }}
      />
    </div>
  );

  const memberInfoCard = (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>{t("memberInfo")}</FormCardTitle>
      </FormCardHeader>
      <FormCardContent className="flex flex-col gap-4">
        {!isEdit ? (
          <ImageUploadField
            id="mu-avatar"
            labelKey="memberUser.uploadImage"
            purpose={AVATAR_PURPOSE}
            value={avatarItems}
            onChange={setAvatarItems}
            maxFiles={1}
            uploadTiming="deferred"
            showLabel
            disabled={formReadOnly || saving}
          />
        ) : null}
        {memberProfileRow}
      </FormCardContent>
    </FormCard>
  );

  const infoBlocks = (
    <>
      {renderGeneralBlock(t("generalInfo"), general, setGeneral, {
        prefix: "general",
        requireName: true,
        requireTel: true,
      })}
      {renderGeneralBlock(t("taxInfo"), taxInfo, setTaxInfo, {
        prefix: "tax",
        disabled: taxSame,
        headerSwitch: {
          checked: taxSame,
          onCheckedChange: (v) => {
            setTaxSame(v);
            if (v) setTaxInfo(copyGeneral(general));
          },
          label: t("sameAsGeneral"),
        },
      })}
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{t("financialInfo")}</FormCardTitle>
        </FormCardHeader>
        <FormCardContent className="grid gap-4 md:grid-cols-2">
          <FormField
            id="fin-credit-limit"
            labelKey="memberUser.creditLimit"
            type="number"
            value={financial.credit_limit}
            onChange={(v) => setFinancial({ ...financial, credit_limit: v })}
            readOnly={formReadOnly}
          />
          <FormField
            id="fin-credit-date"
            labelKey="memberUser.creditDate"
            type="number"
            value={financial.credit_date}
            onChange={(v) => setFinancial({ ...financial, credit_date: v })}
            readOnly={formReadOnly}
          />
          <FormField
            id="fin-name"
            labelKey="memberUser.guarantorName"
            className="md:col-span-2"
            value={financial.name}
            onChange={(v) => setFinancial({ ...financial, name: v })}
            readOnly={formReadOnly}
          />
          <Field className="md:col-span-2 gap-1.5">
            <FieldLabel htmlFor="fin-address">{tCol("address")}</FieldLabel>
            <Textarea
              id="fin-address"
              value={financial.address}
              disabled={formReadOnly}
              placeholder={tForm("placeholder.input", {
                label: tCol("address"),
              })}
              onChange={(e) =>
                setFinancial({ ...financial, address: e.target.value })
              }
            />
          </Field>
          {renderGeoFields(
            "fin",
            financial,
            (patch) => setFinancial({ ...financial, ...patch }),
            formReadOnly
          )}
          <FormField
            id="fin-tel"
            labelKey="col.tel"
            type="tel"
            value={financial.tel}
            onChange={(v) =>
              setFinancial({
                ...financial,
                tel: v.replace(/[^0-9-]/g, ""),
              })
            }
            readOnly={formReadOnly}
          />
          <FormField
            id="fin-relationship"
            labelKey="memberUser.relationship"
            value={financial.relationship}
            onChange={(v) => setFinancial({ ...financial, relationship: v })}
            readOnly={formReadOnly}
          />
        </FormCardContent>
      </FormCard>
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{t("documentInfo")}</FormCardTitle>
          <FormCardAction>
            <div className="flex items-center gap-2">
              <Label htmlFor="doc-same" className="text-sm">
                {t("sameAsGeneral")}
              </Label>
              <Switch
                id="doc-same"
                checked={docSame}
                onCheckedChange={(v) => {
                  setDocSame(v);
                  if (v) setDocumentInfo(copyDocumentFromGeneral(general));
                }}
                disabled={formReadOnly}
              />
            </div>
          </FormCardAction>
        </FormCardHeader>
        {docSame ? null : (
          <FormCardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              id="doc-name"
              labelKey="memberUser.contactName"
              className="md:col-span-2"
              value={documentInfo.name}
              onChange={(v) =>
                setDocumentInfo({ ...documentInfo, name: v })
              }
              readOnly={formReadOnly}
            />
            <Field className="md:col-span-2 gap-1.5">
              <FieldLabel htmlFor="doc-address">{tCol("address")}</FieldLabel>
              <Textarea
                id="doc-address"
                value={documentInfo.address}
                disabled={formReadOnly}
                placeholder={tForm("placeholder.input", {
                  label: tCol("address"),
                })}
                onChange={(e) =>
                  setDocumentInfo({
                    ...documentInfo,
                    address: e.target.value,
                  })
                }
              />
            </Field>
            {renderGeoFields(
              "doc",
              documentInfo,
              (patch) => setDocumentInfo({ ...documentInfo, ...patch }),
              formReadOnly
            )}
            <FormField
              id="doc-tel"
              labelKey="col.tel"
              type="tel"
              value={documentInfo.tel}
              onChange={(v) =>
                setDocumentInfo({
                  ...documentInfo,
                  tel: v.replace(/[^0-9-]/g, ""),
                })
              }
              readOnly={formReadOnly}
            />
            <FormField
              id="doc-email"
              labelKey="col.email"
              type="email"
              value={documentInfo.email}
              onChange={(v) =>
                setDocumentInfo({ ...documentInfo, email: v })
              }
              readOnly={formReadOnly}
            />
          </FormCardContent>
        )}
      </FormCard>
    </>
  );

  if (loading) {
    return (
      <CrudTabbedFormPageSkeleton
        leftCardCount={isEdit ? 4 : 3}
        showEditProfileHeader={isEdit}
        rightSidebarCards={isEdit ? 3 : undefined}
        showFixedFooter
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 pb-20">
        {!isEdit ? (
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
              {memberInfoCard}
              {infoBlocks}
            </div>
            {sidebarPanel}
          </div>
        ) : (
          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4 lg:col-start-1">
              {editId != null ? (
                <MemberUserFormEditHeader
                  userId={editId}
                  sku={sku}
                  displayName={general.name}
                  tel={general.tel}
                  email={general.email}
                  createdAt={createdAt}
                  memberTierName={memberTierName}
                  isActive={isActive}
                  canToggleStatus={perms.update}
                  onIsActiveChange={setIsActive}
                  avatarItems={avatarItems}
                  onAvatarChange={setAvatarItems}
                  avatarDisabled={formReadOnly || saving}
                  staffIds={ownerAdminUserIds}
                  staffLabels={staffLabels}
                  onStaffIdsChange={setOwnerAdminUserIds}
                  staffDisabled={formReadOnly}
                />
              ) : null}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as MemberFormTab)}
                className="w-full"
              >
                <TabsList variant="line">
                  <TabsTrigger value="info" className="gap-1.5">
                    <User className="size-4 shrink-0" aria-hidden />
                    {t("tabInfo")}
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="gap-1.5">
                    <ClipboardList className="size-4 shrink-0" aria-hidden />
                    {t("tabOrders")}
                  </TabsTrigger>
                  <TabsTrigger value="discounts" className="gap-1.5">
                    <Star className="size-4 shrink-0" aria-hidden />
                    {t("tabDiscounts")}
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-1.5">
                    <FileText className="size-4 shrink-0" aria-hidden />
                    {t("tabFiles")}
                  </TabsTrigger>
                </TabsList>
                <div className="mt-4 min-w-0 flex flex-col gap-4">
                  <TabsContent value="info" className="mt-0 flex flex-col gap-4">
                    {memberInfoCard}
                    {infoBlocks}
                  </TabsContent>
                  <TabsContent value="orders" className="mt-0">
                    <MemberUserFormOrdersTab />
                  </TabsContent>
                  <TabsContent value="discounts" className="mt-0">
                    {editId != null ? (
                      <MemberUserFormDiscountsTab
                        userId={editId}
                        discounts={discounts}
                        canManage={perms.update}
                        onReload={loadDetail}
                      />
                    ) : null}
                  </TabsContent>
                  <TabsContent value="files" className="mt-0">
                    {editId != null ? (
                      <MemberUserFormFilesTab
                        userId={editId}
                        files={files}
                        canManage={perms.update}
                        onReload={loadDetail}
                      />
                    ) : null}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
            <MemberUserFormEditAside
              creditLimit={financial.credit_limit}
              note={note}
              onNoteChange={setNote}
              noteReadOnly={formReadOnly}
              histories={histories}
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
          footerInsetLeft ? "left-[var(--sidebar-width)]" : "left-0"
        )}
      >
        <div className="mx-auto flex w-full max-w-crud-page justify-end gap-2 px-admin-content py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/member/users")}
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
    </>
  );
}
