"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { formatDate, type DisplayLocale } from "@/lib/format-datetime";
import {
  createPickingExtraOrder,
  OrderPickingApiError,
  patchPickingItem,
  patchPickingStatus,
  verifyPickingApproval,
  type PickingItemDetail,
  type PickingItemStatus,
  type PickingOrderDetail,
} from "@/lib/order-picking-api";
import { fetchOrderSalesFormItems } from "@/lib/order-sales-form-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { computeStoreSalesPriceSummary } from "@/lib/store-sales-cart-pricing";

import { loadPickingFamily } from "../_lib/picking-family";
import {
  familySku,
  hasRemainingItems,
  hasStoreCheckInProgress,
  isMappedLine,
  matchesProductScan,
  orderLineFromItem,
  orderLinesFromItems,
  proratedDiscount,
  remainingQty,
  statusFromChecked,
  summaryLinesFromOrderLines,
  wholeQty,
  type PickingOrderLine,
} from "../_lib/picking-lines";
import {
  clearCreditApprovedBy,
  setCreditApprovedBy,
  setExtraPayLines,
} from "../_lib/picking-session";
import {
  ApproverPasswordDialog,
  CreditExceededDialog,
  RemainingStockDialog,
} from "./picking-dialogs";
import {
  BLANK_VERIFY,
  PickingCustomerCard,
  PickingExtraOrderPanel,
  PickingFormFooter,
  PickingItemsPanel,
  PickingOrderSummaryPanel,
  PickingVerifyCard,
  type PickingCustomerDisplay,
  type PickingExtraCard,
  type PickingVerifySelection,
} from "./picking-panels";

const LIST_HREF = "/admin/sales/order";

type Props = {
  orderId: number;
  /** `view` locks every control; `extraPay` bills only what this round verified. */
  mode?: "view" | "extraPay";
};

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

export function PickingFormPage({ orderId, mode }: Props) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPicking");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_order");

  const readOnly = mode === "view";
  const extraPay = mode === "extraPay";
  const canUpdate = perms.update && !readOnly;
  const canCreate = perms.create && !readOnly;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<PickingOrderDetail[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<
    Map<number, PickingItemDetail[]>
  >(() => new Map());
  const [productsById, setProductsById] = useState<
    Map<number, ProductItemBrowseRow>
  >(() => new Map());
  const [activeOrderId, setActiveOrderId] = useState(orderId);
  const [vatPercent, setVatPercent] = useState(0);
  const [customer, setCustomer] = useState<PickingCustomerDisplay | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [verify, setVerify] = useState<PickingVerifySelection>(BLANK_VERIFY);
  /** Extra-pay only: the round bills what this session verified, not the whole slip. */
  const [roundLines, setRoundLines] = useState<PickingOrderLine[]>([]);
  const [pendingExtra, setPendingExtra] = useState<
    { itemId: number; orderId: number; qty: number }[]
  >([]);
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  const [remainingStockOpen, setRemainingStockOpen] = useState(false);
  const [creditExceededOpen, setCreditExceededOpen] = useState(false);
  const [approverOpen, setApproverOpen] = useState(false);
  const [approverLoading, setApproverLoading] = useState(false);
  const [approverError, setApproverError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const family = await loadPickingFamily(locale, orderId);

      const nextItems = new Map<number, PickingItemDetail[]>();
      for (const o of family.orders) nextItems.set(o.id, o.items);

      setOrders(family.orders);
      setItemsByOrder(nextItems);
      setProductsById(family.productsById);
      setCreditLimit(family.creditLimit);
      setVatPercent(family.vatPercent);
      setCustomer(family.customer);
      setActiveOrderId((cur) =>
        family.orders.some((o) => o.id === cur) ? cur : family.orders[0].id
      );
    } catch (e) {
      toast.error(
        e instanceof OrderPickingApiError ? e.message : tPage("notFound")
      );
      router.replace(LIST_HREF);
    } finally {
      setLoading(false);
    }
  }, [orderId, locale, router, tPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const root = useMemo(
    () => orders.find((o) => o.parent_id == null) ?? orders[0] ?? null,
    [orders]
  );

  /** A child slip still in draft has not reached the picking desk; it is an extra order instead. */
  const pickingOrders = useMemo(
    () => orders.filter((o) => o.doc_status !== "draft"),
    [orders]
  );
  const draftOrders = useMemo(
    () => orders.filter((o) => o.doc_status === "draft"),
    [orders]
  );

  const allItems = useMemo(
    () => [...itemsByOrder.values()].flat(),
    [itemsByOrder]
  );

  const orderLines = useMemo(() => {
    if (extraPay) return roundLines;
    const lines: PickingOrderLine[] = [];
    for (const order of pickingOrders) {
      lines.push(
        ...orderLinesFromItems(
          order.id,
          itemsByOrder.get(order.id) ?? [],
          productsById
        )
      );
    }
    return lines;
  }, [extraPay, roundLines, pickingOrders, itemsByOrder, productsById]);

  const extraCards = useMemo<PickingExtraCard[]>(() => {
    const cards: PickingExtraCard[] = draftOrders.map((order) => ({
      key: `order-${order.id}`,
      orderId: order.id,
      sku: order.sku,
      lines: (itemsByOrder.get(order.id) ?? []).map((item) => ({
        itemId: item.id,
        orderId: order.id,
        product: item.product_item_id
          ? productsById.get(item.product_item_id)
          : undefined,
        qty: wholeQty(item.amount),
        amountChecked: wholeQty(item.amount_checked),
        status: item.status,
        pricePerUnit: item.price_per_unit,
        discount: item.discount,
        persisted: true,
      })),
    }));
    if (pendingExtra.length > 0) {
      cards.push({
        key: "pending",
        lines: pendingExtra.map((p) => {
          const item = (itemsByOrder.get(p.orderId) ?? []).find(
            (i) => i.id === p.itemId
          );
          return {
            itemId: p.itemId,
            orderId: p.orderId,
            product: item?.product_item_id
              ? productsById.get(item.product_item_id)
              : undefined,
            qty: p.qty,
            amountChecked: wholeQty(item?.amount_checked ?? 0),
            status: item?.status ?? "pending",
            pricePerUnit: item?.price_per_unit ?? 0,
            discount: item ? proratedDiscount(item, p.qty) : 0,
            persisted: false,
          };
        }),
      });
    }
    return cards;
  }, [draftOrders, itemsByOrder, productsById, pendingExtra]);

  const selectedItem = useMemo(() => {
    if (verify.orderId == null || verify.itemId == null) return null;
    return (
      (itemsByOrder.get(verify.orderId) ?? []).find(
        (i) => i.id === verify.itemId
      ) ?? null
    );
  }, [verify.orderId, verify.itemId, itemsByOrder]);

  const maxVerifyQty = selectedItem
    ? remainingQty(selectedItem.amount, selectedItem.amount_checked)
    : 0;
  const canIssueLoan = (root?.member_user_id ?? 0) > 0;
  const canSettle =
    orderLines.length >= 1 && !hasStoreCheckInProgress(allItems);

  const applyItem = (orderId: number, next: PickingItemDetail) => {
    setItemsByOrder((prev) => {
      const map = new Map(prev);
      const rows = map.get(orderId);
      if (!rows) return prev;
      map.set(
        orderId,
        rows.map((row) => (row.id === next.id ? next : row))
      );
      return map;
    });
  };

  const selectItem = (ownerId: number, item: PickingItemDetail) => {
    const product = item.product_item_id
      ? productsById.get(item.product_item_id)
      : undefined;
    setVerify({
      orderId: ownerId,
      itemId: item.id,
      itemName: product?.name ?? item.detail?.trim() ?? "",
      scan: product?.barcode?.trim() || product?.sku || "",
      qty: "1",
    });
  };

  const saveError = (e: unknown) =>
    toast.error(
      e instanceof OrderPickingApiError ? e.message : tPage("saveFailed")
    );

  const onStatusChange = async (
    ownerId: number,
    item: PickingItemDetail,
    status: PickingItemStatus
  ) => {
    if (!canUpdate) return;
    try {
      const next = await patchPickingItem(locale, ownerId, item.id, { status });
      applyItem(ownerId, next);
      if (status === "pending") {
        setRoundLines((lines) => lines.filter((l) => l.itemId !== item.id));
      }
    } catch (e) {
      saveError(e);
    }
  };

  const onVerifyConfirm = async () => {
    if (!canUpdate || !selectedItem || verify.orderId == null) return;
    const scan = verify.scan.trim();
    const ownerId = verify.orderId;

    // A compare line has no catalogue product yet: the first scan is what maps it.
    if (!isMappedLine(selectedItem)) {
      if (!scan) {
        toast.error(tPage("verifySkuMismatch"));
        return;
      }
      try {
        const found = await fetchOrderSalesFormItems(locale, "orders", {
          page: 1,
          limit: 20,
          search: scan,
        });
        const hit = found.items.find((p) => matchesProductScan(scan, p));
        if (!hit) {
          toast.error(tPage("verifySkuMismatch"));
          return;
        }
        const next = await patchPickingItem(locale, ownerId, selectedItem.id, {
          product_item_id: hit.id,
        });
        setProductsById((prev) => new Map(prev).set(hit.id, hit));
        applyItem(ownerId, next);
        setVerify({
          orderId: ownerId,
          itemId: next.id,
          itemName: hit.name,
          scan: hit.barcode?.trim() || hit.sku,
          qty: "1",
        });
        toast.success(tPage("verifySuccess"));
      } catch (e) {
        saveError(e);
      }
      return;
    }

    const product = productsById.get(selectedItem.product_item_id ?? 0);
    if (!product || !matchesProductScan(scan, product)) {
      toast.error(tPage("verifySkuMismatch"));
      return;
    }
    const max = remainingQty(selectedItem.amount, selectedItem.amount_checked);
    if (max <= 0) {
      toast.error(tPage("verifyAlreadyComplete"));
      return;
    }
    const parsed = Number.parseInt(verify.qty, 10);
    const qty = Math.min(
      Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 1,
      max
    );
    const checked = wholeQty(selectedItem.amount_checked) + qty;
    try {
      const next = await patchPickingItem(locale, ownerId, selectedItem.id, {
        amount_checked: checked,
        status: statusFromChecked(selectedItem.amount, checked),
      });
      applyItem(ownerId, next);
      if (extraPay) {
        setRoundLines((lines) => {
          const idx = lines.findIndex((l) => l.itemId === next.id);
          if (idx < 0) {
            return [
              ...lines,
              orderLineFromItem(ownerId, next, productsById, qty),
            ];
          }
          const updated = [...lines];
          const nextQty = updated[idx].qty + qty;
          updated[idx] = {
            ...updated[idx],
            qty: nextQty,
            discount: proratedDiscount(next, nextQty),
          };
          return updated;
        });
      }
      setVerify((cur) => ({ ...cur, qty: "1" }));
      toast.success(tPage("verifySuccess"));
    } catch (e) {
      saveError(e);
    }
  };

  const onRemoveLine = async (line: PickingOrderLine) => {
    if (!canUpdate) return;
    const item = (itemsByOrder.get(line.orderId) ?? []).find(
      (i) => i.id === line.itemId
    );
    if (!item) return;
    const checked = extraPay
      ? Math.max(0, wholeQty(item.amount_checked) - line.qty)
      : 0;
    try {
      const next = await patchPickingItem(locale, line.orderId, line.itemId, {
        amount_checked: checked,
        status: extraPay ? statusFromChecked(item.amount, checked) : "pending",
      });
      applyItem(line.orderId, next);
      setRoundLines((lines) => lines.filter((l) => l.itemId !== line.itemId));
    } catch (e) {
      saveError(e);
    }
  };

  const onAddToExtra = (ownerId: number, item: PickingItemDetail) => {
    if (extraPay) {
      selectItem(ownerId, item);
      return;
    }
    if (!canCreate) return;
    setPendingExtra((prev) => {
      const idx = prev.findIndex((p) => p.itemId === item.id);
      if (idx < 0) return [...prev, { itemId: item.id, orderId: ownerId, qty: 1 }];
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  };

  const onExtraQtyChange = (cardKey: string, itemId: number, qty: number) => {
    if (cardKey !== "pending") return;
    setPendingExtra((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, qty } : p))
    );
  };

  const onExtraRemove = (cardKey: string, itemId: number) => {
    if (cardKey !== "pending") return;
    setPendingExtra((prev) => prev.filter((p) => p.itemId !== itemId));
  };

  const onExtraSubmit = async (cardKey: string) => {
    if (cardKey !== "pending" || !canCreate || !root || extraSubmitting) return;
    const lines = pendingExtra
      .map((p) => {
        const item = (itemsByOrder.get(p.orderId) ?? []).find(
          (i) => i.id === p.itemId
        );
        return item?.product_item_id
          ? {
              product_item_id: item.product_item_id,
              type: "item" as const,
              amount: p.qty,
              price_per_unit: item.price_per_unit,
              discount: proratedDiscount(item, p.qty),
            }
          : null;
      })
      .filter((l): l is NonNullable<typeof l> => l != null);
    if (lines.length === 0) {
      toast.error(tPage("extraOrderEmptyQty"));
      return;
    }
    setExtraSubmitting(true);
    try {
      await createPickingExtraOrder(locale, {
        parent_id: root.id,
        member_user_id: root.member_user_id ?? null,
        member_setting_credit_id: root.member_setting_credit_id ?? null,
        member_name: root.member_name ?? null,
        member_tel: root.member_tel ?? null,
        member_email: root.member_email ?? null,
        items: lines,
      });
      toast.success(tPage("saveSuccess"));
      setPendingExtra([]);
      await load();
    } catch (e) {
      saveError(e);
    } finally {
      setExtraSubmitting(false);
    }
  };

  const paymentHref = (flow: "credit" | "payment") => {
    const q = new URLSearchParams({ flow });
    if (extraPay) q.set("extraPay", "1");
    return `${LIST_HREF}/${root?.id ?? orderId}/payment?${q}`;
  };

  const goToPayment = (flow: "credit" | "payment") => {
    const payId = root?.id ?? orderId;
    if (extraPay) {
      setExtraPayLines(
        payId,
        orderLines.map((l) => ({
          order_list_item_id: l.itemId,
          amount: l.qty,
          price_per_unit: l.pricePerUnit,
          discount: l.discount,
        }))
      );
    }
    router.push(paymentHref(flow));
  };

  const proceedIssueLoan = () => {
    if (!canUpdate || !canIssueLoan || !canSettle) return;
    const summary = computeStoreSalesPriceSummary(
      summaryLinesFromOrderLines(orderLines),
      vatPercent
    );
    if (summary.netTotal <= (creditLimit ?? 0)) {
      goToPayment("credit");
      return;
    }
    setCreditExceededOpen(true);
  };

  const onIssueLoan = () => {
    if (!canUpdate || !canIssueLoan || !canSettle) return;
    if (!extraPay && hasRemainingItems(allItems)) {
      setRemainingStockOpen(true);
      return;
    }
    proceedIssueLoan();
  };

  const onApproverConfirm = async (code: string) => {
    setApproverLoading(true);
    setApproverError(null);
    try {
      const { user_id } = await verifyPickingApproval(locale, "credit", code);
      setCreditApprovedBy(root?.id ?? orderId, user_id);
      setApproverOpen(false);
      setCreditExceededOpen(false);
      goToPayment("credit");
    } catch (e) {
      setApproverError(
        e instanceof OrderPickingApiError
          ? e.message
          : tPage("creditApproverInvalid")
      );
    } finally {
      setApproverLoading(false);
    }
  };

  const onCancel = async () => {
    if (extraPay) {
      router.push(paymentHref("payment"));
      return;
    }
    if (!canUpdate) {
      router.push(LIST_HREF);
      return;
    }
    setSaving(true);
    try {
      await patchPickingStatus(locale, activeOrderId, "fail");
      clearCreditApprovedBy(root?.id ?? orderId);
      toast.success(tPage("saveSuccess"));
      router.push(LIST_HREF);
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = async () => {
    if (!canUpdate || saving) return;
    setSaving(true);
    try {
      await patchPickingStatus(locale, activeOrderId, "in_progress");
      toast.success(tPage("saveSuccess"));
      router.push(LIST_HREF);
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(false);
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }
  if (loading) return <FormSkeleton />;
  if (!root || !customer) return null;

  const orderDate = root.ordered_at
    ? formatDate(root.ordered_at, locale)
    : formatDate(root.created_at, locale);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("pageTitle")}
        description={tPage("pageSubtitle")}
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <PickingCustomerCard
            customer={customer}
            sku={familySku(root.sku)}
            locale={locale}
          />
          <PickingItemsPanel
            orders={pickingOrders}
            activeOrderId={activeOrderId}
            onActiveOrderChange={(id) => {
              setActiveOrderId(id);
              setVerify(BLANK_VERIFY);
            }}
            itemsByOrder={itemsByOrder}
            productsById={productsById}
            selectedItemId={verify.itemId}
            onSelectItem={selectItem}
            onStatusChange={(ownerId, item, status) =>
              void onStatusChange(ownerId, item, status)
            }
            onAddToOrder={onAddToExtra}
            locale={locale}
            readOnly={!canUpdate}
            extraPay={extraPay}
          />
          {extraPay ? null : (
            <PickingExtraOrderPanel
              cards={extraCards}
              canSubmit={canCreate}
              submitting={extraSubmitting}
              locale={locale}
              onQtyChange={onExtraQtyChange}
              onRemoveLine={onExtraRemove}
              onSubmit={(key) => void onExtraSubmit(key)}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PickingVerifyCard
            selection={verify}
            maxQty={maxVerifyQty}
            onChange={setVerify}
            onConfirm={() => void onVerifyConfirm()}
            disabled={!canUpdate}
            qtyDisabled={selectedItem ? !isMappedLine(selectedItem) : false}
          />
          <PickingOrderSummaryPanel
            sku={familySku(root.sku)}
            orderDate={orderDate}
            lines={orderLines}
            vatPercent={vatPercent}
            locale={locale}
            onRemoveLine={(line) => void onRemoveLine(line)}
            readOnly={!canUpdate}
          />
          <PickingFormFooter
            canUpdate={canUpdate && !saving}
            canIssueLoan={canIssueLoan}
            canSettle={canSettle}
            extraPay={extraPay}
            onCancel={() => void onCancel()}
            onSaveDraft={() => void onSaveDraft()}
            onIssueLoan={onIssueLoan}
            onPay={() => goToPayment("payment")}
          />
        </div>
      </div>

      <RemainingStockDialog
        open={remainingStockOpen}
        onOpenChange={setRemainingStockOpen}
        onConfirm={() => {
          setRemainingStockOpen(false);
          proceedIssueLoan();
        }}
      />
      <CreditExceededDialog
        open={creditExceededOpen}
        onOpenChange={setCreditExceededOpen}
        onRequestApproval={() => {
          setApproverError(null);
          setApproverOpen(true);
        }}
      />
      <ApproverPasswordDialog
        kind="credit"
        open={approverOpen}
        onOpenChange={(open) => {
          setApproverOpen(open);
          if (!open) setApproverError(null);
        }}
        onConfirm={onApproverConfirm}
        isLoading={approverLoading}
        errorMessage={approverError}
      />
    </div>
  );
}
