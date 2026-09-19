"use client";

import { ImageIcon, RefreshCw, ShoppingBag, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  loadProfileComboOptions,
  type ProfileComboOption,
} from "./member-tier-profile-combos";
import {
  MemberTierListCardsSkeleton,
  MemberTierRelationsSkeleton,
} from "./member-tier-page-skeleton";
import { MemberTierRelationDialog } from "./member-tier-relation-dialog";
import { MemberTierRelationTable } from "./member-tier-relation-row";
import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import {
  FormCard,
  FormCardContent,
} from "@/components/molecules/form-card";
import { FormField } from "@/components/molecules/form-field";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  createTier,
  deleteTier,
  deleteTierRelation,
  fetchTierById,
  fetchTierList,
  fetchTierStats,
  MemberTierApiError,
  type MemberTierStats,
  patchTier,
  type MemberTierDetail,
  type MemberTierListItem,
  type MemberTierRelation,
} from "@/lib/member-tier-api";
import {
  fetchSystemFile,
  resolveSettingLogoFileId,
  type ImageUploadItem,
} from "@/lib/system-file-api";

const BADGE_PURPOSE = "member_tier_badge";

const TIER_BADGE_SHELL =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground bg-muted";

function tierDepth(items: MemberTierListItem[], id: number): number {
  const byId = new Map(items.map((t) => [t.id, t]));
  let depth = 0;
  let current = byId.get(id);
  const seen = new Set<number>();
  while (current?.parent_id != null) {
    if (seen.has(current.parent_id)) break;
    seen.add(current.parent_id);
    depth += 1;
    current = byId.get(current.parent_id);
  }
  return depth;
}

function formatBaht(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function TierBadgeFallback() {
  return (
    <div className={TIER_BADGE_SHELL} aria-hidden>
      <ImageIcon className="size-[1.35rem]" />
    </div>
  );
}

function TierBadgeThumb({
  fileId,
  locale,
}: {
  fileId: number;
  locale: string;
}) {
  const tForm = useTranslations("form");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemFile(locale, fileId)
      .then((item) => {
        if (!cancelled) setUrl(item.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, locale]);

  if (loading) {
    return (
      <div className={TIER_BADGE_SHELL}>
        <Spinner className="size-5" />
      </div>
    );
  }
  if (failed || !url) {
    return <TierBadgeFallback />;
  }

  return (
    <>
      <button
        type="button"
        className={`${TIER_BADGE_SHELL} overflow-hidden p-0`}
        onClick={() => setPreviewOpen(true)}
        aria-label={tForm("upload.view")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="size-full rounded-full bg-background/80 object-contain"
        />
      </button>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg p-2">
          <DialogTitle className="sr-only">{tForm("upload.view")}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TierBadgeCell({
  fileId,
  locale,
}: {
  fileId: number | null | undefined;
  locale: string;
}) {
  if (fileId == null) {
    return <TierBadgeFallback />;
  }
  return <TierBadgeThumb key={fileId} fileId={fileId} locale={locale} />;
}

export function MemberTierPage() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.memberTier");
  const t = useTranslations("memberTier");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const perms = useResourcePermissions("member", "member_tier");
  const listQuery = useCrudListQuery();

  const [rows, setRows] = useState<MemberTierListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MemberTierStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [tierDetails, setTierDetails] = useState<Record<number, MemberTierDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editingTierId, setEditingTierId] = useState<number | null>(null);
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [badgeItems, setBadgeItems] = useState<ImageUploadItem[]>([]);
  const [initialFileId, setInitialFileId] = useState<number | null>(null);
  const [formInvalid, setFormInvalid] = useState<{ th?: boolean; en?: boolean }>({});
  const [savingTier, setSavingTier] = useState(false);

  const [deleteTierId, setDeleteTierId] = useState<number | null>(null);
  const [deleteRelation, setDeleteRelation] = useState<{
    tierId: number;
    relationId: number;
  } | null>(null);

  const [relationDialog, setRelationDialog] = useState<{
    tierId: number;
    editing: MemberTierRelation | null;
  } | null>(null);
  const [profileOptions, setProfileOptions] = useState<ProfileComboOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const ensureProfileOptions = useCallback(async () => {
    if (profileOptions.length > 0) return;
    setProfilesLoading(true);
    try {
      const opts = await loadProfileComboOptions(locale);
      setProfileOptions(opts);
    } catch {
      toast.error(tErr("generic"));
    } finally {
      setProfilesLoading(false);
    }
  }, [locale, profileOptions.length, tErr]);

  const loadStats = useCallback(async () => {
    if (!perms.view) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const data = await fetchTierStats(locale);
      setStats(data);
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    } finally {
      setStatsLoading(false);
    }
  }, [locale, perms.view, tErr]);

  const loadList = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchTierList(locale, {
        page: listQuery.page,
        limit: listQuery.pageSize,
      });
      setRows(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    } finally {
      setLoading(false);
    }
  }, [locale, listQuery.page, listQuery.pageSize, perms.view, tErr]);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([loadStats(), loadList()]);
  }, [loadStats, loadList]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshDashboard();
    });
  }, [refreshDashboard]);

  const loadTierDetail = useCallback(
    async (tierId: number) => {
      setDetailLoading((p) => ({ ...p, [tierId]: true }));
      try {
        const detail = await fetchTierById(locale, tierId);
        setTierDetails((p) => ({ ...p, [tierId]: detail }));
      } catch (e) {
        toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
      } finally {
        setDetailLoading((p) => ({ ...p, [tierId]: false }));
      }
    },
    [locale, tErr]
  );

  const toggleExpand = (tierId: number) => {
    setExpanded((p) => {
      const next = !p[tierId];
      if (next) {
        if (perms.create || perms.update) {
          void ensureProfileOptions();
        }
        if (!tierDetails[tierId]) {
          void loadTierDetail(tierId);
        }
      }
      return { ...p, [tierId]: next };
    });
  };

  const resetForm = () => {
    setEditingTierId(null);
    setNameTh("");
    setNameEn("");
    setIsActive(true);
    setIsDefault(false);
    setBadgeItems([]);
    setInitialFileId(null);
    setFormInvalid({});
  };

  const startEditTier = async (row: MemberTierListItem) => {
    try {
      const detail = tierDetails[row.id] ?? (await fetchTierById(locale, row.id));
      setTierDetails((p) => ({ ...p, [row.id]: detail }));
      setEditingTierId(row.id);
      setNameTh(detail.names?.th ?? "");
      setNameEn(detail.names?.en ?? "");
      setIsActive(detail.is_active);
      setIsDefault(detail.is_default);
      setInitialFileId(detail.system_file_id);
      if (detail.system_file_id) {
        const file = await fetchSystemFile(locale, detail.system_file_id);
        setBadgeItems([file]);
      } else {
        setBadgeItems([]);
      }
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    }
  };

  const onSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const th = nameTh.trim();
    const en = nameEn.trim();
    const invalid = { th: !th, en: !en };
    setFormInvalid(invalid);
    if (invalid.th || invalid.en) return;

    const canSave = editingTierId ? perms.update : perms.create;
    if (!canSave) return;

    setSavingTier(true);
    try {
      const fileId = await resolveSettingLogoFileId(
        locale,
        BADGE_PURPOSE,
        badgeItems,
        initialFileId
      );
      const body: Record<string, unknown> = {
        names: { th, en },
        is_active: isActive,
        is_default: isDefault,
      };
      if (fileId !== undefined) {
        body.system_file_id = fileId;
      }

      if (editingTierId) {
        await patchTier(locale, editingTierId, body);
        toast.success(tCrud("toast.saved"));
      } else {
        await createTier(locale, body);
        toast.success(tCrud("toast.created"));
      }
      resetForm();
      await refreshDashboard();
    } catch (err) {
      toast.error(
        err instanceof MemberTierApiError ? err.message : tErr("generic")
      );
    } finally {
      setSavingTier(false);
    }
  };

  const onToggleTierActive = async (row: MemberTierListItem, active: boolean) => {
    try {
      await patchTier(locale, row.id, { is_active: active });
      await refreshDashboard();
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    }
  };

  const onDeleteTier = async () => {
    if (deleteTierId == null) return;
    try {
      await deleteTier(locale, deleteTierId);
      setDeleteTierId(null);
      if (editingTierId === deleteTierId) resetForm();
      toast.success(tCrud("toast.deleted"));
      await refreshDashboard();
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    }
  };

  const onDeleteRelation = async () => {
    if (!deleteRelation) return;
    try {
      await deleteTierRelation(
        locale,
        deleteRelation.tierId,
        deleteRelation.relationId
      );
      setDeleteRelation(null);
      toast.success(tCrud("toast.deleted"));
      await loadTierDetail(deleteRelation.tierId);
    } catch (e) {
      toast.error(e instanceof MemberTierApiError ? e.message : tErr("generic"));
    }
  };

  const openRelationDialog = async (
    tierId: number,
    editing: MemberTierRelation | null
  ) => {
    if (!tierDetails[tierId]) {
      await loadTierDetail(tierId);
    }
    await ensureProfileOptions();
    setRelationDialog({ tierId, editing });
  };

  const usedRelationIds = useMemo(() => {
    if (!relationDialog) return [];
    const detail = tierDetails[relationDialog.tierId];
    const rels = detail?.relations ?? [];
    return rels.map((r) => r.member_setting_relation_id);
  }, [relationDialog, tierDetails]);

  const canSaveTier = editingTierId ? perms.update : perms.create;
  const totalMembers = stats?.total_members ?? 0;

  if (!perms.view) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {tErr("forbidden")}
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 grid gap-4 lg:grid-cols-[min(100%,320px)_1fr] lg:items-stretch">
        <CrudPageHeader title={tPage("title")} description={tPage("description")} />
        <FormCard className="h-full">
          <FormCardContent className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[10rem] flex-1 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("stats.totalMembers")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {statsLoading ? "—" : totalMembers.toLocaleString()}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    {t("stats.listUnit")}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex min-w-[10rem] flex-1 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingBag className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("stats.totalSalesYtd")}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {statsLoading
                    ? "—"
                    : `${formatBaht(stats?.total_sales_ytd ?? 0)} ${t("bahtUnit")}`}
                </p>
              </div>
            </div>
            <div className="flex min-w-[8rem] flex-col gap-1 text-xs text-muted-foreground">
              <span>{t("stats.lastUpdated")}</span>
              <span className="font-medium text-foreground">
                {stats?.updated_at
                  ? formatDateTime(stats.updated_at, locale)
                  : "—"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 h-8"
                disabled={statsLoading || loading}
                onClick={() => void refreshDashboard()}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {t("stats.refresh")}
              </Button>
            </div>
          </FormCardContent>
        </FormCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[min(100%,320px)_1fr] lg:items-start">
        <FormCard>
          <FormCardContent>
            <form className="space-y-4" noValidate onSubmit={(e) => void onSaveTier(e)}>
              <ImageUploadField
                id="mt-tier-badge"
                labelKey="memberTier.uploadBadge"
                purpose={BADGE_PURPOSE}
                value={badgeItems}
                onChange={setBadgeItems}
                maxFiles={1}
                uploadTiming="deferred"
                showLabel
                fullWidth
                disabled={!canSaveTier || savingTier}
              />
              <FormField
                id="mt-name-th"
                labelKey="col.nameTh"
                required
                value={nameTh}
                invalid={formInvalid.th}
                onClearInvalid={() =>
                  setFormInvalid((p) => ({ ...p, th: false }))
                }
                onChange={setNameTh}
                readOnly={!canSaveTier || savingTier}
              />
              <FormField
                id="mt-name-en"
                labelKey="col.nameEn"
                required
                value={nameEn}
                invalid={formInvalid.en}
                onClearInvalid={() =>
                  setFormInvalid((p) => ({ ...p, en: false }))
                }
                onChange={setNameEn}
                readOnly={!canSaveTier || savingTier}
              />
              <StatusSwitchField
                labelKey="memberTier.defaultBadge"
                checked={isDefault}
                disabled={!canSaveTier || savingTier}
                onCheckedChange={setIsDefault}
              />
              {canSaveTier ? (
                <Button type="submit" className="w-full" disabled={savingTier}>
                  {editingTierId ? tCrud("btn.edit") : tCrud("btn.create")}
                </Button>
              ) : null}
              {editingTierId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resetForm}
                >
                  {tCrud("btn.cancel")}
                </Button>
              ) : null}
            </form>
          </FormCardContent>
        </FormCard>

        <div className="min-w-0 space-y-4">
          <h2 className="text-base font-semibold">{t("listTitle")}</h2>
          {loading ? (
            <MemberTierListCardsSkeleton />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {tErr("noData")}
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const depth = tierDepth(rows, row.id);
                const isOpen = !!expanded[row.id];
                const detail = tierDetails[row.id];
                const rels = detail?.relations ?? [];
                const relCount =
                  detail != null ? rels.length : row.relation_count ?? 0;
                const memberCount = row.member_count ?? 0;
                const sharePct =
                  totalMembers > 0
                    ? Math.round((memberCount / totalMembers) * 100)
                    : 0;
                const cardActions: ("add" | "edit" | "delete")[] = [];
                if (perms.create) cardActions.push("add");
                if (perms.update) cardActions.push("edit");
                if (perms.delete) cardActions.push("delete");
                const tierDeleteDisabled = memberCount > 0;

                return (
                  <article
                    key={row.id}
                    className="rounded-xl border border-border bg-card shadow-sm"
                    style={{ marginLeft: depth * 20 }}
                  >
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <TierBadgeCell
                        fileId={row.system_file_id}
                        locale={locale}
                      />
                      <div className="min-w-[8rem] flex-1 space-y-1">
                        <p className="truncate font-semibold">
                          {row.name || "—"}
                          {row.is_default ? (
                            <Badge variant="secondary" className="ml-2">
                              {t("defaultBadge")}
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t("customerCountLabel")}{" "}
                          <span className="font-semibold text-foreground tabular-nums">
                            {memberCount.toLocaleString()} {t("stats.listUnit")}
                          </span>
                        </p>
                        {totalMembers > 0 ? (
                          <>
                            <Progress value={sharePct} className="max-w-xs gap-1">
                              <span className="text-muted-foreground w-full text-[11px]">
                                {t("percentOfTotal", { pct: sharePct })}
                              </span>
                            </Progress>
                          </>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground min-w-[8rem] shrink-0 text-xs">
                        <p>{t("relationCount")}</p>
                        <p className="font-semibold text-foreground">
                          {t("businessGroupCount", { count: relCount })}
                        </p>
                      </div>
                      <StatusSwitchField
                        checked={row.is_active}
                        disabled={!perms.update}
                        onCheckedChange={(v) => void onToggleTierActive(row, v)}
                      />
                      <TableIconActions
                        actions={cardActions}
                        disabledActions={
                          tierDeleteDisabled ? ["delete"] : undefined
                        }
                        onAction={(key) => {
                          if (key === "add") void openRelationDialog(row.id, null);
                          if (key === "edit") void startEditTier(row);
                          if (key === "delete" && !tierDeleteDisabled) {
                            setDeleteTierId(row.id);
                          }
                        }}
                      />
                    </div>
                    <div className="border-t border-border px-4 pb-4 pt-2">
                      <Button
                        type="button"
                        variant={isOpen ? "outline" : "default"}
                        className="w-full text-sm"
                        onClick={() => toggleExpand(row.id)}
                      >
                        {isOpen ? t("hide") : t("viewMore")}
                      </Button>
                      {isOpen ? (
                        <div className="mt-3 space-y-2">
                          {/* <h3 className="text-sm font-semibold">{t("relationsTitle")}</h3> */}
                          {detailLoading[row.id] ? (
                            <MemberTierRelationsSkeleton />
                          ) : rels.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              {t("emptyRelations")}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold">
                                {t("relationsTitle")}
                              </h3>
                              <MemberTierRelationTable
                                relations={rels}
                                profileOptions={profileOptions}
                                canEdit={perms.update}
                                canDelete={perms.delete}
                                onEdit={(rel) => {
                                  void openRelationDialog(row.id, rel);
                                }}
                                onDelete={(rel) => {
                                  setDeleteRelation({
                                    tierId: row.id,
                                    relationId: rel.id,
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
        </div>
      </div>

      <MemberTierRelationDialog
        key={
          relationDialog
            ? `${relationDialog.tierId}-${relationDialog.editing?.id ?? "new"}`
            : "closed"
        }
        open={relationDialog != null}
        tierId={relationDialog?.tierId ?? null}
        editing={relationDialog?.editing ?? null}
        usedRelationIds={usedRelationIds}
        profileOptions={profileOptions}
        profilesLoading={profilesLoading}
        canSave={
          relationDialog?.editing ? perms.update : perms.create
        }
        onOpenChange={(open) => {
          if (!open) setRelationDialog(null);
        }}
        onSaved={() => {
          if (relationDialog) {
            void loadTierDetail(relationDialog.tierId);
            setExpanded((p) => ({ ...p, [relationDialog.tierId]: true }));
          }
        }}
      />

      <CrudDeleteConfirmDialog
        open={deleteTierId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTierId(null);
        }}
        onConfirm={() => void onDeleteTier()}
      />

      <CrudDeleteConfirmDialog
        open={deleteRelation != null}
        onOpenChange={(open) => {
          if (!open) setDeleteRelation(null);
        }}
        onConfirm={() => void onDeleteRelation()}
      />
    </>
  );
}
