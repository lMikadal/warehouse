"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { computeStoreSalesPriceSummary } from "@/lib/store-sales-cart-pricing";
import {
  createQuotation,
  fetchQuotationDetail,
  OrderQuotationApiError,
  patchQuotation,
  postQuotationAction,
  type QuotationItemInput,
} from "@/lib/order-quotation-api";
import {
  fetchStoreSalesMemberSnapshot,
  loadStoreSalesMemberComboboxOptions,
  resolveStoreSalesMemberLabel,
} from "@/lib/store-sales-member-combobox";
import { loadMemberUserCreditOptions } from "@/lib/member-user-filters-combobox";
import {
  fetchProductItems,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import { StoreSalesProductBrowseTable } from "../../store/_shared/store-sales-product-browse-table";
import { StoreSalesFormDesktopSplitSkeleton } from "../../store/_shared/store-sales-form-desktop-split-skeleton";

import {
  QuotationDocumentPanel,
  type QuotationCartLine,
} from "./quotation-document-panel";

const StoreSalesFormDesktopSplit = dynamic(
  () =>
    import("../../store/_shared/store-sales-form-desktop-split").then(
      (m) => m.StoreSalesFormDesktopSplit
    ),
  { ssr: false, loading: () => <StoreSalesFormDesktopSplitSkeleton /> }
);

type Props = { editId?: number };

export function QuotationFormPage({ editId }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const tPage = useTranslations("page.orderQuotation");
  const tStore = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_quotation");

  const [memberId, setMemberId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberTel, setMemberTel] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [reserveStock, setReserveStock] = useState(false);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<QuotationCartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  const browseQuery = useCrudListQuery();
  const [browseRows, setBrowseRows] = useState<ProductItemBrowseRow[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);

  const loadBrowse = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const res = await fetchProductItems(locale, {
        page: browseQuery.page,
        limit: browseQuery.pageSize,
        search: browseQuery.debouncedQuery || undefined,
      });
      setBrowseRows(res.items);
      setBrowseTotal(res.meta?.total ?? res.items.length);
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setBrowseLoading(false);
    }
  }, [
    locale,
    browseQuery.page,
    browseQuery.pageSize,
    browseQuery.debouncedQuery,
    tError,
  ]);

  useEffect(() => {
    void loadBrowse();
  }, [loadBrowse]);

  useEffect(() => {
    if (!editId || !perms.view) return;
    void (async () => {
      setLoading(true);
      try {
        const d = await fetchQuotationDetail(locale, editId);
        if (d.member_user_id) setMemberId(String(d.member_user_id));
        if (d.member_setting_credit_id)
          setCreditId(String(d.member_setting_credit_id));
        if (d.member_name) setMemberName(d.member_name);
        if (d.member_tel) setMemberTel(d.member_tel);
        if (d.member_email) setMemberEmail(d.member_email);
        setIssueDate(d.issue_date ?? "");
        setValidUntil(d.valid_until ?? "");
        setReserveStock(d.reserve_stock);
        setNotes(d.notes ?? "");
        setCart(
          d.items.map((it, i) => ({
            key: `line-${it.id ?? i}`,
            product_item_id: it.product_item_id ?? undefined,
            name: `#${it.product_item_id ?? ""}`,
            qty: it.amount,
            price: it.price_per_unit,
            discount: it.discount,
            lineTotal: it.total_price,
          }))
        );
      } catch {
        toast.error(tError("loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, locale, perms.view, tError]);

  const onMemberChange = async (id: string) => {
    setMemberId(id);
    if (!id) return;
    try {
      const snap = await fetchStoreSalesMemberSnapshot(locale, Number(id));
      setMemberName(snap.memberName ?? "");
      setMemberTel(snap.memberTel ?? "");
      setMemberEmail(snap.memberEmail ?? "");
    } catch {
      /* optional */
    }
  };

  const addProduct = (row: ProductItemBrowseRow) => {
    const key = `pi-${row.id}`;
    setCart((prev) => {
      const existing = prev.find((x) => x.key === key);
      if (existing) {
        return prev.map((x) =>
          x.key === key ? { ...x, qty: x.qty + 1 } : x
        );
      }
      const price = row.price ?? 0;
      return [
        ...prev,
        {
          key,
          product_item_id: row.id,
          name: row.name || row.sku || "",
          sku: row.sku,
          qty: 1,
          price,
          discount: 0,
          lineTotal: price,
        },
      ];
    });
  };

  const summary = useMemo(() => {
    if (cart.length === 0) return null;
    return computeStoreSalesPriceSummary(
      cart.map((c) => ({
        qty: c.qty,
        listPrice: c.price,
        discount: c.discount,
      })),
      7
    );
  }, [cart]);

  const bodyItems = (): QuotationItemInput[] =>
    cart.map((c) => ({
      product_item_id: c.product_item_id,
      amount: c.qty,
      price_per_unit: c.price,
      discount: c.discount,
    }));

  const save = async (submitAfter: boolean) => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        status: "draft" as const,
        member_user_id: memberId ? Number(memberId) : null,
        member_setting_credit_id: creditId ? Number(creditId) : null,
        member_name: memberName || null,
        member_tel: memberTel || null,
        member_email: memberEmail || null,
        issue_date: issueDate || null,
        valid_until: validUntil || null,
        reserve_stock: reserveStock,
        notes: notes || null,
        items: bodyItems(),
      };
      let id = editId;
      if (editId) {
        await patchQuotation(locale, editId, payload);
      } else {
        const created = await createQuotation(locale, payload);
        id = created.id;
      }
      if (submitAfter && id) {
        await postQuotationAction(locale, id, "submit", {});
      }
      router.push(`/admin/sales/quotation/${id}`);
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!perms.create && !editId) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return <StoreSalesFormDesktopSplitSkeleton />;
  }

  const browseColumn = (
    <div className="flex min-h-0 flex-col gap-4 md:h-full">
      <Card>
        <CardHeader>
          <CardTitle>{tStore("customerStep")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <RemoteComboboxField
            label={tStore("memberCode")}
            value={memberId}
            onValueChange={(v) => void onMemberChange(v)}
            placeholder={tStore("memberCodeSearchPlaceholder")}
            emptyLabel={tError("noData")}
            inputClassName="w-full"
            onLoadOptions={({ search, signal }) =>
              loadStoreSalesMemberComboboxOptions(locale, { search, signal })
            }
            resolveSelectedLabel={(v) =>
              resolveStoreSalesMemberLabel(locale, v)
            }
          />
          <RemoteComboboxField
            label={tStore("creditType")}
            value={creditId}
            onValueChange={setCreditId}
            disabled={!memberId}
            placeholder={tCrud("filter.select", { label: tStore("creditType") })}
            emptyLabel={tError("noData")}
            inputClassName="w-full"
            onLoadOptions={async ({ search, signal }) => {
              if (!memberId || signal?.aborted) return [];
              const { options } = await loadMemberUserCreditOptions(
                locale,
                search,
                1,
                Number(memberId)
              );
              return options;
            }}
          />
        </CardContent>
      </Card>
      <Card className="md:flex md:flex-1 md:flex-col md:min-h-0">
        <CardHeader>
          <CardTitle>{tStore("productStep")}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <CrudSearchField
            value={browseQuery.query}
            onChange={browseQuery.onSearchChange}
          />
          <StoreSalesProductBrowseTable
            rows={browseRows}
            loading={browseLoading}
            sortKey={null}
            sortDir={null}
            onSortChange={() => {}}
            selectedIds={{}}
            onToggleRow={() => {}}
            onTogglePage={() => {}}
            onAdd={(row) => addProduct(row)}
            onOpenCars={() => {}}
            onOpenWarehouse={() => {}}
          />
          <CrudPaginationBar
            page={browseQuery.page}
            pageSize={browseQuery.pageSize}
            meta={{
              total: browseTotal,
              totalPages: browseQuery.totalPages(browseTotal),
            }}
            onPageChange={browseQuery.setPage}
            onPageSizeChange={(s) =>
              browseQuery.onPageSizeChange(s as typeof browseQuery.pageSize)
            }
          />
        </CardContent>
      </Card>
    </div>
  );

  const documentColumn = (
    <QuotationDocumentPanel
      issueDate={issueDate}
      validUntil={validUntil}
      reserveStock={reserveStock}
      notes={notes}
      lines={cart}
      summary={summary}
      onIssueDateChange={setIssueDate}
      onValidUntilChange={setValidUntil}
      onReserveStockChange={setReserveStock}
      onNotesChange={setNotes}
      onQtyChange={(key, qty) =>
        setCart((prev) =>
          prev.map((x) =>
            x.key === key
              ? { ...x, qty, lineTotal: qty * x.price - x.discount }
              : x
          )
        )
      }
      onRemove={(key) => setCart((prev) => prev.filter((x) => x.key !== key))}
      onCancel={() => router.push("/admin/sales/quotation")}
      onSaveDraft={() => void save(false)}
      onSubmit={() => void save(true)}
      saving={saving}
    />
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-20">
      <CrudPageHeader
        title={editId ? tPage("form.titleEdit") : tPage("form.titleCreate")}
      />
      <StoreSalesFormDesktopSplit
        browse={browseColumn}
        documentPanel={documentColumn}
      />
    </div>
  );
}
