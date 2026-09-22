"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import {
  fetchPurchaseDetail,
  fetchPurchaseList,
  type PurchaseListItem,
} from "@/lib/order-purchase-api";
import {
  fetchTicketDetail,
  OrderTicketApiError,
  type TicketDetail,
  type TicketItemDetail,
} from "@/lib/order-ticket-api";

import { PurchaseTicketExistingPosPanel } from "./purchase-ticket-existing-pos-panel";
import { PurchaseTicketReceiveDesktopSplitSkeleton } from "./purchase-ticket-receive-desktop-split-skeleton";
import { PurchaseTicketReceiveLeftPanel } from "./purchase-ticket-receive-left-panel";
import { PurchaseTicketReceiveSummaryPanel } from "./purchase-ticket-receive-summary-panel";
import {
  ticketLineToDraftLine,
  type ReceiveDraftCard,
  type ReceiveDraftLinePricing,
  type ReceiveSupplierOption,
} from "./purchase-ticket-receive-types";

const PurchaseTicketReceiveDesktopSplit = dynamic(
  () =>
    import("./purchase-ticket-receive-desktop-split").then(
      (m) => m.PurchaseTicketReceiveDesktopSplit
    ),
  { ssr: false, loading: () => <PurchaseTicketReceiveDesktopSplitSkeleton /> }
);

export function PurchaseTicketReceiveForm({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const t = useTranslations("page.orderPurchase.receive");

  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [draftCards, setDraftCards] = useState<ReceiveDraftCard[]>([]);
  const [existingOrders, setExistingOrders] = useState<PurchaseListItem[]>([]);
  const [lockedLineIds, setLockedLineIds] = useState<Set<number>>(
    () => new Set()
  );
  const [existingPoLoading, setExistingPoLoading] = useState(false);
  const [existingPoError, setExistingPoError] = useState<string | null>(null);
  const [existingPoEpoch, setExistingPoEpoch] = useState(0);
  const [rightCollapseSignal, setRightCollapseSignal] = useState(0);

  const checkRedirectAfterSaveRef = useRef(false);

  useEffect(() => {
    setDraftCards([]);
  }, [ticketId]);

  const loadDetail = useCallback(
    async (signal?: AbortSignal) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await fetchTicketDetail(ticketId);
        if (signal?.aborted) return;
        setDetail(data);
        setDetailLoading(false);
      } catch (e) {
        if (signal?.aborted) return;
        setDetail(null);
        setDetailLoading(false);
        setDetailError(
          e instanceof OrderTicketApiError ? e.message : t("loadError")
        );
      }
    },
    [ticketId, t]
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadDetail(ac.signal);
    return () => ac.abort();
  }, [loadDetail]);

  useEffect(() => {
    const ac = new AbortController();
    setExistingPoLoading(true);
    setExistingPoError(null);
    void (async () => {
      try {
        const list = await fetchPurchaseList({
          page: 1,
          limit: 100,
          purchase_request_id: String(ticketId),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setExistingOrders(list.items);
        const locked = new Set<number>();
        await Promise.all(
          list.items.map(async (row) => {
            try {
              const detailPo = await fetchPurchaseDetail(row.id);
              if (ac.signal.aborted) return;
              for (const item of detailPo.items) {
                if (item.purchase_request_item_id) {
                  locked.add(item.purchase_request_item_id);
                }
              }
            } catch {
              /* keep list row even if detail fails */
            }
          })
        );
        if (ac.signal.aborted) return;
        setLockedLineIds(locked);
        setExistingPoLoading(false);
      } catch {
        if (ac.signal.aborted) return;
        setExistingOrders([]);
        setLockedLineIds(new Set());
        setExistingPoError(t("existingPoLoadError"));
        setExistingPoLoading(false);
      }
    })();
    return () => ac.abort();
  }, [ticketId, existingPoEpoch, t]);

  const draftLineIds = useMemo(() => {
    const s = new Set<number>();
    for (const card of draftCards) {
      for (const line of card.lines) s.add(line.ticketItemId);
    }
    return s;
  }, [draftCards]);

  const lineItems: TicketItemDetail[] = detail?.items ?? [];

  const assignToSupplier = useCallback(
    (
      supplier: ReceiveSupplierOption,
      ticketLine: TicketItemDetail,
      pricing?: ReceiveDraftLinePricing
    ) => {
      if (lockedLineIds.has(ticketLine.id)) return;
      const line = ticketLineToDraftLine(ticketLine, pricing);
      setDraftCards((prev) => {
        const idx = prev.findIndex(
          (c) => c.supplierId === String(supplier.id)
        );
        if (idx >= 0) {
          const card = prev[idx]!;
          if (card.lines.some((l) => l.ticketItemId === line.ticketItemId)) {
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...card, lines: [...card.lines, line] };
          return next;
        }
        return [
          ...prev,
          {
            key: `card-${supplier.id}-${Date.now()}`,
            supplierId: String(supplier.id),
            supplierLabel: supplier.label,
            discount: 0,
            note: "",
            lines: [line],
          },
        ];
      });
      setRightCollapseSignal((n) => n + 1);
    },
    [lockedLineIds]
  );

  const onDraftSaveSuccess = useCallback(
    (_savedIds: number[]) => {
      checkRedirectAfterSaveRef.current = true;
      setExistingPoEpoch((e) => e + 1);
      void loadDetail();
    },
    [loadDetail]
  );

  useEffect(() => {
    if (!checkRedirectAfterSaveRef.current) return;
    if (detailLoading || detailError) return;
    const pendingLeft = (detail?.items ?? []).filter(
      (i) =>
        i.status === "pending" &&
        !lockedLineIds.has(i.id) &&
        !draftLineIds.has(i.id)
    );
    if (pendingLeft.length > 0 || draftCards.length > 0) {
      checkRedirectAfterSaveRef.current = false;
      return;
    }
    checkRedirectAfterSaveRef.current = false;
    router.push("/admin/order/purchase");
  }, [
    detail?.items,
    detailLoading,
    detailError,
    lockedLineIds,
    draftLineIds,
    draftCards.length,
    router,
  ]);

  // Keep rightCollapseSignal referenced so future focus wiring can use it.
  void rightCollapseSignal;

  const left = (
    <PurchaseTicketReceiveLeftPanel
      loading={detailLoading}
      error={detailError}
      detail={detail}
      lineItems={lineItems}
      lockedTicketLineIds={lockedLineIds}
      draftLineIds={draftLineIds}
      ticketId={ticketId}
      onAssignToSupplier={assignToSupplier}
      onTicketDetailInvalidate={() => {
        setExistingPoEpoch((e) => e + 1);
        void loadDetail();
      }}
      onCollapseRightPanels={() => setRightCollapseSignal((n) => n + 1)}
    />
  );

  const right = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {detail ? (
        <>
          <PurchaseTicketExistingPosPanel
            orders={existingOrders}
            loading={existingPoLoading}
            error={existingPoError}
          />
          <PurchaseTicketReceiveSummaryPanel
            cards={draftCards}
            setCards={setDraftCards}
            ticketId={ticketId}
            suppressEmptyPlaceholder={
              existingPoLoading || existingOrders.length > 0
            }
            onSaveSuccess={onDraftSaveSuccess}
          />
        </>
      ) : detailLoading ? (
        <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <PurchaseTicketReceiveDesktopSplit left={left} right={right} />
    </div>
  );
}
