"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  MemberSettingBusinessEditSheet,
  type MemberBusinessEditPayload,
  type MemberBusinessSheetState,
} from "./member-setting-business-edit-sheet";
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
import { ButtonIcon } from "@/components/ui/button-icon";
import { Spinner } from "@/components/ui/spinner";
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
  deleteMemberRelation,
  deleteMemberSetting,
  fetchBusinessRelations,
  fetchMemberSettingById,
  fetchMemberSettingList,
  MemberSettingApiError,
  patchMemberRelation,
  patchMemberSetting,
  type MemberRelationItem,
  type MemberSettingItem,
} from "@/lib/member-setting-api";

const TABLE_COLUMNS = 6;

function uniqueIds(relations: MemberRelationItem[], key: "credit_id" | "group_id") {
  const set = new Set<number>();
  for (const r of relations) {
    set.add(r[key]);
  }
  return [...set].map(String);
}

function buildSettingBody(
  payload: MemberBusinessEditPayload,
  opts: { syncRelations: boolean }
): Record<string, unknown> {
  const trimmed = payload.sku.trim();
  const body: Record<string, unknown> = {
    sku: trimmed === "" ? null : trimmed,
    is_active: payload.isActive,
    names: { th: payload.nameTh, en: payload.nameEn },
  };
  const credit_ids = payload.creditIds.map(Number).filter((n) => n > 0);
  const group_ids = payload.groupIds.map(Number).filter((n) => n > 0);
  if (opts.syncRelations) {
    body.credit_ids = credit_ids;
    body.group_ids = group_ids;
  } else if (credit_ids.length > 0 && group_ids.length > 0) {
    body.credit_ids = credit_ids;
    body.group_ids = group_ids;
  }
  return body;
}

function memberBusinessApiErrorMessage(
  e: unknown,
  tBiz: (key: "errorRelationSyncFailed") => string,
  tError: (key: "generic") => string
): string {
  if (e instanceof MemberSettingApiError) {
    if (e.code === "relation_sync_failed") {
      return tBiz("errorRelationSyncFailed");
    }
    return e.message;
  }
  return tError("generic");
}

export function MemberSettingBusinessList() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.memberSettingBusiness");
  const tCredit = useTranslations("page.memberSettingCredit");
  const tGroup = useTranslations("page.memberSettingGroup");
  const tBiz = useTranslations("memberSettingBusiness");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const perms = useResourcePermissions("member", "member_setting_business");

  const [rows, setRows] = useState<MemberSettingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<MemberBusinessSheetState | null>(null);
  const [deleteBusinessId, setDeleteBusinessId] = useState<number | null>(null);
  const [deleteRelationId, setDeleteRelationId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [relationsByBusiness, setRelationsByBusiness] = useState<
    Record<number, MemberRelationItem[]>
  >({});
  const [relationsLoading, setRelationsLoading] = useState<Record<number, boolean>>(
    {}
  );

  const listQuery = useCrudListQuery();

  const refreshShell = useCallback(() => {
    router.refresh();
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMemberSettingList(locale, "businesses", {
        page: listQuery.page,
        limit: listQuery.pageSize,
        search: listQuery.debouncedQuery,
        isActive: listQuery.isActiveFromStatus,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(memberBusinessApiErrorMessage(e, tBiz, tError));
    } finally {
      setLoading(false);
    }
  }, [
    listQuery.debouncedQuery,
    listQuery.isActiveFromStatus,
    listQuery.page,
    listQuery.pageSize,
    locale,
    tBiz,
    tError,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const loadRelations = useCallback(
    async (businessId: number) => {
      setRelationsLoading((p) => ({ ...p, [businessId]: true }));
      try {
        const items = await fetchBusinessRelations(locale, businessId);
        setRelationsByBusiness((p) => ({ ...p, [businessId]: items }));
      } catch (e) {
        toast.error(
          memberBusinessApiErrorMessage(e, tBiz, tError)
        );
      } finally {
        setRelationsLoading((p) => ({ ...p, [businessId]: false }));
      }
    },
    [locale, tBiz, tError]
  );

  const toggleExpand = async (businessId: number) => {
    const next = !expanded[businessId];
    setExpanded((p) => ({ ...p, [businessId]: next }));
    if (next && relationsByBusiness[businessId] === undefined) {
      await loadRelations(businessId);
    }
  };

  const openCreate = () => setSheet({ mode: "create" });

  const openEdit = async (row: MemberSettingItem) => {
    try {
      const full = await fetchMemberSettingById(locale, "businesses", row.id);
      const relations = await fetchBusinessRelations(locale, row.id);
      setRelationsByBusiness((p) => ({ ...p, [row.id]: relations }));
      setSheet({
        mode: "edit",
        row: full,
        names: {
          th: full.names?.th ?? "",
          en: full.names?.en ?? "",
        },
        creditIds: uniqueIds(relations, "credit_id"),
        groupIds: uniqueIds(relations, "group_id"),
      });
    } catch (e) {
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const onSave = async (id: number | null, payload: MemberBusinessEditPayload) => {
    const body = buildSettingBody(payload, {
      syncRelations: id != null && (perms.create || perms.update),
    });
    try {
      if (id == null) {
        await createMemberSetting(locale, "businesses", body);
        toast.success(tCrud("toast.created"));
      } else {
        await patchMemberSetting(locale, "businesses", id, body);
        toast.success(tCrud("toast.saved"));
      }
      setSheet(null);
      await load();
      if (id != null) {
        setRelationsByBusiness((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        if (expanded[id]) {
          await loadRelations(id);
        }
      }
      refreshShell();
    } catch (e) {
      if (e instanceof MemberSettingApiError && e.code === "conflict") {
        throw e;
      }
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const onToggleBusinessActive = async (row: MemberSettingItem, active: boolean) => {
    try {
      await patchMemberSetting(locale, "businesses", row.id, { is_active: active });
      await load();
      refreshShell();
    } catch (e) {
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const onToggleRelationActive = async (
    businessId: number,
    relation: MemberRelationItem,
    active: boolean
  ) => {
    try {
      await patchMemberRelation(locale, relation.id, { is_active: active });
      await loadRelations(businessId);
    } catch (e) {
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const onDeleteBusiness = async () => {
    if (deleteBusinessId == null) return;
    try {
      await deleteMemberSetting(locale, "businesses", deleteBusinessId);
      setDeleteBusinessId(null);
      toast.success(tCrud("toast.deleted"));
      await load();
      refreshShell();
    } catch (e) {
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const onDeleteRelation = async () => {
    if (deleteRelationId == null) return;
    const businessId = Object.entries(relationsByBusiness).find(([, rels]) =>
      rels.some((r) => r.id === deleteRelationId)
    )?.[0];
    try {
      await deleteMemberRelation(locale, deleteRelationId);
      setDeleteRelationId(null);
      toast.success(tCrud("toast.deleted"));
      if (businessId != null) {
        await loadRelations(Number(businessId));
      }
    } catch (e) {
      toast.error(
        memberBusinessApiErrorMessage(e, tBiz, tError)
      );
    }
  };

  const rowActions = (row: MemberSettingItem): TableIconActionKey[] =>
    tableIconActionsFromResource(perms, { rowId: row.id });

  const showRelationFields = perms.create || perms.update;

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
              <TableHead className="w-10" aria-hidden />
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
              rows.flatMap((row) => {
                const isOpen = expanded[row.id];
                const rels = relationsByBusiness[row.id];
                const relLoading = relationsLoading[row.id];
                const main = (
                  <TableRow key={row.id} aria-expanded={isOpen}>
                    <TableCell>
                      <ButtonIcon
                        type="button"
                        variant="ghost"
                        aria-label={tBiz("relationsTitle")}
                        aria-expanded={isOpen}
                        onClick={() => void toggleExpand(row.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </ButtonIcon>
                    </TableCell>
                    <TableCell>{row.sku?.trim() ? row.sku : "—"}</TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell className="text-center">
                      <StatusSwitchField
                        checked={row.is_active}
                        disabled={!perms.update}
                        onCheckedChange={(v) =>
                          void onToggleBusinessActive(row, v)
                        }
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(row.updated_at, locale)}</TableCell>
                    <TableCell className="text-center">
                      <TableIconActions
                        actions={rowActions(row)}
                        onAction={(key) => {
                          if (tableRowDetailAction(key)) void openEdit(row);
                          if (key === "delete") setDeleteBusinessId(row.id);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
                if (!isOpen) return [main];
                const detail = (
                  <TableRow key={`${row.id}-rels`}>
                    <TableCell
                      colSpan={TABLE_COLUMNS}
                      className="border-b border-border p-0"
                    >
                      <div className="p-4">
                        <h3 className="text-md mb-3 font-semibold">
                          {tBiz("relationsTitle")}
                        </h3>
                        {relLoading ? (
                          <div className="flex justify-center py-4">
                            <Spinner className="size-6" />
                          </div>
                        ) : !rels || rels.length === 0 ? (
                          <p className="text-muted-foreground text-center text-sm">
                            {tError("noData")}
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-md border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{tCredit("title")}</TableHead>
                                  <TableHead>{tGroup("title")}</TableHead>
                                  <TableHead className="text-center">
                                    {tCol("status")}
                                  </TableHead>
                                  <TableHead className="text-center">
                                    {tCol("action")}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rels.map((rel) => (
                                  <TableRow key={rel.id}>
                                    <TableCell>
                                      {rel.credit_name?.trim()
                                        ? rel.credit_name
                                        : "—"}
                                    </TableCell>
                                    <TableCell>
                                      {rel.group_name?.trim()
                                        ? rel.group_name
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <StatusSwitchField
                                        checked={rel.is_active}
                                        disabled={!perms.update}
                                        onCheckedChange={(v) =>
                                          void onToggleRelationActive(
                                            row.id,
                                            rel,
                                            v
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {perms.delete ? (
                                        <TableIconActions
                                          actions={["delete"]}
                                          onAction={() =>
                                            setDeleteRelationId(rel.id)
                                          }
                                        />
                                      ) : null}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
                return [main, detail];
              })
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
      <MemberSettingBusinessEditSheet
        state={sheet}
        canSave={sheet?.mode === "create" ? perms.create : perms.update}
        showRelationFields={showRelationFields}
        onOpenChange={(o) => !o && setSheet(null)}
        onSave={onSave}
      />
      <CrudDeleteConfirmDialog
        open={deleteBusinessId != null}
        onOpenChange={(o) => !o && setDeleteBusinessId(null)}
        onConfirm={() => void onDeleteBusiness()}
      />
      <CrudDeleteConfirmDialog
        open={deleteRelationId != null}
        onOpenChange={(o) => !o && setDeleteRelationId(null)}
        onConfirm={() => void onDeleteRelation()}
      />
    </>
  );
}
