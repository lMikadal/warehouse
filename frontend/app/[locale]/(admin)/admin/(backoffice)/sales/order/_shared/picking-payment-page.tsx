"use client";

import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchPickingPayments,
  OrderPickingApiError,
  patchPickingStatus,
  savePickingPayment,
  verifyPickingApproval,
  type PickingItemDetail,
  type PickingOrderDetail,
  type PickingPaymentCategory,
  type PickingPaymentDetail,
} from "@/lib/order-picking-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import { fetchSettingLangList } from "@/lib/setting-api";
import { computeStoreSalesPriceSummary } from "@/lib/store-sales-cart-pricing";
import { cn } from "@/lib/utils";

import { loadPickingFamily } from "../_lib/picking-family";
import {
  familySku,
  hasRemainingItems,
  orderLinesFromItems,
  orderLinesFromPaymentItems,
  paymentItemsFromOrderLines,
  paySettleMath,
  summaryLinesFromOrderLines,
  type PickingOrderLine,
} from "../_lib/picking-lines";
import {
  clearCreditApprovedBy,
  clearExtraPayLines,
  getCreditApprovedBy,
  getExtraPayLines,
} from "../_lib/picking-session";
import {
  ApproverPasswordDialog,
  RemainingExtraBillDialog,
  SpecialDiscountAmountDialog,
} from "./picking-dialogs";
import {
  PickingCustomerCard,
  PickingLinesTable,
  PickingPriceSummary,
  type PickingCustomerDisplay,
} from "./picking-panels";
import {
  LoanDocumentCard,
  PickingPaymentMethodsPanel,
  PickingSettleSummary,
  type PickingPayMethod,
  type PickingPayMode,
} from "./picking-payment-panels";

const LIST_HREF = "/admin/sales/order";

type ItemsById = Map<number, { orderId: number; item: PickingItemDetail }>;

type Props = {
  orderId: number;
  /** `credit` issues a loan slip, `payment` settles it. Ignored when `mode` is `view`. */
  flow: PickingPaymentCategory;
  mode?: "view";
  paymentId?: number;
  /** An extra-pay round bills only the lines the picking desk handed over in this session. */
  extraPay?: boolean;
};

function PaymentSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function isoDateOf(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return todayIso();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? todayIso() : d.toISOString().slice(0, 10);
}

function itemsByIdOf(orders: PickingOrderDetail[]): ItemsById {
  const map: ItemsById = new Map();
  for (const order of orders) {
    for (const item of order.items) map.set(item.id, { orderId: order.id, item });
  }
  return map;
}

/** A saved document is read through the channels it recorded, not through the till's current state. */
function methodsOfPayment(payment: PickingPaymentDetail): PickingPayMethod[] {
  return payment.methods.map((m) => ({
    id: m.setting_payment_method_id,
    name: m.name?.trim() ?? "",
    enabled: true,
    amount: m.amount,
  }));
}

function loanVariantOf(payment: PickingPaymentDetail): "loan" | "order" {
  if (payment.payment_category !== "payment") return "loan";
  return payment.is_paid ? "order" : "loan";
}

function PaymentDocumentSection({
  payment,
  itemsById,
  productsById,
  vatDefault,
  locale,
}: {
  payment: PickingPaymentDetail;
  itemsById: ItemsById;
  productsById: Map<number, ProductItemBrowseRow>;
  vatDefault: number;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderPicking");
  const lines = useMemo(
    () => orderLinesFromPaymentItems(payment, itemsById, productsById),
    [payment, itemsById, productsById]
  );
  const vatPercent = payment.vat_rate > 0 ? payment.vat_rate : vatDefault;
  const isCredit = payment.payment_category !== "payment";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
      <Card className="min-w-0">
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-foreground text-base font-semibold">
            {tPage("paymentDocumentNumber", { sku: payment.sku ?? "" })}
          </h2>
          <PickingLinesTable lines={lines} locale={locale} />
        </CardContent>
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        {isCredit ? (
          <Card>
            <CardContent>
              <PickingPriceSummary
                lines={lines}
                vatPercent={vatPercent}
                specialDiscount={payment.special_discount}
                locale={locale}
              />
            </CardContent>
          </Card>
        ) : (
          <PickingSettleSummary
            lines={lines}
            vatPercent={vatPercent}
            methods={methodsOfPayment(payment)}
            specialDiscount={payment.special_discount}
            confirmed={payment.is_paid}
            onPrintReceipt={() => window.print()}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}

export function PickingPaymentPage({
  orderId,
  flow,
  mode,
  paymentId,
  extraPay = false,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPicking");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_order");

  const readOnly = mode === "view";
  const canUpdate = perms.update && !readOnly;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<PickingOrderDetail[]>([]);
  const [root, setRoot] = useState<PickingOrderDetail | null>(null);
  const [customer, setCustomer] = useState<PickingCustomerDisplay | null>(null);
  const [productsById, setProductsById] = useState<
    Map<number, ProductItemBrowseRow>
  >(() => new Map());
  const [vatPercent, setVatPercent] = useState(0);
  const [payments, setPayments] = useState<PickingPaymentDetail[]>([]);
  const [activePaymentId, setActivePaymentId] = useState<string>("");
  const [lines, setLines] = useState<PickingOrderLine[]>([]);
  const [orderAt, setOrderAt] = useState(todayIso);
  const [specialDiscount, setSpecialDiscount] = useState(0);
  const [discountApprovedBy, setDiscountApprovedBy] = useState<number | null>(null);
  const [methods, setMethods] = useState<PickingPayMethod[]>([]);
  const [payMode, setPayMode] = useState<PickingPayMode>("full");
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [payConfirmed, setPayConfirmed] = useState(false);
  const [remainingItems, setRemainingItems] = useState(false);
  const [discountAmountOpen, setDiscountAmountOpen] = useState(false);
  const [approverOpen, setApproverOpen] = useState(false);
  const [approverLoading, setApproverLoading] = useState(false);
  const [approverError, setApproverError] = useState<string | null>(null);
  const [extraBillOpen, setExtraBillOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [family, paymentList, methodList] = await Promise.all([
        loadPickingFamily(locale, orderId),
        fetchPickingPayments(orderId),
        readOnly
          ? Promise.resolve({ items: [] })
          : fetchSettingLangList(locale, "payment-methods", {
              page: 1,
              limit: 100,
              isActive: true,
              isSale: true,
            }).catch(() => ({ items: [] })),
      ]);

      setOrders(family.orders);
      setRoot(family.root);
      setCustomer(family.customer);
      setProductsById(family.productsById);
      setVatPercent(family.vatPercent);
      setPayments(paymentList.items);
      setOrderAt(isoDateOf(family.root.ordered_at ?? family.root.created_at));

      const pickingOrders = family.orders.filter((o) => o.doc_status !== "draft");
      setRemainingItems(
        hasRemainingItems(pickingOrders.flatMap((o) => o.items))
      );

      if (readOnly) {
        if (paymentList.items.length === 0) throw new Error("no payments");
        const active =
          paymentList.items.find((p) => p.id === paymentId) ?? paymentList.items[0];
        setActivePaymentId(String(active.id));
        return;
      }

      const itemsById = itemsByIdOf(family.orders);
      if (extraPay) {
        const stored = getExtraPayLines(orderId);
        if (!stored) {
          toast.error(tPage("extraPayMissing"));
          router.replace(`${LIST_HREF}/${orderId}`);
          return;
        }
        setLines(
          stored.flatMap((l) => {
            const hit = itemsById.get(l.order_list_item_id);
            if (!hit) return [];
            return [
              {
                itemId: l.order_list_item_id,
                orderId: hit.orderId,
                type: hit.item.type,
                product: hit.item.product_item_id
                  ? family.productsById.get(hit.item.product_item_id)
                  : undefined,
                detail: hit.item.detail?.trim() ?? "",
                qty: l.amount,
                pricePerUnit: l.price_per_unit,
                discount: l.discount,
              },
            ];
          })
        );
      } else {
        setLines(
          pickingOrders.flatMap((order) =>
            orderLinesFromItems(order.id, order.items, family.productsById)
          )
        );
      }

      // An unpaid document of this kind is the draft this screen continues; an extra round always
      // opens a fresh one so the settled receipt before it stays untouched.
      const draft = extraPay
        ? null
        : (paymentList.items.find(
            (p) => p.payment_category === flow && !p.is_paid
          ) ?? null);
      setEditingPaymentId(draft?.id ?? null);
      setSpecialDiscount(draft?.special_discount ?? 0);
      setDiscountApprovedBy(draft?.discount_approved_by ?? null);
      if (draft?.ordered_at) setOrderAt(isoDateOf(draft.ordered_at));
      setPayMode(draft && !draft.is_full ? "partial" : "full");
      setMethods(
        methodList.items.map((m) => {
          const used = draft?.methods.find(
            (x) => x.setting_payment_method_id === m.id
          );
          return {
            id: m.id,
            name: m.name,
            enabled: Boolean(used),
            amount: used?.amount ?? 0,
          };
        })
      );
    } catch (e) {
      toast.error(
        e instanceof OrderPickingApiError ? e.message : tPage("notFound")
      );
      router.replace(LIST_HREF);
    } finally {
      setLoading(false);
    }
  }, [locale, orderId, paymentId, readOnly, extraPay, flow, router, tPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemsById = useMemo(() => itemsByIdOf(orders), [orders]);

  const summary = useMemo(
    () =>
      computeStoreSalesPriceSummary(summaryLinesFromOrderLines(lines), vatPercent),
    [lines, vatPercent]
  );
  const payable = Math.max(
    0,
    Math.round((summary.netTotal - specialDiscount) * 100) / 100
  );
  const settle = paySettleMath(payable, methods);
  const canConfirmPay =
    settle.remaining <= 0.005 && methods.some((m) => m.enabled && m.amount > 0);

  const activePayment = useMemo(
    () => payments.find((p) => String(p.id) === activePaymentId) ?? null,
    [payments, activePaymentId]
  );

  const savePayment = async (isPaid: boolean) => {
    if (!root) return null;
    const creditApprovedBy = getCreditApprovedBy(root.id);
    return savePickingPayment(locale, root.id, editingPaymentId, {
      payment_category: flow,
      ordered_at: orderAt || todayIso(),
      vat_rate: vatPercent,
      discount: summary.discountTotal,
      special_discount: specialDiscount,
      total_price: payable,
      is_paid: isPaid,
      ...(creditApprovedBy ? { credit_approved_by: creditApprovedBy } : {}),
      ...(discountApprovedBy && specialDiscount > 0
        ? { discount_approved_by: discountApprovedBy }
        : {}),
      methods:
        flow === "payment"
          ? methods
              .filter((m) => m.enabled && m.amount > 0)
              .map((m) => ({ setting_payment_method_id: m.id, amount: m.amount }))
          : [],
      items: paymentItemsFromOrderLines(lines),
    });
  };

  /** Lending or settling closes the picking slips of the family: that is what moves the stock. */
  const closePickingOrders = async () => {
    for (const order of orders) {
      if (order.doc_status === "draft" || order.status === "success") continue;
      await patchPickingStatus(locale, order.id, "success");
    }
  };

  const saveError = (e: unknown) =>
    toast.error(
      e instanceof OrderPickingApiError ? e.message : tPage("saveFailed")
    );

  const onSaveDraft = async () => {
    if (!canUpdate || saving || lines.length === 0) return;
    setSaving(true);
    try {
      const next = await savePayment(false);
      if (next) setEditingPaymentId(next.id);
      await patchPickingStatus(locale, root?.id ?? orderId, "in_progress");
      if (root) clearCreditApprovedBy(root.id);
      toast.success(tPage("saveSuccess"));
      router.push(LIST_HREF);
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(false);
    }
  };

  const onPrintLoan = async () => {
    if (!canUpdate || saving) return;
    if (lines.length === 0 || !orderAt) {
      toast.error(tPage("requiredFields"));
      return;
    }
    setSaving(true);
    try {
      const next = await savePayment(false);
      if (next) setEditingPaymentId(next.id);
      await closePickingOrders();
      if (root) {
        clearCreditApprovedBy(root.id);
        if (extraPay) clearExtraPayLines(root.id);
      }
      toast.success(tPage("saveSuccess"));
      window.print();
      if (remainingItems) setExtraBillOpen(true);
      else router.push(LIST_HREF);
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(false);
    }
  };

  const onConfirmPay = async () => {
    if (!canUpdate || saving || !canConfirmPay || lines.length === 0) return;
    setSaving(true);
    try {
      const next = await savePayment(true);
      if (next) {
        setEditingPaymentId(next.id);
        setPayments((prev) => [...prev.filter((p) => p.id !== next.id), next]);
      }
      await closePickingOrders();
      if (root) {
        clearCreditApprovedBy(root.id);
        if (extraPay) clearExtraPayLines(root.id);
      }
      const family = await loadPickingFamily(locale, root?.id ?? orderId);
      setOrders(family.orders);
      setRemainingItems(
        hasRemainingItems(
          family.orders
            .filter((o) => o.doc_status !== "draft")
            .flatMap((o) => o.items)
        )
      );
      setPayConfirmed(true);
      toast.success(tPage("saveSuccess"));
    } catch (e) {
      saveError(e);
    } finally {
      setSaving(false);
    }
  };

  /** The PIN comes first, as in v1: an approver unlocks the field, then the clerk keys the amount. */
  const onSpecialDiscountEdit = () => {
    setApproverError(null);
    if (discountApprovedBy && discountApprovedBy > 0) {
      setDiscountAmountOpen(true);
      return;
    }
    setApproverOpen(true);
  };

  const onApproverConfirm = async (code: string) => {
    setApproverLoading(true);
    setApproverError(null);
    try {
      const { user_id } = await verifyPickingApproval(locale, "discount", code);
      setDiscountApprovedBy(user_id);
      setApproverOpen(false);
      setDiscountAmountOpen(true);
    } catch (e) {
      setApproverError(
        e instanceof OrderPickingApiError
          ? e.message
          : tPage("discountApproverInvalid")
      );
    } finally {
      setApproverLoading(false);
    }
  };

  const extraBillHref = `${LIST_HREF}/${root?.id ?? orderId}?mode=extraPay`;

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }
  if (loading) return <PaymentSkeleton />;
  if (!root || !customer) return null;

  const customerCard = (
    <PickingCustomerCard
      customer={customer}
      sku={familySku(root.sku)}
      locale={locale}
    />
  );

  if (readOnly) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4">
        <CrudPageHeader
          title={tPage("paymentDocumentsTitle")}
          description={tPage("pageSubtitle")}
        />
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
          {customerCard}
          {activePayment ? (
            <LoanDocumentCard
              variant={loanVariantOf(activePayment)}
              issuedAt={new Date(activePayment.created_at)}
              orderAt={isoDateOf(activePayment.ordered_at)}
              sellerName={customer.sellerName}
              shipping={root.shipping ?? null}
              locale={locale}
            />
          ) : null}
        </div>

        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tPage("documentTabsEmpty")}
          </p>
        ) : (
          <Tabs
            value={activePaymentId}
            onValueChange={setActivePaymentId}
            className="flex min-w-0 flex-col"
          >
            <TabsList className="h-auto w-fit flex-wrap justify-start gap-1 bg-transparent p-0">
              {payments.map((p, index) => (
                <TabsTrigger
                  key={p.id}
                  value={String(p.id)}
                  className={cn(
                    "rounded-t-md rounded-b-none px-4 py-2 shadow-none",
                    "bg-muted text-muted-foreground",
                    "data-[state=active]:border-primary data-[state=active]:border-b-2",
                    "data-[state=active]:bg-transparent data-[state=active]:text-primary",
                    "data-[state=active]:shadow-none"
                  )}
                >
                  {tPage("pickingTab", { no: index + 1 })}
                </TabsTrigger>
              ))}
            </TabsList>
            {payments.map((p) => (
              <TabsContent
                key={p.id}
                value={String(p.id)}
                className="mt-0 data-[state=inactive]:hidden"
              >
                <PaymentDocumentSection
                  payment={p}
                  itemsById={itemsById}
                  productsById={productsById}
                  vatDefault={vatPercent}
                  locale={locale}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(LIST_HREF)}
          >
            {tCrud("btn.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={flow === "payment" ? tPage("pay") : tPage("loanDocumentTitle")}
        description={tPage("orderSubtitle")}
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {customerCard}
          <Card className="min-w-0">
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-foreground text-base font-semibold">
                {tPage("orderSummaryTitle", { count: lines.length })}
              </h2>
              <PickingLinesTable lines={lines} locale={locale} />
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <LoanDocumentCard
            variant={flow === "payment" && payConfirmed ? "order" : "loan"}
            issuedAt={new Date()}
            orderAt={orderAt}
            onOrderAtChange={canUpdate && !payConfirmed ? setOrderAt : undefined}
            sellerName={customer.sellerName}
            shipping={root.shipping ?? null}
            locale={locale}
          />

          {flow === "payment" ? (
            <>
              {payConfirmed ? null : (
                <PickingPaymentMethodsPanel
                  mode={payMode}
                  onModeChange={(next) => {
                    setPayMode(next);
                    setMethods((prev) =>
                      prev.map((m) => ({ ...m, enabled: false, amount: 0 }))
                    );
                  }}
                  methods={methods}
                  onChange={setMethods}
                  netTotal={payable}
                  remaining={settle.remaining}
                  locale={locale}
                />
              )}
              <PickingSettleSummary
                lines={lines}
                vatPercent={vatPercent}
                methods={methods}
                specialDiscount={specialDiscount}
                onSpecialDiscountEdit={
                  canUpdate && !payConfirmed ? onSpecialDiscountEdit : undefined
                }
                confirmed={payConfirmed}
                onPrintReceipt={() => window.print()}
                locale={locale}
              />
            </>
          ) : (
            <Card>
              <CardContent>
                <PickingPriceSummary
                  lines={lines}
                  vatPercent={vatPercent}
                  specialDiscount={specialDiscount}
                  onSpecialDiscountEdit={
                    canUpdate ? onSpecialDiscountEdit : undefined
                  }
                  locale={locale}
                  summary={summary}
                />
              </CardContent>
            </Card>
          )}

          {payConfirmed ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(LIST_HREF)}
              >
                {tCrud("btn.back")}
              </Button>
              {remainingItems ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push(extraBillHref)}
                >
                  {tPage("extraBillButton")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => router.push(`${LIST_HREF}/${root.id}`)}
              >
                <ArrowLeft className="text-current" aria-hidden />
                {tCrud("btn.back")}
              </Button>
              {extraPay ? null : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canUpdate || saving || lines.length === 0}
                  onClick={() => void onSaveDraft()}
                >
                  {tCrud("btn.save")}
                </Button>
              )}
              {flow === "credit" ? (
                <Button
                  type="button"
                  disabled={!canUpdate || saving || lines.length === 0}
                  onClick={() => void onPrintLoan()}
                >
                  <Printer className="text-current" aria-hidden />
                  {tPage("printLoan")}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!canUpdate || saving || !canConfirmPay}
                  onClick={() => void onConfirmPay()}
                >
                  <CheckCircle2 className="text-current" aria-hidden />
                  {tPage("confirmPay")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ApproverPasswordDialog
        kind="discount"
        open={approverOpen}
        onOpenChange={(open) => {
          setApproverOpen(open);
          if (!open) setApproverError(null);
        }}
        onConfirm={onApproverConfirm}
        isLoading={approverLoading}
        errorMessage={approverError}
      />
      <SpecialDiscountAmountDialog
        open={discountAmountOpen}
        onOpenChange={setDiscountAmountOpen}
        initialAmount={specialDiscount}
        onConfirm={(amount) => {
          const value = amount > 0 ? Math.round(amount * 100) / 100 : 0;
          setSpecialDiscount(value);
          if (value <= 0) setDiscountApprovedBy(null);
          setDiscountAmountOpen(false);
        }}
      />
      <RemainingExtraBillDialog
        open={extraBillOpen}
        onOpenChange={(open) => {
          setExtraBillOpen(open);
          if (!open) router.push(LIST_HREF);
        }}
        onExtraBill={() => router.push(extraBillHref)}
      />
    </div>
  );
}
