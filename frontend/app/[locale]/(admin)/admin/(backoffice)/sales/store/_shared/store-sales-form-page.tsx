"use client";

import {
  FileText,
  Filter,
  MapPin,
  RotateCcw,
  Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { CrudPaginationBar } from "@/components/molecules/crud-pagination-bar";
import { CrudSearchField } from "@/components/molecules/crud-search-field";
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

import { StoreSalesFormDesktopSplitSkeleton } from "./store-sales-form-desktop-split-skeleton";

const StoreSalesFormDesktopSplit = dynamic(
  () =>
    import("./store-sales-form-desktop-split").then(
      (m) => m.StoreSalesFormDesktopSplit,
    ),
  { ssr: false, loading: () => <StoreSalesFormDesktopSplitSkeleton /> },
);
import type { RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";
import { useCrudListQuery } from "@/hooks/use-crud-list-query";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  formatDate,
  formatDateTime,
  type DisplayLocale,
} from "@/lib/format-datetime";
import { fetchSettingVat } from "@/lib/setting-api";
import {
  canAddProductFromBrowse,
  cartLineMaxQty,
  clampCartItemQty,
  computeStoreSalesPriceSummary,
  hydrateStoreSalesCartProducts,
  normalizeCompareLineDetail,
  repriceStoreSalesCartLines,
  summaryLinesFromCartItems,
} from "@/lib/store-sales-cart-pricing";
import { loadMemberUserCreditOptions } from "@/lib/member-user-filters-combobox";
import { StoreSalesDocumentPanel } from "./store-sales-document-panel";
import {
  fetchStoreSalesMemberSnapshot,
  loadStoreSalesMemberComboboxOptions,
  resolveStoreSalesMemberLabel,
} from "@/lib/store-sales-member-combobox";
import {
  createStoreSales,
  fetchStoreSalesDetail,
  OrderStoreApiError,
  patchStoreSalesShipping,
  updateStoreSales,
  type StoreSalesCreateBody,
  type StoreSalesItemInput,
  type StoreSalesStatus,
} from "@/lib/order-store-api";
import {
  loadProductItemBrowseCategoryComboboxOptions,
  resolveProductItemBrowseCategoryLabel,
} from "@/lib/product-category-combobox";
import {
  loadProductCarBrandComboboxOptions,
  loadProductCarModelComboboxOptions,
  resolveProductCarBrandLabel,
  resolveProductCarModelLabel,
} from "@/lib/product-filters-api";
import {
  fetchProductItems,
  ProductListApiError,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import {
  ProductListCarModal,
  ProductListWarehouseModal,
} from "../../../product/_shared/product-list-modals";
import {
  StoreSalesProductBrowseEmpty,
  StoreSalesProductBrowseTable,
} from "./store-sales-product-browse-table";
import {
  StoreShippingDialog,
  type DeliveryType,
  type ShippingDraft,
} from "./store-shipping-dialog";

function carYearOptions(): number[] {
  const end = new Date().getFullYear();
  const years: number[] = [];
  for (let y = end; y >= 1990; y -= 1) years.push(y);
  return years;
}

function loadStoreSalesBrowseYearOptions(search: string): RemoteComboboxOption[] {
  const q = search.trim();
  return carYearOptions()
    .filter((y) => !q || String(y).includes(q))
    .map((y) => ({ value: String(y), label: String(y) }));
}

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

function emptyShippingDraft(): ShippingDraft {
  return { type: "store", date: "", time: "" };
}

function localDateTimeParts(d: Date): Pick<ShippingDraft, "date" | "time"> {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

/** Design `touchCartSchedule`: set receive +30 min on first line; clear on empty create. */
function scheduleShippingForCart(
  lines: CartLine[],
  orderId: number | undefined,
  prev: ShippingDraft
): ShippingDraft {
  if (lines.length === 0) {
    if (!orderId) return emptyShippingDraft();
    return prev;
  }
  if (prev.date.trim() && prev.time.trim()) return prev;
  const parts = localDateTimeParts(defaultReceiveAt());
  return { ...prev, type: prev.type || "store", ...parts };
}

function toIsoReceived(draft: ShippingDraft): string | null {
  if (draft.date.trim()) {
    const time = draft.time.trim() || "00:00";
    return new Date(`${draft.date}T${time}:00`).toISOString();
  }
  return defaultReceiveAt().toISOString();
}

function shippingTypeLabelKey(
  type: DeliveryType
): "shippingStore" | "shippingParking" | "shippingDelivery" {
  if (type === "parking") return "shippingParking";
  if (type === "delivery") return "shippingDelivery";
  return "shippingStore";
}

/** Stable ISO for display (SSR-safe — uses shipping draft, not wall clock). */
function shippingDraftDisplayIso(draft: ShippingDraft): string | null {
  const date = draft.date?.trim();
  if (!date) return null;
  const time = draft.time?.trim() || "00:00";
  return new Date(`${date}T${time}:00`).toISOString();
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
  const tProductAttr = useTranslations("productAttr");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store");
  const productStepRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(!!orderId);
  const [memberId, setMemberId] = useState("");
  const [memberComboboxLabel, setMemberComboboxLabel] = useState("");
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
  const [productSearchApplied, setProductSearchApplied] = useState("");
  const [browseRequested, setBrowseRequested] = useState(false);
  const [browseCategoryId, setBrowseCategoryId] = useState("");
  const [browseBrandId, setBrowseBrandId] = useState("");
  const [browseModelId, setBrowseModelId] = useState("");
  const [browseCarYear, setBrowseCarYear] = useState("");
  const [browseOem, setBrowseOem] = useState("");
  const [productFilterOpen, setProductFilterOpen] = useState(false);
  const [browseRows, setBrowseRows] = useState<ProductItemBrowseRow[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [selectedBrowse, setSelectedBrowse] = useState<Record<number, boolean>>(
    {}
  );
  const [carListId, setCarListId] = useState<number | null>(null);
  const [whItemId, setWhItemId] = useState<number | null>(null);
  const browseListQuery = useCrudListQuery({});
  const {
    page: browsePage,
    setPage: setBrowsePage,
    pageSize: browsePageSize,
    onPageSizeChange: onBrowsePageSizeChange,
    sortKey: browseSortKey,
    sortDir: browseSortDir,
    handleSortChange: handleBrowseSortChange,
    totalPages: browseTotalPages,
    safePage: browseSafePage,
  } = browseListQuery;
  const [cartTab, setCartTab] = useState<"items" | "compare">("items");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [status, setStatus] = useState<StoreSalesStatus>("draft");
  const [sku, setSku] = useState("");
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingDraft>(emptyShippingDraft);
  const [orderedAtIso, setOrderedAtIso] = useState<string | null>(null);
  const [documentCollapsed, setDocumentCollapsed] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareEditKey, setCompareEditKey] = useState<string | null>(null);
  const [compareDetail, setCompareDetail] = useState("");
  const [compareQty, setCompareQty] = useState("1");
  const [vatRate, setVatRate] = useState(7);
  const [customerPhase, setCustomerPhase] = useState<CustomerPhase>("editing");
  const [changeCustomerDialogOpen, setChangeCustomerDialogOpen] =
    useState(false);
  const [confirmingCustomer, setConfirmingCustomer] = useState(false);

  const clearMemberSnapshot = useCallback(() => {
    setMemberId("");
    setMemberComboboxLabel("");
    setMemberName("");
    setMemberTel("");
    setMemberEmail("");
    setMemberAddressDisplay("");
    setMemberTaxNumber("");
  }, []);

  const applyMemberSnapshot = useCallback(
    (snap: {
      memberComboboxLabel: string;
      memberName: string;
      memberTel: string;
      memberEmail: string;
      memberAddressDisplay: string;
      memberTaxNumber: string;
    }) => {
      setMemberComboboxLabel(snap.memberComboboxLabel);
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
      setOrderedAtIso(d.ordered_at ?? null);
      if (d.member_user_id) {
        setMemberId(String(d.member_user_id));
        try {
          const snap = await fetchStoreSalesMemberSnapshot(
            locale,
            d.member_user_id
          );
          applyMemberSnapshot(snap);
        } catch {
          setMemberComboboxLabel(d.member_name?.trim() ?? "");
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
          ...localDateTimeParts(ra),
        });
      }
      if (d.status === "draft" || d.status === "pending") {
        setCustomerPhase("locked");
      }
      const loadedCart = (d.items ?? []).map((it, i) => ({
        key: `loaded-${i}`,
        type: it.type as "item" | "compare",
        qty: it.amount,
        unitPrice: it.price_per_unit,
        discount: it.discount,
        detail:
          it.type === "compare" && it.detail != null
            ? normalizeCompareLineDetail(it.detail)
            : it.detail ?? undefined,
        product: it.product_item_id
          ? ({
              id: it.product_item_id,
              sku: "",
              name: "",
            } as ProductItemBrowseRow)
          : undefined,
      }));
      setCart(await hydrateStoreSalesCartProducts(locale, loadedCart));
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

  useEffect(() => {
    let cancelled = false;
    void fetchSettingVat(locale)
      .then((vat) => {
        if (!cancelled && vat.is_active !== false && Number.isFinite(vat.rate)) {
          setVatRate(vat.rate);
        }
      })
      .catch(() => {
        /* ponytail: default 7% when setting_vat unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

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
    window.setTimeout(() => {
      document.getElementById("store-sales-product-search")?.focus();
    }, 400);
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
      setShipping((s) => scheduleShippingForCart(repriced, orderId, s));
      setCustomerPhase("locked");
      goToProductStep();
    } catch {
      toast.error(tError("loadFailed"));
    } finally {
      setConfirmingCustomer(false);
    }
  };

  const applyProductSearch = () => {
    setProductSearchApplied(productSearch.trim());
    setBrowseRequested(true);
    setBrowsePage(1);
  };

  const loadBrowse = useCallback(async () => {
    if (!browseRequested) return;
    setBrowseLoading(true);
    try {
      const res = await fetchProductItems(locale, {
        page: browsePage,
        limit: browsePageSize,
        search: productSearchApplied || undefined,
        isActive: true,
        productCategoryId: browseCategoryId
          ? Number(browseCategoryId)
          : undefined,
        carBrandId: browseBrandId ? Number(browseBrandId) : undefined,
        productAttributeModelId: browseModelId
          ? Number(browseModelId)
          : undefined,
        carYear: browseCarYear ? Number(browseCarYear) : undefined,
        oem: browseOem.trim() || undefined,
        sort: browseSortKey ?? undefined,
        order: browseSortDir ?? undefined,
      });
      setBrowseRows(res.items);
      setBrowseTotal(res.meta.total);
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setBrowseLoading(false);
    }
  }, [
    locale,
    browseRequested,
    productSearchApplied,
    browsePage,
    browsePageSize,
    browseCategoryId,
    browseBrandId,
    browseModelId,
    browseCarYear,
    browseOem,
    browseSortKey,
    browseSortDir,
    tError,
  ]);

  useEffect(() => {
    void loadBrowse();
  }, [loadBrowse]);

  const updateCart = useCallback(
    (updater: (prev: CartLine[]) => CartLine[]) => {
      setCart((prev) => {
        const next = updater(prev);
        setShipping((s) => scheduleShippingForCart(next, orderId, s));
        return next;
      });
    },
    [orderId]
  );

  const toggleBrowseRow = (id: number, checked: boolean) => {
    setSelectedBrowse((s) => ({ ...s, [id]: checked }));
  };

  const toggleBrowsePage = (checked: boolean) => {
    setSelectedBrowse((s) => {
      const next = { ...s };
      for (const row of browseRows) {
        if (checked) next[row.id] = true;
        else delete next[row.id];
      }
      return next;
    });
  };

  const browsePageSafe = browseSafePage(browseTotal);
  const selectedBrowseCount = useMemo(
    () => Object.values(selectedBrowse).filter(Boolean).length,
    [selectedBrowse]
  );

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

  const confirmShipping = async () => {
    if (orderId) {
      try {
        await patchStoreSalesShipping(locale, orderId, {
          type: shipping.type,
          received_at: toIsoReceived(shipping),
        });
      } catch (e) {
        toast.error(
          e instanceof OrderStoreApiError ? e.message : tError("saveFailed")
        );
        return;
      }
    }
    setShippingOpen(false);
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

  const itemLines = cart.filter((c) => c.type === "item");
  const compareLines = cart.filter((c) => c.type === "compare");
  const lineCount = itemLines.length + compareLines.length;

  const priceSummary = useMemo(
    () =>
      computeStoreSalesPriceSummary(
        summaryLinesFromCartItems(cart),
        vatRate,
        0
      ),
    [cart, vatRate]
  );

  const displayLocale = locale as DisplayLocale;
  const receiveAtDisplay = useMemo(() => {
    const iso = shippingDraftDisplayIso(shipping);
    return iso ? formatDateTime(iso, displayLocale) : "—";
  }, [shipping, displayLocale]);

  const orderDateDisplay = useMemo(() => {
    const iso = orderedAtIso ?? new Date().toISOString();
    return formatDate(iso, displayLocale);
  }, [orderedAtIso, displayLocale]);

  const receiveTypeLabel = tForm(shippingTypeLabelKey(shipping.type));

  const repriceCartLines = useCallback(
    async (lines: CartLine[]) => {
      try {
        const repriced = await repriceStoreSalesCartLines(
          locale,
          lines,
          memberId ? Number(memberId) : null,
          creditId
        );
        setCart(repriced);
        setShipping((s) => scheduleShippingForCart(repriced, orderId, s));
      } catch {
        setCart(lines);
        setShipping((s) => scheduleShippingForCart(lines, orderId, s));
      }
    },
    [locale, memberId, creditId, orderId]
  );

  const cartQtyByItemId = useMemo(() => {
    const m: Record<number, number> = {};
    for (const line of cart) {
      if (line.type !== "item" || !line.product?.id) continue;
      m[line.product.id] = (m[line.product.id] ?? 0) + line.qty;
    }
    return m;
  }, [cart]);

  const addProduct = useCallback(
    (row: ProductItemBrowseRow) => {
      const readOnlyOrder =
        !!orderId && status !== "draft" && status !== "pending";
      const actionsDisabled = readOnlyOrder || customerPhase !== "locked";
      if (actionsDisabled || !canAddProductFromBrowse(row)) return;
      const max = cartLineMaxQty(row);
      const related = cart.filter(
        (c) => c.type === "item" && c.product?.id === row.id
      );
      let next: CartLine[];
      if (related.length > 0) {
        const totalQty = related.reduce((s, l) => s + l.qty, 0);
        const nextQty = clampCartItemQty(totalQty + 1, totalQty, max);
        if (nextQty <= totalQty) return;
        const keepKey = related[0]!.key;
        next = cart
          .filter(
            (c) =>
              !(
                c.type === "item" &&
                c.product?.id === row.id &&
                c.key !== keepKey
              )
          )
          .map((c) =>
            c.key === keepKey
              ? {
                  ...c,
                  qty: nextQty,
                  product: row,
                  unitPrice: row.price ?? c.unitPrice,
                }
              : c
          );
      } else {
        next = [
          ...cart,
          {
            key: `p-${row.id}`,
            type: "item",
            product: row,
            qty: 1,
            unitPrice: row.price ?? 0,
            discount: 0,
          },
        ];
      }
      void repriceCartLines(next);
    },
    [cart, orderId, status, customerPhase, repriceCartLines]
  );

  const addSelected = useCallback(() => {
    for (const row of browseRows) {
      if (selectedBrowse[row.id]) addProduct(row);
    }
    setSelectedBrowse({});
  }, [browseRows, selectedBrowse, addProduct]);

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <>
        <div className="flex flex-col gap-4 md:hidden">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="hidden min-h-0 w-full gap-2 md:flex">
          <Skeleton className="h-96 min-w-0 flex-[3]" />
          <Skeleton className="w-px shrink-0 self-stretch" />
          <Skeleton className="h-96 min-w-0 flex-[2] md:max-h-[calc(100svh-3.5rem-1rem-1.5rem)] md:h-[min(24rem,calc(100svh-3.5rem-1rem-1.5rem))]" />
        </div>
      </>
    );
  }

  const readOnly =
    !!orderId && status !== "draft" && status !== "pending";

  const customerFieldsDisabled = readOnly || customerPhase === "locked";
  const productActionsDisabled =
    readOnly || customerPhase !== "locked";
  const cartEmpty = cart.length === 0;

  const openCompareAdd = () => {
    if (productActionsDisabled) return;
    setCompareEditKey(null);
    setCompareDetail("");
    setCompareQty("1");
    setCompareOpen(true);
  };

  const openCompareEdit = (key: string) => {
    const line = cart.find((c) => c.key === key);
    if (!line) return;
    setCompareEditKey(key);
    setCompareDetail(normalizeCompareLineDetail(line.detail));
    setCompareQty(String(line.qty));
    setCompareOpen(true);
  };

  const documentPanelCommon = {
    locale,
    sku: sku || undefined,
    orderDateDisplay,
    receiveAtDisplay,
    receiveTypeLabel,
    cartTab,
    onCartTabChange: setCartTab,
    itemLines,
    compareLines,
    cartEmpty,
    lineCount,
    priceSummary,
    documentCollapsed,
    onToggleCollapsed: () => setDocumentCollapsed((c) => !c),
    productActionsDisabled,
    orderId,
    perms,
    onShippingEdit: () => setShippingOpen(true),
    onItemQtyChange: (key: string, qty: number) => {
      void repriceCartLines(
        cart.map((x) => {
          if (x.key !== key) return x;
          const max = cartLineMaxQty(x.product);
          return {
            ...x,
            qty: clampCartItemQty(qty, x.qty, max),
          };
        })
      );
    },
    onItemRemove: (key: string) =>
      updateCart((c) => c.filter((x) => x.key !== key)),
    onCompareQtyChange: (key: string, qty: number) =>
      updateCart((c) => c.map((x) => (x.key === key ? { ...x, qty } : x))),
    onCompareEdit: openCompareEdit,
    onCompareRemove: (key: string) =>
      updateCart((c) => c.filter((x) => x.key !== key)),
    onCancel: () => router.push("/admin/sales/store"),
    onSaveDraft: () => void save("draft"),
    onSubmitPending: () => void save("pending"),
    onPrintSlip: () => void printSlip(),
    showPrintSlip: !!orderId && status !== "draft",
  };

  const documentPanel = (
    <StoreSalesDocumentPanel layout="stacked" {...documentPanelCommon} />
  );

  const documentPanelSplit = (
    <StoreSalesDocumentPanel layout="split" {...documentPanelCommon} />
  );

  const browseColumn = (
        <div className="flex flex-col gap-4 md:h-full md:min-h-0">
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
                          placeholder={tForm("memberCodeSearchPlaceholder")}
                          emptyLabel={tFormRoot("combobox.noResults")}
                          inputClassName="w-full min-w-min"
                          disabled={customerFieldsDisabled}
                          showClear={!customerFieldsDisabled}
                          pinnedItems={
                            memberId && memberComboboxLabel
                              ? [
                                  {
                                    value: memberId,
                                    label: memberComboboxLabel,
                                  },
                                ]
                              : []
                          }
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
            className="min-h-[20rem] scroll-mt-4 md:flex md:min-h-0 md:flex-1 md:flex-col"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={storeSalesStepBadgeClass}>2</span>
                {tForm("productStep")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex md:min-h-0 md:flex-1 md:flex-col">
              {!readOnly ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-stretch gap-2">
                    <div className="flex min-w-0 flex-1 basis-48 items-end gap-1.5">
                      <CrudSearchField
                        id="store-sales-product-search"
                        className="min-w-0 flex-1"
                        value={productSearch}
                        onChange={setProductSearch}
                        placeholder={tForm("productSearchPlaceholder")}
                        disabled={productActionsDisabled}
                      />
                      <ButtonIcon
                        type="button"
                        variant="outline"
                        size="lg"
                        className="shrink-0"
                        onClick={applyProductSearch}
                        disabled={productActionsDisabled}
                        aria-label={tSearch("placeholder")}
                      >
                        <Search className="text-primary" aria-hidden />
                      </ButtonIcon>
                    </div>
                    <div className="min-w-[7rem] flex-[0_1_10rem]">
                      <RemoteComboboxField
                        label={tForm("filterCategory")}
                        value={browseCategoryId}
                        onValueChange={(v) => {
                          setBrowseCategoryId(v);
                          setBrowsePage(1);
                        }}
                        placeholder={tCrud("filter.select", {
                          label: tForm("filterCategory"),
                        })}
                        emptyLabel={tFormRoot("combobox.noResults")}
                        inputClassName="w-full min-w-[10rem]"
                        showClear
                        disabled={productActionsDisabled}
                        onLoadOptions={(ctx) =>
                          loadProductItemBrowseCategoryComboboxOptions(
                            displayLocale,
                            {
                              search: ctx.search,
                              signal: ctx.signal,
                            }
                          )
                        }
                        resolveSelectedLabel={(value) =>
                          resolveProductItemBrowseCategoryLabel(
                            displayLocale,
                            value
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "shrink-0 gap-1.5 border-primary text-primary hover:bg-primary/10 hover:text-primary",
                        "aria-expanded:border-primary aria-expanded:bg-primary/10 aria-expanded:text-primary",
                        "active:border-primary active:bg-primary/10 active:text-primary"
                      )}
                      aria-expanded={productFilterOpen}
                      onClick={() => setProductFilterOpen((o) => !o)}
                      disabled={productActionsDisabled}
                    >
                      <Filter className="size-4 text-current" aria-hidden />
                      {tForm("filter")}
                    </Button>
                  </div>
                  {productFilterOpen ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <RemoteComboboxField
                        label={tProductAttr("carBrand")}
                        value={browseBrandId}
                        onValueChange={(v) => {
                          setBrowseBrandId(v);
                          setBrowseModelId("");
                          setBrowsePage(1);
                        }}
                        placeholder={tFormRoot("placeholder.select", {
                          label: tProductAttr("carBrand"),
                        })}
                        emptyLabel={tFormRoot("combobox.noResults")}
                        inputClassName="w-full"
                        showClear
                        disabled={productActionsDisabled}
                        onLoadOptions={(ctx) =>
                          loadProductCarBrandComboboxOptions(displayLocale, {
                            search: ctx.search,
                            signal: ctx.signal,
                          })
                        }
                        resolveSelectedLabel={async (value) => {
                          const id = Number(value);
                          if (!Number.isFinite(id)) return null;
                          return resolveProductCarBrandLabel(displayLocale, id);
                        }}
                      />
                      <RemoteComboboxField
                        label={tForm("filterModel")}
                        value={browseModelId}
                        onValueChange={(v) => {
                          setBrowseModelId(v);
                          setBrowsePage(1);
                        }}
                        placeholder={tFormRoot("placeholder.select", {
                          label: tForm("filterModel"),
                        })}
                        emptyLabel={tFormRoot("combobox.noResults")}
                        inputClassName="w-full"
                        showClear
                        disabled={productActionsDisabled || !browseBrandId}
                        onLoadOptions={(ctx) =>
                          loadProductCarModelComboboxOptions(displayLocale, {
                            search: ctx.search,
                            signal: ctx.signal,
                            parentId: browseBrandId
                              ? Number(browseBrandId)
                              : undefined,
                          })
                        }
                        resolveSelectedLabel={async (value) => {
                          const id = Number(value);
                          if (!Number.isFinite(id)) return null;
                          return resolveProductCarModelLabel(displayLocale, id);
                        }}
                      />
                      <RemoteComboboxField
                        id="store-sales-browse-year"
                        label={tForm("filterYear")}
                        value={browseCarYear}
                        onValueChange={(v) => {
                          setBrowseCarYear(v);
                          setBrowsePage(1);
                        }}
                        placeholder={tFormRoot("placeholder.select", {
                          label: tForm("filterYear"),
                        })}
                        emptyLabel={tFormRoot("combobox.noResults")}
                        inputClassName="w-full"
                        showClear
                        disabled={productActionsDisabled}
                        onLoadOptions={({ search }) =>
                          Promise.resolve(loadStoreSalesBrowseYearOptions(search))
                        }
                        resolveSelectedLabel={async (value) => value || null}
                      />
                      <Input
                        id="store-sales-browse-oem"
                        type="search"
                        value={browseOem}
                        onChange={(e) => {
                          setBrowseOem(e.target.value);
                          setBrowsePage(1);
                        }}
                        placeholder={tFormRoot("placeholder.input", {
                          label: tForm("filterOem"),
                        })}
                        aria-label={tForm("filterOem")}
                        disabled={productActionsDisabled}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex w-full items-center justify-between gap-2 border-b border-border">
                <span
                  className="-mb-px border-primary py-2.5 text-sm font-medium text-primary"
                  aria-current="page"
                >
                  {tForm("tabProducts")}
                </span>
                <div className="mb-2 flex shrink-0 items-center gap-2">
                  {selectedBrowseCount > 0 ? (
                    <Button
                      type="button"
                      size="lg"
                      onClick={addSelected}
                      disabled={productActionsDisabled}
                    >
                      {tForm("bulkAdd")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className=""
                    disabled={productActionsDisabled}
                    onClick={openCompareAdd}
                  >
                    {tForm("tabCompare")}
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3">
                {!browseRequested ? (
                  <StoreSalesProductBrowseEmpty />
                ) : (
                  <>
                    <StoreSalesProductBrowseTable
                      rows={browseRows}
                      loading={browseLoading}
                      sortKey={browseSortKey}
                      sortDir={browseSortDir}
                      onSortChange={handleBrowseSortChange}
                      selectedIds={selectedBrowse}
                      onToggleRow={toggleBrowseRow}
                      onTogglePage={toggleBrowsePage}
                      onAdd={addProduct}
                      cartQtyByItemId={cartQtyByItemId}
                      onOpenCars={setCarListId}
                      onOpenWarehouse={setWhItemId}
                      disabled={productActionsDisabled}
                    />
                    <CrudPaginationBar
                      page={browsePageSafe}
                      pageSize={browsePageSize}
                      meta={{
                        total: browseTotal,
                        totalPages: browseTotalPages(browseTotal),
                      }}
                      onPageChange={setBrowsePage}
                      onPageSizeChange={(size) =>
                        onBrowsePageSizeChange(
                          size as (typeof browsePageSize)
                        )
                      }
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-4 md:hidden">
        {browseColumn}
        {documentPanel}
      </div>
      <div className="hidden min-w-0 w-full md:block">
        <StoreSalesFormDesktopSplit
          browse={browseColumn}
          documentPanel={documentPanelSplit}
        />
      </div>

      <StoreShippingDialog
        open={shippingOpen}
        onOpenChange={setShippingOpen}
        draft={shipping}
        onDraftChange={setShipping}
        onConfirm={() => void confirmShipping()}
      />

      <ProductListCarModal
        listId={carListId}
        open={carListId != null}
        onOpenChange={(open: boolean) => {
          if (!open) setCarListId(null);
        }}
      />
      <ProductListWarehouseModal
        itemId={whItemId}
        open={whItemId != null}
        onOpenChange={(open: boolean) => {
          if (!open) setWhItemId(null);
        }}
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

      <Dialog
        open={compareOpen}
        onOpenChange={(open) => {
          setCompareOpen(open);
          if (!open) setCompareEditKey(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tForm("compareModalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            <Label>{tForm("compareDetail")}</Label>
            <Textarea value={compareDetail} onChange={(e) => setCompareDetail(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="store-sales-compare-qty">{tForm("compareQty")}</Label>
            <Input
              id="store-sales-compare-qty"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={compareQty}
              onChange={(e) => setCompareQty(e.target.value)}
              placeholder={tFormRoot("placeholder.input", {
                label: tForm("compareQty"),
              })}
            />
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
                if (compareEditKey) {
                  updateCart((c) =>
                    c.map((x) =>
                      x.key === compareEditKey
                        ? { ...x, qty, detail: compareDetail }
                        : x
                    )
                  );
                } else {
                  updateCart((c) => [
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
                }
                setCompareOpen(false);
                setCompareEditKey(null);
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
