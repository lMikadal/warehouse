"use client";

import {
  FileText,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  formatDateTime,
  type DisplayLocale,
} from "@/lib/format-datetime";
import { loadMemberUserCreditOptions } from "@/lib/member-user-filters-combobox";
import { repriceStoreSalesCartLines } from "@/lib/store-sales-cart-pricing";
import {
  fetchStoreSalesMemberSnapshot,
  loadStoreSalesMemberComboboxOptions,
  resolveStoreSalesMemberLabel,
} from "@/lib/store-sales-member-combobox";
import {
  createStoreSales,
  fetchStoreSalesDetail,
  OrderStoreApiError,
  updateStoreSales,
  type StoreSalesCreateBody,
  type StoreSalesItemInput,
  type StoreSalesStatus,
} from "@/lib/order-store-api";
import {
  fetchProductItems,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import {

  StoreShippingDialog,
  type DeliveryType,
  type ShippingDraft,
} from "./store-shipping-dialog";

type CartLine = {
  key: string;
  product?: ProductItemBrowseRow;
  type: "item" | "compare";
  qty: number;
  unitPrice: number;
  discount: number;
  detail?: string;
};

function defaultReceiveAt(): Date {
  return new Date(Date.now() + 30 * 60 * 1000);
}

function toIsoReceived(draft: ShippingDraft): string | null {
  if (draft.type !== "delivery") {
    return defaultReceiveAt().toISOString();
  }
  if (!draft.date) return null;
  const time = draft.time || "00:00";
  return new Date(`${draft.date}T${time}:00`).toISOString();
}

/** Stable ISO for display (SSR-safe — uses shipping draft, not wall clock). */
function shippingDraftDisplayIso(draft: ShippingDraft): string | null {
  const date = draft.date?.trim();
  if (!date) return null;
  const time = draft.time?.trim() || "00:00";
  return new Date(`${date}T${time}:00`).toISOString();
}

function lineTotal(line: CartLine) {
  return Math.max(0, line.qty * line.unitPrice - line.discount);
}

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Matches product list variant `Section` step badge (product-list-form-variant-sections). */
const storeSalesStepBadgeClass =
  "bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";

type CustomerPhase = "editing" | "locked" | "changing";

type Props = {
  orderId?: number;
};

export function StoreSalesFormPage({ orderId }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const tPage = useTranslations("page.orderStore");
  const tForm = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const tSearch = useTranslations("search");
  const tFormRoot = useTranslations("form");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store");
  const productStepRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!!orderId);
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberTel, setMemberTel] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberAddressDisplay, setMemberAddressDisplay] = useState("");
  const [memberTaxNumber, setMemberTaxNumber] = useState("");
  const [creditOptions, setCreditOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [creditId, setCreditId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [browseRows, setBrowseRows] = useState<ProductItemBrowseRow[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [selectedBrowse, setSelectedBrowse] = useState<Record<number, boolean>>(
    {}
  );
  const [cartTab, setCartTab] = useState<"items" | "compare">("items");
  const [productTab, setProductTab] = useState<"products" | "compare">(
    "products"
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [status, setStatus] = useState<StoreSalesStatus>("draft");
  const [sku, setSku] = useState("");
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingDraft>(() => {
    const d = defaultReceiveAt();
    return {
      type: "store",
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
    };
  });
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareDetail, setCompareDetail] = useState("");
  const [compareQty, setCompareQty] = useState("1");
  const [customerPhase, setCustomerPhase] = useState<CustomerPhase>("editing");
  const [changeCustomerDialogOpen, setChangeCustomerDialogOpen] =
    useState(false);
  const [confirmingCustomer, setConfirmingCustomer] = useState(false);

  const clearMemberSnapshot = useCallback(() => {
    setMemberId("");
    setMemberName("");
    setMemberTel("");
    setMemberEmail("");
    setMemberAddressDisplay("");
    setMemberTaxNumber("");
  }, []);

  const applyMemberSnapshot = useCallback(
    (snap: {
      memberName: string;
      memberTel: string;
      memberEmail: string;
      memberAddressDisplay: string;
      memberTaxNumber: string;
    }) => {
      setMemberName(snap.memberName);
      setMemberTel(snap.memberTel);
      setMemberEmail(snap.memberEmail);
      setMemberAddressDisplay(snap.memberAddressDisplay);
      setMemberTaxNumber(snap.memberTaxNumber);
    },
    []
  );

  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const d = await fetchStoreSalesDetail(locale, orderId);
      setStatus(d.status);
      setSku(d.sku ?? "");
      if (d.member_user_id) {
        setMemberId(String(d.member_user_id));
        try {
          const snap = await fetchStoreSalesMemberSnapshot(
            locale,
            d.member_user_id
          );
          applyMemberSnapshot(snap);
        } catch {
          setMemberName(d.member_name ?? "");
          setMemberTel(d.member_tel ?? "");
          setMemberEmail(d.member_email ?? "");
          setMemberAddressDisplay("");
          setMemberTaxNumber("");
        }
      } else {
        clearMemberSnapshot();
        setMemberName(d.member_name ?? "");
        setMemberTel(d.member_tel ?? "");
        setMemberEmail(d.member_email ?? "");
      }
      if (d.member_setting_credit_id)
        setCreditId(String(d.member_setting_credit_id));
      if (d.shipping) {
        const ra = d.shipping.received_at
          ? new Date(d.shipping.received_at)
          : defaultReceiveAt();
        setShipping({
          type: d.shipping.type as DeliveryType,
          date: ra.toISOString().slice(0, 10),
          time: ra.toTimeString().slice(0, 5),
        });
      }
      setCart(
        (d.items ?? []).map((it, i) => ({
          key: `loaded-${i}`,
          type: it.type as "item" | "compare",
          qty: it.amount,
          unitPrice: it.price_per_unit,
          discount: it.discount,
          detail: it.detail ?? undefined,
          product: it.product_item_id
            ? ({
                id: it.product_item_id,
                sku: "",
                name: "",
              } as ProductItemBrowseRow)
            : undefined,
        }))
      );
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [orderId, locale, tError, applyMemberSnapshot, clearMemberSnapshot]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { options } = await loadMemberUserCreditOptions(locale, "", 1);
        if (!cancelled) setCreditOptions(options);
      } catch {
        if (!cancelled) setCreditOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (creditOptions.length === 0) return;
    setCreditId((cur) =>
      cur && creditOptions.some((c) => c.value === cur)
        ? cur
        : creditOptions[0]!.value
    );
  }, [creditOptions]);

  const onMemberIdChange = async (nextId: string) => {
    setMemberId(nextId);
    if (!nextId) {
      clearMemberSnapshot();
      return;
    }
    try {
      const snap = await fetchStoreSalesMemberSnapshot(locale, Number(nextId));
      applyMemberSnapshot(snap);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const resetCustomer = () => {
    clearMemberSnapshot();
    if (creditOptions[0]) setCreditId(creditOptions[0].value);
  };

  const goToProductStep = () => {
    productStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => productSearchRef.current?.focus(), 400);
  };

  const handleNextStep = () => {
    setCustomerPhase("locked");
    goToProductStep();
  };

  const handleChangeCustomerConfirm = () => {
    setChangeCustomerDialogOpen(false);
    setCustomerPhase("changing");
  };

  const handleConfirmCustomer = async () => {
    setConfirmingCustomer(true);
    try {
      const repriced = await repriceStoreSalesCartLines(
        locale,
        cart,
        memberId ? Number(memberId) : null,
        creditId
      );
      setCart(repriced);
      setCustomerPhase("locked");
      goToProductStep();
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setConfirmingCustomer(false);
    }
  };

  const searchProducts = async () => {
    try {
      const res = await fetchProductItems(locale, {
        page: productPage,
        limit: 10,
        search: productSearch,
        isActive: true,
      });
      setBrowseRows(res.items);
      setBrowseTotal(res.meta.total);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const addProduct = (row: ProductItemBrowseRow) => {
    setCart((c) => [
      ...c,
      {
        key: `p-${row.id}-${Date.now()}`,
        type: "item",
        product: row,
        qty: 1,
        unitPrice: row.price ?? 0,
        discount: 0,
      },
    ]);
  };

  const addSelected = () => {
    for (const row of browseRows) {
      if (selectedBrowse[row.id]) addProduct(row);
    }
    setSelectedBrowse({});
  };

  const bodyFromCart = (nextStatus: StoreSalesStatus): StoreSalesCreateBody => {
    const items: StoreSalesItemInput[] = cart.map((line) => ({
      product_item_id: line.product?.id ?? null,
      type: line.type,
      amount: line.qty,
      price_per_unit: line.unitPrice,
      discount: line.discount,
      detail: line.type === "compare" ? line.detail ?? "" : undefined,
    }));
    return {
      status: nextStatus,
      member_user_id: memberId ? Number(memberId) : null,
      member_setting_credit_id: creditId ? Number(creditId) : null,
      member_name: memberName || null,
      member_tel: memberTel || null,
      member_email: memberEmail || null,
      shipping: {
        type: shipping.type,
        received_at: toIsoReceived(shipping),
      },
      items,
    };
  };

  const save = async (nextStatus: StoreSalesStatus) => {
    if (cart.length === 0) {
      toast.error(tForm("emptyCart"));
      return;
    }
    try {
      const body = bodyFromCart(nextStatus);
      if (orderId) {
        await updateStoreSales(locale, orderId, body);
        toast.success(tCrud("toast.saved"));
        void loadDetail();
      } else {
        const { id } = await createStoreSales(locale, body);
        toast.success(tCrud("toast.created"));
        router.replace(`/admin/sales/store/${id}`);
      }
    } catch (e) {
      toast.error(
        e instanceof OrderStoreApiError ? e.message : tError("saveFailed")
      );
    }
  };

  const printSlip = () => {
    window.print();
  };

  const totals = useMemo(() => {
    const sub = cart.reduce((s, l) => s + lineTotal(l), 0);
    return { sub, discount: 0, shipping: 0, grand: sub };
  }, [cart]);

  const itemLines = cart.filter((c) => c.type === "item");
  const compareLines = cart.filter((c) => c.type === "compare");

  const displayLocale = locale as DisplayLocale;
  const receiveAtDisplay = useMemo(() => {
    const iso = shippingDraftDisplayIso(shipping);
    return iso ? formatDateTime(iso, displayLocale) : "—";
  }, [shipping, displayLocale]);

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-[6fr_4fr]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const readOnly =
    !!orderId && status !== "draft" && status !== "pending";

  const customerFieldsDisabled = readOnly || customerPhase === "locked";
  const productActionsDisabled = readOnly || customerPhase === "changing";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {orderId ? tForm("titleEdit") : tForm("titleCreate")}
      </h1>
      <div className="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={storeSalesStepBadgeClass}>1</span>
                {tForm("customerStep")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 overflow-visible">
              <div
                className={cn(
                  "grid gap-4",
                  customerFieldsDisabled &&
                    "pointer-events-none opacity-60"
                )}
              >
                <div className="grid gap-1">
                  <Label htmlFor="store-sales-member">{tForm("memberCode")}</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex min-h-10 min-w-[min(100%,18rem)] flex-1 items-center gap-1 overflow-visible sm:min-w-48">
                      <div className="min-w-0 flex-1 overflow-visible">
                        <RemoteComboboxField
                          id="store-sales-member"
                          label={tForm("memberCode")}
                          value={memberId}
                          onValueChange={(v) => void onMemberIdChange(v)}
                          placeholder={tFormRoot("placeholder.select", {
                            label: tForm("memberCode"),
                          })}
                          emptyLabel={tFormRoot("combobox.noResults")}
                          inputClassName="w-full min-w-min"
                          disabled={customerFieldsDisabled}
                          showClear={!customerFieldsDisabled}
                          onLoadOptions={({ search, signal }) =>
                            loadStoreSalesMemberComboboxOptions(locale, {
                              search,
                              signal,
                            })
                          }
                          resolveSelectedLabel={(v) =>
                            resolveStoreSalesMemberLabel(locale, v)
                          }
                        />
                      </div>
                      {!customerFieldsDisabled ? (
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          size="lg"
                          tone="delete"
                          className="mr-0.5 shrink-0"
                          aria-label={tForm("resetCustomer")}
                          title={tForm("resetCustomer")}
                          onClick={resetCustomer}
                        >
                          <RotateCcw className="text-current" />
                        </ButtonIcon>
                      ) : null}
                    </div>
                    {creditOptions.length > 0 ? (
                      <RadioGroup
                        value={creditId}
                        onValueChange={setCreditId}
                        className="flex shrink-0 flex-wrap items-center gap-4"
                        aria-label={tForm("creditType")}
                      >
                        {creditOptions.map((c) => (
                          <div key={c.value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={c.value}
                              id={`store-credit-${c.value}`}
                              disabled={customerFieldsDisabled}
                            />
                            <Label htmlFor={`store-credit-${c.value}`}>
                              {c.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1">
                    <Label htmlFor="store-member-name">{tForm("memberName")}</Label>
                    <Input
                      id="store-member-name"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      disabled={customerFieldsDisabled}
                      placeholder={tFormRoot("placeholder.input", {
                        label: tForm("memberName"),
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="store-member-tel">{tForm("memberTel")}</Label>
                    <Input
                      id="store-member-tel"
                      value={memberTel}
                      onChange={(e) => setMemberTel(e.target.value)}
                      disabled={customerFieldsDisabled}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={tFormRoot("placeholder.input", {
                        label: tForm("memberTel"),
                      })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="store-member-email">{tForm("memberEmail")}</Label>
                    <Input
                      id="store-member-email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      disabled={customerFieldsDisabled}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={tFormRoot("placeholder.input", {
                        label: tForm("memberEmail"),
                      })}
                    />
                  </div>
                </div>

                <div className="text-muted-foreground min-w-0 space-y-2 text-sm">
                  {memberAddressDisplay ? (
                    <p className="flex gap-2">
                      <MapPin className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>
                        {tForm("memberAddress")} : {memberAddressDisplay}
                      </span>
                    </p>
                  ) : null}
                  {memberTaxNumber ? (
                    <p className="flex gap-2">
                      <FileText className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>
                        {tForm("memberTaxId")} : {memberTaxNumber}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>

              {!readOnly ? (
                <div className="flex justify-end">
                  {customerPhase === "editing" ? (
                    <Button type="button" onClick={handleNextStep}>
                      {tForm("nextStep")}
                    </Button>
                  ) : null}
                  {customerPhase === "locked" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setChangeCustomerDialogOpen(true)}
                    >
                      {tForm("changeCustomer")}
                    </Button>
                  ) : null}
                  {customerPhase === "changing" ? (
                    <Button
                      type="button"
                      disabled={confirmingCustomer}
                      onClick={() => void handleConfirmCustomer()}
                    >
                      {tForm("confirmCustomer")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card
            id="store-sales-product-step"
            ref={productStepRef}
            className="min-h-[20rem] scroll-mt-4"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={storeSalesStepBadgeClass}>2</span>
                {tForm("productStep")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  ref={productSearchRef}
                  id="store-sales-product-search"
                  className="min-w-0 flex-1"
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={tSearch("placeholder")}
                  disabled={productActionsDisabled}
                />
                <Button
                  type="button"
                  onClick={() => void searchProducts()}
                  disabled={productActionsDisabled}
                >
                  <Search className="text-current" aria-hidden />
                </Button>
              </div>
              <Tabs value={productTab} onValueChange={(v) => setProductTab(v as typeof productTab)}>
                <TabsList>
                  <TabsTrigger value="products">{tForm("tabProducts")}</TabsTrigger>
                  <TabsTrigger value="compare">{tForm("tabCompare")}</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="space-y-3">
                  {browseRows.length === 0 ? (
                    <p className="text-muted-foreground text-center text-sm py-8">
                      {tForm("emptyBrowse")}
                    </p>
                  ) : (
                    browseRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selectedBrowse[row.id]}
                            onChange={(e) =>
                              setSelectedBrowse((s) => ({
                                ...s,
                                [row.id]: e.target.checked,
                              }))
                            }
                            disabled={productActionsDisabled}
                          />
                          <span>{row.name || row.sku}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {money(row.price ?? 0, locale)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addProduct(row)}
                            disabled={productActionsDisabled}
                          >
                            <Plus className="text-current" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addSelected}
                      disabled={productActionsDisabled}
                    >
                      {tForm("bulkAdd")}
                    </Button>
                    {productPage * 10 < browseTotal ? (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={productActionsDisabled}
                        onClick={() => {
                          setProductPage((p) => p + 1);
                          void searchProducts();
                        }}
                      >
                        {tForm("loadMore")}
                      </Button>
                    ) : null}
                  </div>
                </TabsContent>
                <TabsContent value="compare">
                  <Button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    disabled={productActionsDisabled}
                  >
                    <Plus className="text-current" aria-hidden />
                    {tForm("tabCompare")}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{tForm("documentTitle")}</CardTitle>
            <p className="text-muted-foreground text-sm">{tForm("documentSubtitle")}</p>
            {sku ? (
              <p className="font-medium">{sku}</p>
            ) : null}
            <div className="flex items-center gap-2 text-sm">
              <span>{receiveAtDisplay}</span>
              <Button
                type="button"
                variant="ghost"
                className="size-10 p-0"
                onClick={() => setShippingOpen(true)}
                disabled={productActionsDisabled}
              >
                <Pencil className="text-current" aria-hidden />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {cart.length === 0 ? (
              <p className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-8 text-center text-sm">
                {tForm("emptyCart")}
              </p>
            ) : (
              <Tabs value={cartTab} onValueChange={(v) => setCartTab(v as typeof cartTab)}>
                <TabsList>
                  <TabsTrigger value="items">
                    {tForm("tabCartItems")} ({itemLines.length})
                  </TabsTrigger>
                  <TabsTrigger value="compare">
                    {tForm("tabCartCompare")} ({compareLines.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="items" className="space-y-2">
                  {itemLines.map((line) => (
                    <CartRow
                      key={line.key}
                      line={line}
                      locale={locale}
                      readOnly={productActionsDisabled}
                      onChange={(next) =>
                        setCart((c) =>
                          c.map((x) => (x.key === line.key ? next : x))
                        )
                      }
                      onRemove={() =>
                        setCart((c) => c.filter((x) => x.key !== line.key))
                      }
                    />
                  ))}
                </TabsContent>
                <TabsContent value="compare" className="space-y-2">
                  {compareLines.map((line) => (
                    <div key={line.key} className="rounded-md border p-2 text-sm">
                      {line.detail}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}
            <div className="mt-auto space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between tabular-nums">
                <span>{tPage("colTotal")}</span>
                <span>{money(totals.grand, locale)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/sales/store")}>
                <Trash2 className="text-current" aria-hidden />
                {tCrud("btn.cancel")}
              </Button>
              {perms.create || perms.update ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void save("draft")}
                  disabled={productActionsDisabled}
                >
                  <Save className="text-current" aria-hidden />
                  {tForm("saveDraft")}
                </Button>
              ) : null}
              {perms.create || perms.update ? (
                <Button
                  type="button"
                  onClick={() => void save("pending")}
                  disabled={productActionsDisabled}
                >
                  {tForm("submitPending")}
                </Button>
              ) : null}
              {orderId ? (
                <Button type="button" className="sm:col-span-3" variant="secondary" onClick={() => void printSlip()}>
                  <Printer className="text-current" aria-hidden />
                  {tForm("printPicking")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <StoreShippingDialog
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        draft={shipping}
        onDraftChange={setShipping}
        onConfirm={() => setShippingOpen(false)}
      />

      <Dialog
        open={changeCustomerDialogOpen}
        onOpenChange={setChangeCustomerDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tForm("changeCustomerDialogTitle")}</DialogTitle>
            <DialogDescription>
              {tForm("changeCustomerDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangeCustomerDialogOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="button" onClick={handleChangeCustomerConfirm}>
              {tPage("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tForm("compareModalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            <Label>{tForm("compareDetail")}</Label>
            <Textarea value={compareDetail} onChange={(e) => setCompareDetail(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>{tForm("compareQty")}</Label>
            <Input value={compareQty} onChange={(e) => setCompareQty(e.target.value)} inputMode="numeric" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompareOpen(false)}>
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={productActionsDisabled}
              onClick={() => {
                const qty = Math.max(1, Number.parseInt(compareQty, 10) || 1);
                setCart((c) => [
                  ...c,
                  {
                    key: `cmp-${Date.now()}`,
                    type: "compare",
                    qty,
                    unitPrice: 0,
                    discount: 0,
                    detail: compareDetail,
                  },
                ]);
                setCompareOpen(false);
                setCompareDetail("");
              }}
            >
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CartRow({
  line,
  locale,
  readOnly,
  onChange,
  onRemove,
}: {
  line: CartLine;
  locale: string;
  readOnly: boolean;
  onChange: (line: CartLine) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <span className="min-w-0 flex-1 text-sm">
        {line.product?.name || line.product?.sku || "—"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          className="size-10 p-0"
          disabled={readOnly}
          onClick={() => onChange({ ...line, qty: Math.max(1, line.qty - 1) })}
        >
          <Minus className="text-current" aria-hidden />
        </Button>
        <Input
          className="w-16 text-center tabular-nums"
          value={String(line.qty)}
          onChange={(e) =>
            onChange({
              ...line,
              qty: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
            })
          }
          disabled={readOnly}
        />
        <Button
          type="button"
          variant="outline"
          className="size-10 p-0"
          disabled={readOnly}
          onClick={() => onChange({ ...line, qty: line.qty + 1 })}
        >
          <Plus className="text-current" aria-hidden />
        </Button>
      </div>
      <span className="tabular-nums">{money(lineTotal(line), locale)}</span>
      <Button type="button" variant="ghost" className="size-10 p-0 text-destructive" onClick={onRemove} disabled={readOnly}>
        <Trash2 className="text-current" aria-hidden />
      </Button>
    </div>
  );
}
