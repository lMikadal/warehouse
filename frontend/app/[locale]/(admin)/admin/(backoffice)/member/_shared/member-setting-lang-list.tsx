"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { MemberSettingLangListConfig } from "./member-setting-config";
import {
  MemberSettingLangEditSheet,
  type MemberSettingEditPayload,
  type MemberSettingSheetState,
} from "./member-setting-lang-edit-sheet";
import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { StatusFilterGroup } from "@/components/molecules/status-filter-group";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  TableIconActions,
  type TableIconActionKey,
} from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  tableIconActionsFromResource,
  tableRowDetailAction,
} from "@/lib/admin-permissions";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createMemberSetting,
  deleteMemberSetting,
  fetchMemberSettingById,
  fetchMemberSettingList,
  MemberSettingApiError,
  patchMemberSetting,
  type MemberSettingItem,
} from "@/lib/member-setting-api";

const TABLE_COLUMNS = 5;

function buildBody(payload: MemberSettingEditPayload): Record<string, unknown> {
  const trimmed = payload.sku.trim();
  return {
    sku: trimmed === "" ? null : trimmed,
    is_active: payload.isActive,
    names: { th: payload.nameTh, en: payload.nameEn },
  };
}

export function MemberSettingLangList({
  config,
}: {
  config: MemberSettingLangListConfig;
}) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations(`page.${config.pageKey}`);
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const t = useTranslations();
  const tError = useTranslations("error");

  const perms = useResourcePermissions("member", config.permType);

  const [rows, setRows] = useState<MemberSettingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<MemberSettingSheetState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const listQuery = useCrudListQuery();

  const refreshShell = useCallback(() => {
    router.refresh();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMemberSettingList(locale, config.segment, {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery,
        isActive: listQuery.isActiveFromStatus,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof MemberSettingApiError ? e.message : t("error.generic")
      );
    } finally {
      setLoading(false);
    }
  }, [
    config.segment,
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    listQuery.page,
    listQuery.pageSize,
    locale,
    t,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const openCreate = () => setSheet({ mode: "create" });

  const openEdit = async (row: MemberSettingItem) => {
    try {
      const full = await fetchMemberSettingById(locale, config.segment, row.id);
      setSheet({
        mode: "edit",
        row: full,
        names: {
          th: full.names?.th ?? "",
          en: full.names?.en ?? "",
        },
      });
    } catch (e) {
      toast.error(
        e instanceof MemberSettingApiError ? e.message : t("error.generic")
      );
    }
  };

  const onSave = async (id: number | null, payload: MemberSettingEditPayload) => {
    const body = buildBody(payload);
    try {
      if (id == null) {
        await createMemberSetting(locale, config.segment, body);
        toast.success(tCrud("toast.created"));
      } else {
        await patchMemberSetting(locale, config.segment, id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await load();
      refreshShell();
    } catch (e) {
      if (e instanceof MemberSettingApiError && e.code === "conflict") {
        throw e;
      }
      toast.error(
        e instanceof MemberSettingApiError ? e.message : t("error.generic")
      );
    }
  };

  const onToggleActive = async (row: MemberSettingItem, active: boolean) => {
    try {
      await patchMemberSetting(locale, config.segment, row.id, {
        is_active: active,
      });
      await load();
      refreshShell();
    } catch (e) {
      toast.error(
        e instanceof MemberSettingApiError ? e.message : t("error.generic")
      );
    }
  };

  const onDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMemberSetting(locale, config.segment, deleteId);
      setDeleteId(null);
      toast.success(tCrud("toast.deleted"));
      await load();
      refreshShell();
    } catch (e) {
      toast.error(
        e instanceof MemberSettingApiError ? e.message : t("error.generic")
      );
    }
  };

  const rowActions = (row: MemberSettingItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms, { rowId: row.id });

  return (
    <>
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("description")}
        actions={
          perms.create ? (
            <Button type="button" size="lg" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {tCrud("btn.create")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <CrudSearchField value={listQuery.query} onChange={listQuery.setQuery} />
        <StatusFilterGroup
          value={listQuery.statusFilter}
          onChange={listQuery.setStatusFilter}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCol("sku")}</TableHead>
              <TableHead>{tCol("name")}</TableHead>
              <TableHead className="text-center">{tCol("status")}</TableHead>
              <TableHead>{tCol("updatedAt")}</TableHead>
              <TableHead className="data-table__actions-col text-center">
                {tCol("action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <CrudListTableSkeleton columnCount={TABLE_COLUMNS} rowCount={10} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TABLE_COLUMNS} className="text-center">
                  {tError("noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.sku?.trim() ? row.sku : "—"}</TableCell>
                  <TableCell>{row.name || "—"}</TableCell>
                  <TableCell className="text-center">
                    <StatusSwitchField
                      checked={row.is_active}
                      disabled={!perms.update}
                      onCheckedChange={(v) => void onToggleActive(row, v)}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(row.updated_at, locale)}</TableCell>
                  <TableCell className="text-center">
                    <TableIconActions
                      actions={rowActions(row)}
                      onAction={(key) => {
                        if (tableRowDetailAction(key)) void openEdit(row);
                        if (key === "delete") setDeleteId(row.id);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CrudPaginationBar
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        meta={{
          total,
          totalPages: Math.max(1, Math.ceil(total / listQuery.pageSize)),
        }}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.onPageSizeChange}
      />
      <MemberSettingLangEditSheet
        pageKey={config.pageKey}
        state={sheet}
        canSave={sheet?.mode === "create" ? perms.create : perms.update}
        onOpenChange={(o) => !o && setSheet(null)}
        onSave={onSave}
      />
      <CrudDeleteConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => void onDelete()}
      />
    </>
  );
}
