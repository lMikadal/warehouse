"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  SettingVatEditSheet,
  type SettingVatEditPayload,
} from "./setting-vat-edit-sheet";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  tableRowDetailAction,
  type ResourceActions,
} from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  fetchSettingVat,
  patchSettingVat,
  SettingApiError,
  type SettingVatItem,
} from "@/lib/setting-api";

// design: setting_vat canDelete false — never show delete on the singleton row
function vatRowActions(perms: ResourceActions): TableIconActionKey[] {
  if (perms.update) return ["edit"];
  if (perms.view) return ["view"];
  return [];
}

export function SettingVatList() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const t = useTranslations();
  const perms = useResourcePermissions("setting", "setting_vat");

  const [row, setRow] = useState<SettingVatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetRow, setSheetRow] = useState<SettingVatItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSettingVat(locale);
      setRow(data);
    } catch (e) {
      setRow(null);
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

  const onToggleActive = async (active: boolean) => {
    if (row == null) return;
    try {
      await patchSettingVat(locale, row.id, { is_active: active });
      await load();
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const onSave = async (payload: SettingVatEditPayload) => {
    if (sheetRow == null) return;
    try {
      await patchSettingVat(locale, sheetRow.id, {
        vat_type: payload.vatType,
        rate: Number(payload.rate),
        is_active: payload.isActive,
      });
      toast.success(tCrud("toast.saved"));
      setSheetRow(null);
      await load();
    } catch (e) {
      toast.error(e instanceof SettingApiError ? e.message : t("error.generic"));
    }
  };

  const colCount = 5;

  return (
    <>
      <CrudPageHeader
        title={tPage("settingVat.title")}
        description={tPage("settingVat.description")}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCol("vatType")}</TableHead>
              <TableHead className="text-right">{tCol("rate")}</TableHead>
              <TableHead className="text-center">{tCol("status")}</TableHead>
              <TableHead>{tCol("updatedAt")}</TableHead>
              <TableHead className="data-table__actions-col text-center">
                {tCol("action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={colCount} rowCount={3} />
            ) : row == null ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell>{t(`vatType.${row.vat_type}`)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.rate}</TableCell>
                <TableCell className="text-center">
                  <StatusSwitchField
                    checked={row.is_active}
                    disabled={!perms.update}
                    onCheckedChange={(v) => void onToggleActive(v)}
                  />
                </TableCell>
                <TableCell>{formatDateTime(row.updated_at, locale)}</TableCell>
                <TableCell className="text-center">
                  <TableIconActions
                    actions={vatRowActions(perms)}
                    onAction={(key) => {
                      if (tableRowDetailAction(key)) setSheetRow(row);
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {sheetRow != null ? (
        <SettingVatEditSheet
          row={sheetRow}
          open
          canSave={perms.update}
          onOpenChange={(o) => !o && setSheetRow(null)}
          onSave={onSave}
        />
      ) : null}
    </>
  );
}
