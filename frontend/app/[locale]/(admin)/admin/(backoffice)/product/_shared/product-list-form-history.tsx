"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import type { RemoteComboboxLoadContext } from "@/components/molecules/remote-combobox-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchProductListHistoryPurchase,
  fetchProductListHistorySales,
  type HistoryGroupBy,
  type ListItemBody,
  type PurchaseHistoryChild,
  type PurchaseHistoryResponse,
  type SalesHistoryResponse,
} from "@/lib/product-list-api";

import {
  ProductListFormHistoryFilters,
  type HistoryFilterOption,
  type HistoryFiltersState,
} from "./product-list-form-history-filters";
import { ProductListFormHistoryPurchaseTable } from "./product-list-form-history-purchase-table";
import {
  ProductListFormHistoryPurchaseSummary,
  ProductListFormHistorySalesSummary,
} from "./product-list-form-history-summary";
import { ProductListFormHistorySalesTable } from "./product-list-form-history-sales-table";
import { ProductListFormVariantLotModal } from "./product-list-form-variant-lot-modals";

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function bangkokYmd(d = new Date()) {
  // Display/filter dates are calendar days; use local getters (Asia/Bangkok hosts).
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function defaultFilters(): HistoryFiltersState {
  const now = new Date();
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  return {
    viewMode: "day",
    dateFrom: `${y}-01-01`,
    dateTo: bangkokYmd(now),
    monthFrom: `${y}-01`,
    monthTo: `${y}-${m}`,
    yearFrom: String(y),
    yearTo: String(y),
    itemId: "all",
    partyId: "all",
  };
}

function toQueryParams(
  mode: "purchase" | "sales",
  f: HistoryFiltersState
): Record<string, string> {
  const params: Record<string, string> = { group_by: f.viewMode };
  if (f.viewMode === "day") {
    if (f.dateFrom) params.date_from = f.dateFrom;
    if (f.dateTo) params.date_to = f.dateTo;
  } else if (f.viewMode === "month") {
    if (f.monthFrom) params.month_from = f.monthFrom;
    if (f.monthTo) params.month_to = f.monthTo;
  } else {
    if (f.yearFrom) params.year_from = f.yearFrom;
    if (f.yearTo) params.year_to = f.yearTo;
  }
  if (f.itemId && f.itemId !== "all") params.product_item_id = f.itemId;
  if (f.partyId && f.partyId !== "all") {
    if (mode === "purchase") params.supplier_id = f.partyId;
    else params.customer = f.partyId;
  }
  return params;
}

type Props = {
  listId?: number;
  items: ListItemBody[];
  listSku: string;
  listSupplierIds: number[];
  canMutateLots: boolean;
  loadSuppliers: (
    ctx: RemoteComboboxLoadContext
  ) => Promise<{ value: string; label: string }[]>;
  onStockChanged?: () => void;
};

export function ProductListFormHistory({
  listId,
  items,
  listSku,
  listSupplierIds,
  canMutateLots,
  loadSuppliers,
  onStockChanged,
}: Props) {
  const locale = useLocale();
  const tForm = useTranslations("productListForm");
  const tError = useTranslations("error");

  const [subTab, setSubTab] = useState<"purchase" | "sales">("purchase");
  const [purchaseFilters, setPurchaseFilters] = useState(defaultFilters);
  const [salesFilters, setSalesFilters] = useState(defaultFilters);

  const [purchase, setPurchase] = useState<PurchaseHistoryResponse | null>(null);
  const [sales, setSales] = useState<SalesHistoryResponse | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);

  const [lotItem, setLotItem] = useState<ListItemBody | null>(null);
  const [lotOpen, setLotOpen] = useState(false);
  const [lotSession, setLotSession] = useState(0);

  const itemOptions: HistoryFilterOption[] = useMemo(
    () =>
      items
        .filter((it) => it.id != null && it.id > 0)
        .map((it) => ({
          value: String(it.id),
          label: it.sku?.trim() || `#${it.id}`,
        })),
    [items]
  );

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const out: string[] = [];
    for (let i = y - 10; i <= y + 1; i++) out.push(String(i));
    return out;
  }, []);

  const purchasePartyOptions: HistoryFilterOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of purchase?.groups ?? []) {
      for (const c of g.children) {
        if (c.supplier_id != null) {
          map.set(String(c.supplier_id), c.supplier_name || String(c.supplier_id));
        }
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [purchase]);

  const salesPartyOptions: HistoryFilterOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const g of sales?.groups ?? []) {
      for (const c of g.children) {
        if (c.customer && c.customer !== "—") set.add(c.customer);
      }
    }
    return [...set].sort().map((v) => ({ value: v, label: v }));
  }, [sales]);

  const loadPurchase = useCallback(async () => {
    if (!listId) {
      setPurchase(null);
      return;
    }
    setPurchaseLoading(true);
    try {
      const data = await fetchProductListHistoryPurchase(
        locale,
        listId,
        toQueryParams("purchase", purchaseFilters)
      );
      setPurchase(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tError("generic"));
      setPurchase(null);
    } finally {
      setPurchaseLoading(false);
    }
  }, [listId, locale, purchaseFilters, tError]);

  const loadSales = useCallback(async () => {
    if (!listId) {
      setSales(null);
      return;
    }
    setSalesLoading(true);
    try {
      const data = await fetchProductListHistorySales(
        locale,
        listId,
        toQueryParams("sales", salesFilters)
      );
      setSales(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tError("generic"));
      setSales(null);
    } finally {
      setSalesLoading(false);
    }
  }, [listId, locale, salesFilters, tError]);

  useEffect(() => {
    if (subTab !== "purchase") return;
    void loadPurchase();
  }, [subTab, loadPurchase]);

  useEffect(() => {
    if (subTab !== "sales") return;
    void loadSales();
  }, [subTab, loadSales]);

  const openLots = (child: PurchaseHistoryChild) => {
    const item = items.find((it) => it.id === child.product_item_id) ?? null;
    if (!item) return;
    setLotItem(item);
    setLotSession((n) => n + 1);
    setLotOpen(true);
  };

  if (!listId) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        {tForm("histPhasePending")}
      </p>
    );
  }

  const purchaseGroupBy = (purchase?.group_by ||
    purchaseFilters.viewMode) as HistoryGroupBy;
  const salesGroupBy = (sales?.group_by ||
    salesFilters.viewMode) as HistoryGroupBy;

  return (
    <div className="space-y-4">
      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v === "sales" ? "sales" : "purchase")}
      >
        <TabsList variant="line">
          <TabsTrigger value="purchase">{tForm("histTabPurchase")}</TabsTrigger>
          <TabsTrigger value="sales">{tForm("histTabSales")}</TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="mt-4 space-y-4">
          <ProductListFormHistoryFilters
            mode="purchase"
            value={purchaseFilters}
            onChange={setPurchaseFilters}
            onClear={() => setPurchaseFilters(defaultFilters())}
            itemOptions={itemOptions}
            partyOptions={purchasePartyOptions}
            yearOptions={yearOptions}
          />
          {purchaseLoading ? (
            <HistorySkeleton cards={5} />
          ) : (
            <>
              <ProductListFormHistoryPurchaseSummary
                summary={purchase?.summary ?? null}
              />
              <ProductListFormHistoryPurchaseTable
                groupBy={purchaseGroupBy}
                groups={purchase?.groups ?? []}
                onOpenLots={openLots}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <ProductListFormHistoryFilters
            mode="sales"
            value={salesFilters}
            onChange={setSalesFilters}
            onClear={() => setSalesFilters(defaultFilters())}
            itemOptions={itemOptions}
            partyOptions={salesPartyOptions}
            yearOptions={yearOptions}
          />
          {salesLoading ? (
            <HistorySkeleton cards={4} />
          ) : (
            <>
              <ProductListFormHistorySalesSummary
                summary={sales?.summary ?? null}
              />
              <ProductListFormHistorySalesTable
                groupBy={salesGroupBy}
                groups={sales?.groups ?? []}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <ProductListFormVariantLotModal
        key={lotSession}
        item={lotItem}
        listSku={listSku}
        listSupplierIds={listSupplierIds}
        open={lotOpen}
        onOpenChange={setLotOpen}
        canMutate={canMutateLots}
        loadSuppliers={loadSuppliers}
        onStockChanged={onStockChanged}
      />
    </div>
  );
}

function HistorySkeleton({ cards }: { cards: number }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <div
        className={`grid gap-3 sm:grid-cols-2 ${cards >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
