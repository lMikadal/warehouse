"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  filterProfileOptions,
  type ProfileComboOption,
} from "./member-tier-profile-combos";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { fetchProductAttributes } from "@/lib/product-attribute-api";
import {
  createTierRelation,
  MemberTierApiError,
  patchTierRelation,
  type MemberTierRelation,
  type TierScopeType,
} from "@/lib/member-tier-api";

const SCOPE_TYPES: TierScopeType[] = [
  "all",
  "brand",
  "category",
  "except_brand",
  "except_category",
];

type RelationDialogProps = {
  open: boolean;
  tierId: number | null;
  editing: MemberTierRelation | null;
  usedRelationIds: number[];
  profileOptions: ProfileComboOption[];
  profilesLoading: boolean;
  canSave: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function formFromEditing(editing: MemberTierRelation | null) {
  if (!editing) {
    return {
      profileId: "",
      purchaseStart: "",
      purchaseEnd: "",
      discount: "",
      type: "all" as TierScopeType,
      attrIds: [] as string[],
      isPromotion: false,
    };
  }
  return {
    profileId: String(editing.member_setting_relation_id),
    purchaseStart: String(editing.purchase_start),
    purchaseEnd: String(editing.purchase_end),
    discount: String(Math.round(editing.discount)),
    type: editing.type,
    attrIds: (editing.attribute_ids ?? []).map(String),
    isPromotion: editing.is_promotion,
  };
}

export function MemberTierRelationDialog({
  open,
  tierId,
  editing,
  usedRelationIds,
  profileOptions,
  profilesLoading,
  canSave,
  onOpenChange,
  onSaved,
}: RelationDialogProps) {
  const locale = useLocale();
  const t = useTranslations("memberTier");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tErr = useTranslations("error");

  const [form, setForm] = useState(() => formFromEditing(editing));
  const [saving, setSaving] = useState(false);
  const [profileInvalid, setProfileInvalid] = useState(false);
  const [rangeInvalid, setRangeInvalid] = useState(false);

  const isEdit = editing != null;

  const availableProfiles = useMemo(() => {
    const used = new Set(
      usedRelationIds.filter((id) => id !== editing?.member_setting_relation_id)
    );
    return profileOptions.filter((o) => !used.has(Number(o.value)));
  }, [profileOptions, usedRelationIds, editing?.member_setting_relation_id]);

  const scopeLabelKey = (type: TierScopeType) => {
    if (type === "all") return "scopeAll";
    if (type === "brand") return "scopeBrand";
    if (type === "category") return "scopeCategory";
    if (type === "except_brand") return "scopeExceptBrand";
    return "scopeExceptCategory";
  };

  const attrSegment =
    form.type === "brand" || form.type === "except_brand" ? "brands" : "categories";

  const loadAttrs = useCallback(
    async (search: string) => {
      const res = await fetchProductAttributes(attrSegment, locale, {
        page: 1,
        limit: 50,
        search,
        isActive: true,
      });
      return res.items.map((row) => ({
        value: String(row.id),
        label: row.name?.trim() ? row.name : `#${row.id}`,
      }));
    },
    [attrSegment, locale]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tierId == null || !canSave) return;

    if (!isEdit && !form.profileId) {
      setProfileInvalid(true);
      return;
    }
    const start = form.purchaseStart === "" ? 0 : Number(form.purchaseStart);
    const end = form.purchaseEnd === "" ? 0 : Number(form.purchaseEnd);
    if (!Number.isNaN(start) && !Number.isNaN(end) && start > end) {
      setRangeInvalid(true);
      toast.error(t("errorPurchaseRange"));
      return;
    }
    if (form.type !== "all" && form.attrIds.length === 0) {
      toast.error(t("errorScopeAttrs"));
      return;
    }

    const body = {
      member_setting_relation_id: Number(form.profileId),
      purchase_start: start,
      purchase_end: end,
      discount: Number(form.discount) || 0,
      discount_type: "percent",
      type: form.type,
      is_promotion: form.isPromotion,
      attribute_ids:
        form.type === "all" ? [] : form.attrIds.map(Number).filter((n) => n > 0),
    };

    setSaving(true);
    try {
      if (isEdit && editing) {
        await patchTierRelation(locale, tierId, editing.id, {
          purchase_start: body.purchase_start,
          purchase_end: body.purchase_end,
          discount: body.discount,
          discount_type: body.discount_type,
          type: body.type,
          is_promotion: body.is_promotion,
          attribute_ids: body.attribute_ids,
        });
        toast.success(tCrud("toast.saved"));
      } else {
        await createTierRelation(locale, tierId, body);
        toast.success(tCrud("toast.created"));
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof MemberTierApiError ? err.message : tErr("generic")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(42rem,calc(100vw-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editRelation") : t("addRelation")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => void onSubmit(e)}>
          {profilesLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              <RemoteComboboxField
                id="mt-rel-profile"
                label={t("selectProfile")}
                value={form.profileId}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, profileId: v }));
                  setProfileInvalid(false);
                }}
                placeholder={tForm("placeholder.select", {
                  label: t("selectProfile"),
                })}
                emptyLabel={tForm("combobox.noResults")}
                inputClassName="w-full"
                disabled={isEdit || saving}
                invalid={profileInvalid}
                showClear={!isEdit}
                pinnedItems={
                  isEdit && form.profileId
                    ? profileOptions.filter((o) => o.value === form.profileId)
                    : []
                }
                onLoadOptions={async ({ search }) =>
                  filterProfileOptions(availableProfiles, search)
                }
                resolveSelectedLabel={async (value) =>
                  profileOptions.find((o) => o.value === value)?.label ?? null
                }
              />
              {profileInvalid ? (
                <p className="text-destructive text-sm" role="alert">
                  {tErr("required")}
                </p>
              ) : null}

              <Field>
                <FieldLabel>{t("purchaseRangeCumulative")}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.purchaseStart}
                    placeholder={tForm("placeholder.input", {
                      label: t("purchaseStart"),
                    })}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, purchaseStart: e.target.value }));
                      setRangeInvalid(false);
                    }}
                  />
                  <span className="text-muted-foreground shrink-0" aria-hidden>
                    –
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.purchaseEnd}
                    placeholder={tForm("placeholder.input", {
                      label: t("purchaseEnd"),
                    })}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, purchaseEnd: e.target.value }));
                      setRangeInvalid(false);
                    }}
                  />
                </div>
                {rangeInvalid ? (
                  <p className="text-destructive mt-1 text-sm" role="alert">
                    {t("errorPurchaseRange")}
                  </p>
                ) : null}
              </Field>

              <Field className="gap-1.5">
                <FieldLabel htmlFor="mt-rel-discount">
                  {t("tierDiscount")}
                </FieldLabel>
                <InputGroup className="rounded-login">
                  <InputGroupInput
                    id="mt-rel-discount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    value={form.discount}
                    placeholder={tForm("placeholder.input", {
                      label: t("tierDiscount"),
                    })}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount: e.target.value }))
                    }
                  />
                  <InputGroupAddon
                    align="inline-end"
                    className="cursor-default tabular-nums"
                    aria-hidden
                  >
                    %
                  </InputGroupAddon>
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>{t("productScope")}</FieldLabel>
                <RadioGroup
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as TierScopeType,
                      attrIds: [],
                    }))
                  }
                  className="grid grid-cols-2 gap-2"
                  disabled={saving}
                >
                  {SCOPE_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <RadioGroupItem value={type} id={`mt-scope-${type}`} />
                      <Label htmlFor={`mt-scope-${type}`} className="cursor-pointer text-sm">
                        {t(scopeLabelKey(type))}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </Field>

              {form.type !== "all" ? (
                <RemoteMultiComboboxField
                  id="mt-rel-attrs"
                  label={
                    form.type === "brand" || form.type === "except_brand"
                      ? t("brands")
                      : t("categories")
                  }
                  values={form.attrIds}
                  onValuesChange={(v) => setForm((f) => ({ ...f, attrIds: v }))}
                  placeholder={tForm("placeholder.select", {
                    label:
                      form.type === "brand" || form.type === "except_brand"
                        ? t("brands")
                        : t("categories"),
                  })}
                  emptyLabel={tForm("combobox.noResults")}
                  disabled={saving}
                  onLoadOptions={async ({ search }) => loadAttrs(search)}
                />
              ) : null}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mt-rel-promo"
                  checked={form.isPromotion}
                  disabled={saving}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, isPromotion: c === true }))
                  }
                />
                <Label htmlFor="mt-rel-promo" className="cursor-pointer text-sm">
                  {t("includePromotion")}
                </Label>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              size="lg"
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={saving || !canSave || profilesLoading}>
              {isEdit ? tCrud("btn.save") : tCrud("btn.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
