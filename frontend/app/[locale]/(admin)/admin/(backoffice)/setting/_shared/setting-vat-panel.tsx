"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { FormField } from "@/components/molecules/form-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  fetchSettingVat,
  patchSettingVat,
  SettingApiError,
} from "@/lib/setting-api";

export function SettingVatPanel() {
  const locale = useLocale();
  const tPage = useTranslations("page");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const tCrud = useTranslations("crud");
  const t = useTranslations();
  const perms = useResourcePermissions("setting", "setting_vat");

  const [vatType, setVatType] = useState<"exclude" | "include">("exclude");
  const [rate, setRate] = useState("7");
  const [id, setId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchSettingVat(locale);
      setId(row.id);
      setVatType(row.vat_type);
      setRate(String(row.rate));
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const save = async () => {
    if (id == null) return;
    try {
      await patchSettingVat(locale, id, {
        vat_type: vatType,
        rate: Number(rate),
      });
      toast.success(tCrud("toast.saved"));
      await load();
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  return (
    <>
      <CrudPageHeader
        title={tPage("settingVat.title")}
        description={tPage("settingVat.description")}
      />
      {loading ? (
        <p className="text-center">…</p>
      ) : (
        <div className="max-w-md space-y-4 rounded-md border p-4">
          <Field className="gap-1.5">
            <FieldLabel>{tCol("vatType")}</FieldLabel>
            <Select
              value={vatType}
              onValueChange={(v) => setVatType(v as "exclude" | "include")}
              disabled={!perms.update}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={tForm("placeholder.select", { label: tCol("vatType") })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude">{t("vatType.exclude")}</SelectItem>
                <SelectItem value="include">{t("vatType.include")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <FormField
            id="vat-rate"
            labelKey="col.rate"
            type="number"
            value={rate}
            onChange={setRate}
            readOnly={!perms.update}
          />
          {perms.update ? (
            <Button type="button" onClick={() => void save()}>
              {tCrud("btn.save")}
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
}
