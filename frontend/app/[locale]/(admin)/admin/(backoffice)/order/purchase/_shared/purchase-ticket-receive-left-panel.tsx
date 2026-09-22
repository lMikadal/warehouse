"use client";

import { Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseStockHistoryRow } from "@/lib/order-purchase-api";
import {
  fetchTicketHistory,
  type TicketDetail,
  type TicketHistoryEntry,
  type TicketItemDetail,
  type TicketItemReject,
} from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

import { PurchaseCancelLineDialog } from "./purchase-cancel-line-dialog";
import { PurchaseChangeBrandDialog } from "./purchase-change-brand-dialog";
import {
  PurchaseConsiderTopicsDialog,
  type PurchaseConsiderTopic,
} from "./purchase-consider-topics-dialog";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseOutOfStockWaitDialog } from "./purchase-out-of-stock-wait-dialog";
import {
  PurchaseStockHistoryDialog,
  type PurchaseStockHistoryTarget,
} from "./purchase-stock-history-dialog";
import { PurchaseStopOrderingDialog } from "./purchase-stop-ordering-dialog";
import { PurchaseSupplierSelectDialog } from "./purchase-supplier-select-dialog";
import {
  ticketLineDisplayName,
  type ReceiveDraftLinePricing,
  type ReceiveSupplierOption,
} from "./purchase-ticket-receive-types";
import { ticketStatusPillClass } from "../../../sales/ticket/_shared/ticket-status-styles";

const gridCatalog =
  "grid grid-cols-[minmax(0,1.2fr)_minmax(5rem,0.7fr)_5.5rem_5.5rem_4rem_5.5rem_minmax(5rem,6rem)] gap-x-2 gap-y-1 px-3 py-3 text-sm";
const gridCustom =
  "grid grid-cols-[minmax(0,1.2fr)_5.5rem_5.5rem_4rem_5.5rem_minmax(5rem,6rem)] gap-x-2 gap-y-1 px-3 py-3 text-sm";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pendingRejectForLine(
  item: TicketItemDetail
): TicketItemReject | undefined {
  return item.rejects.find((r) => r.status === "pending");
}

function rejectTypeLabel(
  type: TicketItemReject["type"],
  t: (key: string) => string
): string {
  switch (type) {
    case "change":
      return t("ticketLineRejectTypeChange");
    case "wait":
      return t("ticketLineRejectTypeWait");
    case "stop":
      return t("ticketLineRejectTypeStop");
    case "reject":
      return t("ticketLineRejectTypeReject");
    default:
      return type;
  }
}

export type PurchaseTicketReceiveLeftPanelProps = {
  loading: boolean;
  error: string | null;
  detail: TicketDetail | null;
  lineItems: TicketItemDetail[];
  lockedTicketLineIds: Set<number>;
  draftLineIds: Set<number>;
  ticketId: number;
  onAssignToSupplier: (
    supplier: ReceiveSupplierOption,
    ticketLine: TicketItemDetail,
    pricing?: ReceiveDraftLinePricing
  ) => void;
  onTicketDetailInvalidate: () => void;
  onCollapseRightPanels?: () => void;
};

export function PurchaseTicketReceiveLeftPanel({
  loading,
  error,
  detail,
  lineItems,
  lockedTicketLineIds,
  draftLineIds,
  ticketId,
  onAssignToSupplier,
  onTicketDetailInvalidate,
  onCollapseRightPanels,
}: PurchaseTicketReceiveLeftPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderPurchase.receive");
  const tTicket = useTranslations("page.orderTicket");
  const tUnit = useTranslations("page.orderPurchase.unit");

  const [supplierOpen, setSupplierOpen] = useState(false);
  const [pendingLine, setPendingLine] = useState<TicketItemDetail | null>(null);
  const [pendingPricing, setPendingPricing] = useState<
    ReceiveDraftLinePricing | undefined
  >();
  const [stockTarget, setStockTarget] =
    useState<PurchaseStockHistoryTarget | null>(null);
  const [stockPendingLine, setStockPendingLine] =
    useState<TicketItemDetail | null>(null);

  const [historyEntries, setHistoryEntries] = useState<TicketHistoryEntry[]>(
    []
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [considerCatalog, setConsiderCatalog] =
    useState<TicketItemDetail | null>(null);
  const [considerCustom, setConsiderCustom] =
    useState<TicketItemDetail | null>(null);
  const [stopOrderingItem, setStopOrderingItem] =
    useState<TicketItemDetail | null>(null);
  const [cancelLineItem, setCancelLineItem] =
    useState<TicketItemDetail | null>(null);
  const [outOfStockWaitItem, setOutOfStockWaitItem] =
    useState<TicketItemDetail | null>(null);
  const [changeBrandItem, setChangeBrandItem] =
    useState<TicketItemDetail | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    const ac = new AbortController();
    fetchTicketHistory(locale, ticketId)
      .then((res) => {
        if (!ac.signal.aborted) setHistoryEntries(res.items);
      })
      .catch(() => {
        if (!ac.signal.aborted) setHistoryEntries([]);
      });
    return () => ac.abort();
  }, [ticketId, locale, detail?.updated_at]);

  const catalogItems = useMemo(
    () => lineItems.filter((i) => i.type === "catalog"),
    [lineItems]
  );
  const customItems = useMemo(
    () => lineItems.filter((i) => i.type === "custom"),
    [lineItems]
  );

  const previewHistory = useMemo(
    () =>
      [...historyEntries]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 2),
    [historyEntries]
  );

  function statusLabel(status: string): string {
    if (status === "pending") return t("statusBadgePendingApproval");
    try {
      return tTicket(`status.${status}`);
    } catch {
      return status;
    }
  }

  function unitLabel(unit: string): string {
    if (unit === "piece" || unit === "box" || unit === "set") {
      return tUnit(unit);
    }
    return unit || "—";
  }

  function canConsider(item: TicketItemDetail): boolean {
    if (item.status !== "pending") return false;
    if (lockedTicketLineIds.has(item.id)) return false;
    return true;
  }

  function openSupplier(item: TicketItemDetail) {
    onCollapseRightPanels?.();
    setPendingLine(item);
    setPendingPricing(undefined);
    setSupplierOpen(true);
  }

  function handleCatalogTopic(topic: PurchaseConsiderTopic) {
    const item = considerCatalog;
    setConsiderCatalog(null);
    if (!item) return;
    if (topic === "compare_prices") {
      const pid = item.product_item_id;
      if (!pid) {
        toast.error(t("stopOrderingModal.missingProductItem"));
        return;
      }
      onCollapseRightPanels?.();
      setStockPendingLine(item);
      setStockTarget({
        productItemId: pid,
        productName: ticketLineDisplayName(item),
      });
      return;
    }
    if (topic === "select_partner") {
      openSupplier(item);
      return;
    }
    if (topic === "stop_ordering") {
      if (item.type !== "catalog" || !item.product_item_id) {
        toast.error(
          item.type !== "catalog"
            ? t("stopOrderingModal.ineligibleType")
            : t("stopOrderingModal.missingProductItem")
        );
        return;
      }
      setStopOrderingItem(item);
      return;
    }
    if (topic === "cancel_line") {
      setCancelLineItem(item);
      return;
    }
    if (topic === "out_of_stock_wait") {
      setOutOfStockWaitItem(item);
      return;
    }
    if (topic === "change_brand") {
      if (item.type !== "catalog" || !item.product_item_id) {
        toast.error(
          item.type !== "catalog"
            ? t("changeBrandModal.ineligibleType")
            : t("changeBrandModal.missingProductItem")
        );
        return;
      }
      setChangeBrandItem(item);
    }
  }

  function handleCustomTopic(topic: PurchaseConsiderTopic) {
    const item = considerCustom;
    setConsiderCustom(null);
    if (!item) return;
    if (topic === "cancel_line") {
      setCancelLineItem(item);
      return;
    }
    if (topic === "select_partner") openSupplier(item);
  }

  function handleStockSelect(row: PurchaseStockHistoryRow) {
    if (!stockPendingLine || !row.supplier_user_id) return;
    onAssignToSupplier(
      {
        id: row.supplier_user_id,
        label: row.supplier_name?.trim() || String(row.supplier_user_id),
      },
      stockPendingLine,
      {
        pricePerUnit: row.cost_per_unit,
        discount: row.discount_per_unit ?? 0,
      }
    );
    setStockTarget(null);
    setStockPendingLine(null);
  }

  function renderProductCell(item: TicketItemDetail) {
    return (
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          <Package className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium">{ticketLineDisplayName(item)}</p>
          {item.product_item_sku ? (
            <p className="truncate text-xs text-muted-foreground">
              {item.product_item_sku}
            </p>
          ) : null}
          {item.type === "catalog" ? (
            <p className="text-xs text-muted-foreground">
              {tTicket("form.colStock")}: {item.stock_qty}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  function renderDetails(item: TicketItemDetail) {
    const parts = [
      item.brand_name,
      item.model_name,
      item.engine_name,
      item.identification_number,
      item.note,
    ].filter((v) => v?.trim());
    if (parts.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="space-y-0.5 text-xs">
        {item.brand_name ? (
          <p className="text-primary">{item.brand_name}</p>
        ) : null}
        {item.model_name ? (
          <p className="text-muted-foreground">{item.model_name}</p>
        ) : null}
        {item.engine_name ? (
          <p className="text-muted-foreground">{item.engine_name}</p>
        ) : null}
        {item.identification_number ? (
          <p className="text-muted-foreground">{item.identification_number}</p>
        ) : null}
        {item.note ? (
          <p className="text-muted-foreground">{item.note}</p>
        ) : null}
      </div>
    );
  }

  function renderRejectExpansion(item: TicketItemDetail) {
    const reject = pendingRejectForLine(item);
    if (!reject) return null;
    return (
      <div className="col-span-full mt-1 rounded-md border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs dark:border-rose-900 dark:bg-rose-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-rose-800 dark:text-rose-200">
            {t("ticketLineRejectProblemPrefix")}{" "}
            {rejectTypeLabel(reject.type, t)}
            {reject.note ? ` — ${reject.note}` : ""}
            {reject.date ? ` (${reject.date})` : ""}
          </p>
          <span className="rounded-full border border-rose-300 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:border-rose-800 dark:text-rose-300">
            {t("ticketLineRejectStatusPending")}
          </span>
        </div>
        {reject.product_item_name ? (
          <p className="mt-1 text-muted-foreground">
            {t("ticketLineRejectSectionTitle")}: {reject.product_item_name}
          </p>
        ) : null}
      </div>
    );
  }

  function renderCatalogRow(item: TicketItemDetail) {
    const inDraft = draftLineIds.has(item.id);
    const locked = lockedTicketLineIds.has(item.id);
    const enabled = canConsider(item) && !inDraft;
    return (
      <div
        key={item.id}
        className={cn(
          "border-b last:border-b-0",
          (inDraft || locked) && "opacity-40"
        )}
      >
        <div className={cn(gridCatalog, "items-center")}>
          <div>{renderProductCell(item)}</div>
          <div>{renderDetails(item)}</div>
          <div className="text-center tabular-nums">{item.qty_sell}</div>
          <div className="text-center tabular-nums">{item.qty_reorder}</div>
          <div className="text-center">{unitLabel(item.unit)}</div>
          <div className="text-right tabular-nums">
            {money(item.deposit, locale)}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              disabled={!enabled}
              title={locked ? t("lineLinkedPurchaseOrder") : undefined}
              onClick={() => setConsiderCatalog(item)}
            >
              {t("btnConsider")}
            </Button>
          </div>
        </div>
        <div className="px-3 pb-2">{renderRejectExpansion(item)}</div>
      </div>
    );
  }

  function renderCustomRow(item: TicketItemDetail) {
    const inDraft = draftLineIds.has(item.id);
    const locked = lockedTicketLineIds.has(item.id);
    const enabled = canConsider(item) && !inDraft;
    return (
      <div
        key={item.id}
        className={cn(
          "border-b last:border-b-0",
          (inDraft || locked) && "opacity-40"
        )}
      >
        <div className={cn(gridCustom, "items-center")}>
          <div>{renderProductCell(item)}</div>
          <div className="text-center tabular-nums">{item.qty_sell}</div>
          <div className="text-center tabular-nums">{item.qty_reorder}</div>
          <div className="text-center">{unitLabel(item.unit)}</div>
          <div className="text-right tabular-nums">
            {money(item.deposit, locale)}
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              disabled={!enabled}
              title={locked ? t("lineLinkedPurchaseOrder") : undefined}
              onClick={() => setConsiderCustom(item)}
            >
              {t("btnConsider")}
            </Button>
          </div>
        </div>
        <div className="px-3 pb-2">{renderRejectExpansion(item)}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 text-sm text-destructive">
        {error ?? t("loadError")}
      </div>
    );
  }

  const defaultTab = catalogItems.length > 0 ? "catalog" : "custom";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <PurchaseConsiderTopicsDialog
        open={considerCatalog != null}
        onOpenChange={(open) => {
          if (!open) setConsiderCatalog(null);
        }}
        onTopicSelect={handleCatalogTopic}
      />
      <PurchaseConsiderTopicsDialog
        open={considerCustom != null}
        onOpenChange={(open) => {
          if (!open) setConsiderCustom(null);
        }}
        onTopicSelect={handleCustomTopic}
        visibleTopics={["select_partner", "cancel_line"]}
      />
      <PurchaseStopOrderingDialog
        open={stopOrderingItem != null}
        onOpenChange={(open) => {
          if (!open) setStopOrderingItem(null);
        }}
        ticketId={ticketId}
        lineItem={stopOrderingItem}
        onSuccess={onTicketDetailInvalidate}
      />
      <PurchaseCancelLineDialog
        open={cancelLineItem != null}
        onOpenChange={(open) => {
          if (!open) setCancelLineItem(null);
        }}
        ticketId={ticketId}
        lineItem={cancelLineItem}
        onSuccess={onTicketDetailInvalidate}
      />
      <PurchaseOutOfStockWaitDialog
        open={outOfStockWaitItem != null}
        onOpenChange={(open) => {
          if (!open) setOutOfStockWaitItem(null);
        }}
        ticketId={ticketId}
        lineItem={outOfStockWaitItem}
        onSuccess={onTicketDetailInvalidate}
      />
      <PurchaseChangeBrandDialog
        open={changeBrandItem != null}
        onOpenChange={(open) => {
          if (!open) setChangeBrandItem(null);
        }}
        ticketId={ticketId}
        lineItem={changeBrandItem}
        onSuccess={onTicketDetailInvalidate}
      />
      <PurchaseSupplierSelectDialog
        open={supplierOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLine(null);
            setPendingPricing(undefined);
          }
          setSupplierOpen(open);
        }}
        onConfirm={(supplier) => {
          if (!pendingLine) return;
          onAssignToSupplier(supplier, pendingLine, pendingPricing);
          setPendingLine(null);
          setPendingPricing(undefined);
        }}
      />
      <PurchaseStockHistoryDialog
        target={stockTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStockTarget(null);
            setStockPendingLine(null);
          }
        }}
        onSelectRow={handleStockSelect}
      />
      <PurchaseHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        entries={historyEntries}
      />

      <header className="shrink-0 space-y-2 pt-1 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t("headerTitle")}</span>
          <span className={ticketStatusPillClass(detail.status)}>
            {statusLabel(detail.status)}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight tabular-nums lg:text-[1.65rem]">
          {detail.sku}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("createdDate")}{" "}
          <span className="tabular-nums">
            {formatDateTime(detail.created_at, locale)}
          </span>
          <span className="mx-1 text-muted-foreground/70" aria-hidden>
            |
          </span>
          {t("headerCreatorLabel")}:{" "}
          <span className="tabular-nums">
            {detail.created_by_name?.trim() || "—"}
          </span>
        </p>
      </header>

      <Tabs
        defaultValue={defaultTab}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-4 rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger
            value="catalog"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary"
          >
            {t("tabOldItems")} ({catalogItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="custom"
            className="rounded-none border-b-2 border-transparent px-1 pb-2 data-[state=active]:border-primary"
          >
            {t("tabNewItems")} ({customItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="catalog"
          className="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
        >
          <div
            className={cn(
              gridCatalog,
              "sticky top-0 z-10 items-end border-b bg-muted/40 py-2 text-xs font-medium"
            )}
          >
            <div>{t("colProduct")}</div>
            <div>{t("colDetails")}</div>
            <div className="text-center">
              <div>{t("colQtyWanted")}</div>
              <div className="font-normal text-muted-foreground">
                {t("colSellShort")}
              </div>
            </div>
            <div className="text-center">
              <div className="invisible">{t("colQtyWanted")}</div>
              <div className="font-normal text-muted-foreground">
                {t("colReorderShort")}
              </div>
            </div>
            <div className="text-center">{t("colUnit")}</div>
            <div className="text-right">{t("colDeposit")}</div>
            <div className="text-center">{t("colManage")}</div>
          </div>
          {catalogItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("emptyItems")}
            </p>
          ) : (
            catalogItems.map(renderCatalogRow)
          )}
        </TabsContent>

        <TabsContent
          value="custom"
          className="mt-0 min-h-0 flex-1 overflow-auto data-[state=inactive]:hidden"
        >
          <div
            className={cn(
              gridCustom,
              "sticky top-0 z-10 items-end border-b bg-muted/40 py-2 text-xs font-medium"
            )}
          >
            <div>{t("colProduct")}</div>
            <div className="text-center">{t("colQtySell")}</div>
            <div className="text-center">{t("colQtyReorder")}</div>
            <div className="text-center">{t("colUnit")}</div>
            <div className="text-right">{t("colOpeningPrice")}</div>
            <div className="text-center">{t("colManage")}</div>
          </div>
          {customItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t("emptyItems")}
            </p>
          ) : (
            customItems.map(renderCustomRow)
          )}
        </TabsContent>
      </Tabs>

      <Card className="mt-3 shrink-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
          <CardTitle className="text-sm font-semibold">
            {t("historyTitle")}
          </CardTitle>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => setHistoryModalOpen(true)}
          >
            {t("historyViewAll")}
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {previewHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          ) : (
            <ol className="relative space-y-3 border-l border-primary/30 pl-4">
              {previewHistory.map((entry) => (
                <li key={entry.id} className="relative text-sm">
                  <span
                    className="absolute left-[-1.3rem] top-1.5 size-2 rounded-full bg-primary"
                    aria-hidden
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at, locale)}{" "}
                    <span className="font-medium text-foreground">
                      {entry.created_by_name?.trim() ||
                        t("historyActorUnknown")}
                    </span>{" "}
                    {entry.title}
                  </p>
                  {entry.description ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
