"use client";

import { Check, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  OrderCompareDiscountDialog,
  type OrderCompareScope,
} from "./order-compare-discount-dialog";
import { OrderCompareTreeTable } from "./order-compare-tree-table";
import { CrudListTableSkeleton } from "@/components/molecules/crud-list-table-skeleton";
import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  fetchOrderCompareTree,
  OrderCompareApiError,
  putOrderCompareRules,
  type OrderCompareTreeNode,
  type RuleWritePayload,
} from "@/lib/order-compare-api";
import { cn } from "@/lib/utils";

function scopeKey(brandId: number, categoryId?: number | null) {
  if (categoryId == null || categoryId <= 0) return `b:${brandId}`;
  return `b:${brandId}:c:${categoryId}`;
}

function scopeHasDefinedRules(rules: RuleWritePayload[]) {
  return rules.some((r) => r.discount > 0);
}

export function OrderComparePage() {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderCompare");
  const t = useTranslations("orderCompare");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_compare");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  const {
    page,
    setPage,
    pageSize,
    query,
    onSearchChange,
    debouncedQuery,
    onPageSizeChange,
  } = useCrudListQuery();

  const [brands, setBrands] = useState<OrderCompareTreeNode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [drafts, setDrafts] = useState<Record<string, RuleWritePayload[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<OrderCompareScope | null>(null);

  const dirtyKeys = useMemo(() => Object.keys(drafts), [drafts]);

  const loadTree = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchOrderCompareTree(locale, {
        page,
        limit: pageSize,
        search: debouncedQuery,
      });
      setBrands(res.items);
      setTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof OrderCompareApiError ? e.message : tError("generic")
      );
    } finally {
      setLoading(false);
    }
  }, [locale, page, pageSize, debouncedQuery, perms.view, tError]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  function openScope(scope: OrderCompareScope) {
    setActiveScope(scope);
    setDialogOpen(true);
  }

  function handleDialogSaved(scope: OrderCompareScope, rules: RuleWritePayload[]) {
    const key = scopeKey(scope.brandId, scope.categoryId);
    setDrafts((prev) => ({ ...prev, [key]: rules }));
  }

  const scopeDefined = useCallback(
    (brandId: number, categoryId?: number | null) => {
      const key = scopeKey(brandId, categoryId);
      if (drafts[key]) return scopeHasDefinedRules(drafts[key]);
      return undefined;
    },
    [drafts]
  );

  async function handleSaveAll() {
    if (!perms.update || dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      for (const key of dirtyKeys) {
        const rules = drafts[key];
        const m = key.match(/^b:(\d+)(?::c:(\d+))?$/);
        if (!m) continue;
        const brandId = Number(m[1]);
        const categoryId = m[2] ? Number(m[2]) : null;
        await putOrderCompareRules(locale, {
          brand_id: brandId,
          category_id: categoryId,
          rules,
        });
      }
      setDrafts({});
      setLastSavedAt(new Date());
      toast.success(tCrud("toast.saved"));
      await loadTree();
    } catch (e) {
      toast.error(
        e instanceof OrderCompareApiError ? e.message : tError("generic")
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDrafts({});
  }

  if (!perms.view) {
    return (
      <p className="text-sm text-muted-foreground">{tError("forbidden")}</p>
    );
  }

  const activeDraftKey = activeScope
    ? scopeKey(activeScope.brandId, activeScope.categoryId)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-24">
      <CrudPageHeader
        title={tPage("title")}
        description={tPage("description")}
      />

      <CrudSearchField
        value={query}
        onChange={onSearchChange}
        placeholder={t("searchPlaceholder")}
        className="w-full"
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colBrandCategory")}</TableHead>
                <TableHead className="text-center">{t("colSetDiscount")}</TableHead>
                <TableHead className="text-center">{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <CrudListTableSkeleton columnCount={3} rowCount={10} />
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <OrderCompareTreeTable
            brands={brands}
            canEdit={perms.update}
            onSelectScope={openScope}
            scopeDefined={scopeDefined}
          />
          <CrudPaginationBar
            page={page}
            pageSize={pageSize}
            meta={{
              total,
              totalPages: Math.max(1, Math.ceil(total / pageSize)),
            }}
            onPageChange={setPage}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}

      <div
        className={cn(
          "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
          footerInsetLeft ? "left-(--sidebar-width)" : "left-0"
        )}
      >
        <div className="mx-auto flex w-full max-w-crud-page items-center justify-between gap-4 px-admin-content py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {lastSavedAt ? (
              <>
                <Check
                  className="size-4 text-green-600 dark:text-green-400"
                  aria-hidden
                />
                {t("autoSaved", {
                  time: formatDateTime(lastSavedAt.toISOString(), locale),
                })}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={dirtyKeys.length === 0 || saving}
              onClick={handleCancel}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!perms.update || dirtyKeys.length === 0 || saving}
              onClick={() => void handleSaveAll()}
            >
              <Save className="size-4" aria-hidden />
              {tCrud("btn.save")}
            </Button>
          </div>
        </div>
      </div>

      <OrderCompareDiscountDialog
        open={dialogOpen}
        scope={activeScope}
        initialRules={activeDraftKey ? drafts[activeDraftKey] : null}
        canSave={perms.update}
        onOpenChange={setDialogOpen}
        onSaved={handleDialogSaved}
      />
    </div>
  );
}
