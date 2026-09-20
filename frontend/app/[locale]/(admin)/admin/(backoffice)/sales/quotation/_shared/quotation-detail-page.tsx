"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  useAdminBackofficeActor,
  useResourcePermissions,
} from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale } from "@/lib/format-datetime";
import { loadOrderSalesCreditOptions } from "@/lib/order-sales-form-api";
import {
  fetchQuotationDetail,
  OrderQuotationApiError,
  patchQuotation,
  postQuotationAction,
  type QuotationDetail,
  type QuotationItemInput,
} from "@/lib/order-quotation-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import {
  computeStoreSalesPriceSummary,
  hydrateStoreSalesCartProducts,
  summaryLinesFromCartItems,
} from "@/lib/store-sales-cart-pricing";
import {
  fetchStoreSalesMemberSnapshot,
} from "@/lib/store-sales-member-combobox";
import type { StoreSalesDocumentCartLine } from "../../store/_shared/store-sales-document-panel";
import { StoreSalesFormDesktopSplitSkeleton } from "../../store/_shared/store-sales-form-desktop-split-skeleton";

import { QuotationFormPage } from "./quotation-form-page";
import { QuotationAcceptDialog } from "./quotation-accept-dialog";
import type { QuotationAcceptPanelMode } from "./quotation-accept-dialog";
import { QuotationAcceptSidePanel } from "./quotation-accept-side-panel";
import { QuotationCustomerReadonlyCard } from "./quotation-customer-readonly-card";
import { QuotationDetailItemsPanel } from "./quotation-detail-items-panel";
import { QuotationDetailMetaCard } from "./quotation-detail-meta-card";
import { quotationStatusPillClass } from "./quotation-status-styles";

const StoreSalesFormDesktopSplit = dynamic(
  () =>
    import("../../store/_shared/store-sales-form-desktop-split").then(
      (m) => m.StoreSalesFormDesktopSplit
    ),
  { ssr: false, loading: () => <StoreSalesFormDesktopSplitSkeleton /> }
);

const QUOTATION_FORM_RESOURCE = "quotations" as const;

type Props = { id: number };

type CustomerView = {
  memberId: string;
  memberComboboxLabel: string;
  creditId: string;
  creditOptions: { value: string; label: string }[];
  memberName: string;
  memberTel: string;
  memberEmail: string;
  memberAddressDisplay: string;
  memberTaxNumber: string;
};

export function QuotationDetailPage({ id }: Props) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const actor = useAdminBackofficeActor();
  const perms = useResourcePermissions("order", "order_quotation");
  const tPage = useTranslations("page.orderQuotation");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");
  const tError = useTranslations("error");
  const { open: sidebarOpen, isMobile } = useSidebar();
  const footerInsetLeft = !isMobile && sidebarOpen;

  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [customerView, setCustomerView] = useState<CustomerView | null>(null);
  const [itemLines, setItemLines] = useState<StoreSalesDocumentCartLine[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptPanel, setAcceptPanel] =
    useState<QuotationAcceptPanelMode | null>(null);
  const [acceptPhase, setAcceptPhase] = useState<"form" | "result">("form");
  const [superadminEditMode, setSuperadminEditMode] = useState(false);
  const [baselineItemLines, setBaselineItemLines] = useState<
    StoreSalesDocumentCartLine[]
  >([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const d = await fetchQuotationDetail(locale, id);
      setDetail(d);

      const { options: creditOptions } = await loadOrderSalesCreditOptions(
        locale,
        QUOTATION_FORM_RESOURCE,
        "",
        1
      );

      let memberComboboxLabel = "";
      let memberAddressDisplay = "";
      let memberTaxNumber = "";
      const memberId = d.member_user_id ? String(d.member_user_id) : "";
      const creditId = d.member_setting_credit_id
        ? String(d.member_setting_credit_id)
        : "";

      if (d.member_user_id) {
        try {
          const snap = await fetchStoreSalesMemberSnapshot(
            locale,
            d.member_user_id,
            QUOTATION_FORM_RESOURCE
          );
          memberComboboxLabel = snap.memberComboboxLabel;
          memberAddressDisplay = snap.memberAddressDisplay;
          memberTaxNumber = snap.memberTaxNumber;
        } catch {
          memberComboboxLabel = d.member_name?.trim() ?? "";
        }
      }

      setCustomerView({
        memberId,
        memberComboboxLabel,
        creditId,
        creditOptions,
        memberName: d.member_name ?? "",
        memberTel: d.member_tel ?? "",
        memberEmail: d.member_email ?? "",
        memberAddressDisplay,
        memberTaxNumber,
      });

      const loadedCart = (d.items ?? []).map((it, i) => ({
        key: `loaded-${it.id ?? i}`,
        quotationItemId: it.id,
        type: "item" as const,
        qty: it.amount,
        unitPrice: it.price_per_unit,
        discount: it.discount,
        product: it.product_item_id
          ? ({
              id: it.product_item_id,
              sku: "",
              name: "",
            } as ProductItemBrowseRow)
          : undefined,
      }));
      let hydrated: StoreSalesDocumentCartLine[] = loadedCart;
      try {
        hydrated = (await hydrateStoreSalesCartProducts(locale, loadedCart, {
          itemsResource: QUOTATION_FORM_RESOURCE,
        })) as StoreSalesDocumentCartLine[];
      } catch {
        /* ponytail: show lines without product browse fields if hydrate fails */
      }
      setItemLines(hydrated);
      setBaselineItemLines(
        hydrated.map((line) => ({
          ...line,
          product: line.product ? { ...line.product } : undefined,
        }))
      );
      setSuperadminEditMode(false);
    } catch {
      setLoadError(true);
      toast.error(tError("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [id, locale, perms.view, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  const superadmin = actor.type === "superadmin";
  /** Seller workflow (print / accept / pay) — not view-only roles. */
  const canSellerQuotationActions = perms.update || perms.create;

  const priceSummary = useMemo(() => {
    if (!detail) {
      return computeStoreSalesPriceSummary([], 7, 0);
    }
    const vat = Number.isFinite(detail.vat_rate) ? detail.vat_rate : 7;
    return computeStoreSalesPriceSummary(
      summaryLinesFromCartItems(itemLines),
      vat,
      0
    );
  }, [detail, itemLines]);

  const lineEditFingerprint = (lines: StoreSalesDocumentCartLine[]) =>
    lines
      .map((l) => `${l.key}:${l.qty}:${l.unitPrice}:${l.discount}`)
      .join("|");

  const editDirty =
    superadminEditMode &&
    lineEditFingerprint(itemLines) !== lineEditFingerprint(baselineItemLines);

  const bodyItems = (): QuotationItemInput[] =>
    itemLines.map((line) => ({
      ...(line.quotationItemId != null ? { id: line.quotationItemId } : {}),
      product_item_id: line.product?.id ?? null,
      amount: line.qty,
      price_per_unit: line.unitPrice,
      discount: line.discount,
    }));

  const onLineChange = (
    key: string,
    patch: Partial<
      Pick<StoreSalesDocumentCartLine, "qty" | "unitPrice" | "discount">
    >
  ) => {
    setItemLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const cancelSuperadminEdit = () => {
    setItemLines(
      baselineItemLines.map((line) => ({
        ...line,
        product: line.product ? { ...line.product } : undefined,
      }))
    );
    setSuperadminEditMode(false);
  };

  const saveSuperadminEdit = async () => {
    setSavingEdit(true);
    try {
      await patchQuotation(locale, id, { items: bodyItems() });
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const submitReturn = async () => {
    const note = returnNote.trim();
    if (!note) {
      toast.error(tError("required"));
      return;
    }
    setReturnSubmitting(true);
    try {
      await postQuotationAction(locale, id, "return", { note });
      setReturnOpen(false);
      setReturnNote("");
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  const runReject = async () => {
    try {
      await postQuotationAction(locale, id, "reject", {});
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    }
  };

  const runApprove = async () => {
    try {
      await postQuotationAction(locale, id, "approve", {});
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderQuotationApiError ? e.message : tError("saveFailed")
      );
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <StoreSalesFormDesktopSplitSkeleton />
      </div>
    );
  }

  if (!detail || !customerView) {
    return (
      <p className="text-muted-foreground">
        {loadError ? tError("loadFailed") : tError("noData")}
      </p>
    );
  }

  if (detail.status === "draft") {
    return (
      <QuotationFormPage
        editId={id}
        onSubmitted={async () => {
          await load();
        }}
      />
    );
  }

  const lineCount = itemLines.length;

  const showSellerAccept =
    !superadmin && !detail.accept_mode && detail.status === "approved";

  const itemsPanel = (
    <QuotationDetailItemsPanel
      locale={locale}
      itemLines={itemLines}
      lineCount={lineCount}
      priceSummary={priceSummary}
      editable={superadminEditMode && superadmin && detail.status === "pending"}
      onLineChange={onLineChange}
    />
  );

  const acceptSidePanel =
    acceptPanel != null ? (
      <QuotationAcceptSidePanel
        mode={acceptPanel}
        phase={acceptPhase}
        detail={detail}
        locale={locale}
        itemCount={itemLines.length}
        layout="split"
      />
    ) : null;

  const acceptSidePanelStacked =
    acceptPanel != null ? (
      <QuotationAcceptSidePanel
        mode={acceptPanel}
        phase={acceptPhase}
        detail={detail}
        locale={locale}
        itemCount={itemLines.length}
        layout="stacked"
      />
    ) : null;

  const metaPanelStacked = (
    <QuotationDetailMetaCard
      locale={locale}
      issueDate={detail.issue_date}
      validUntil={detail.valid_until}
      sellerName={detail.created_by_name}
      reserveStock={detail.reserve_stock}
      notes={detail.notes}
      layout="stacked"
    />
  );

  const metaPanelSplit = (
    <QuotationDetailMetaCard
      locale={locale}
      issueDate={detail.issue_date}
      validUntil={detail.valid_until}
      sellerName={detail.created_by_name}
      reserveStock={detail.reserve_stock}
      notes={detail.notes}
      layout="split"
    />
  );

  const leftColumnSplit = (
    <div className="flex min-h-0 flex-col gap-4">
      <QuotationCustomerReadonlyCard locale={locale} {...customerView} />
      {itemsPanel}
    </div>
  );

  const rightPanelSplit = acceptSidePanel ?? metaPanelSplit;
  const rightPanelStacked = acceptSidePanelStacked ?? metaPanelStacked;

  return (
    <div className="flex flex-col gap-4 pb-20">
      <CrudPageHeader
        className="mb-0"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{detail.sku?.trim() || "—"}</span>
            <span className={quotationStatusPillClass(detail.status)}>
              {tPage(`saleStatus.${detail.status}`)}
            </span>
          </span>
        }
      />

      <div className="flex flex-col gap-4 md:hidden">
        <QuotationCustomerReadonlyCard locale={locale} {...customerView} />
        {itemsPanel}
        {rightPanelStacked}
      </div>
      <div className="hidden min-w-0 w-full md:block">
        <StoreSalesFormDesktopSplit
          browse={leftColumnSplit}
          documentPanel={rightPanelSplit}
        />
      </div>

      <div
        className={cn(
          "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
          footerInsetLeft ? "left-[var(--sidebar-width)]" : "left-0"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-crud-page flex-wrap items-center gap-2 px-admin-content py-3",
            acceptPanel && acceptPhase === "form"
              ? "justify-between"
              : "justify-end"
          )}
        >
          {acceptPanel ? (
            acceptPhase === "result" ? (
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => window.print()}
                >
                  <Printer className="text-current" aria-hidden />
                  {tPage("detail.printMiniReceipt")}
                </Button>
                <Button type="button" size="lg">
                  <Check className="text-current" aria-hidden />
                  {tPage("detail.picking")}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setAcceptPanel(null);
                    setAcceptPhase("form");
                    setAcceptOpen(true);
                  }}
                >
                  <ArrowLeft className="text-current" aria-hidden />
                  {tCrud("btn.back")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setAcceptPhase("result")}
                >
                  <Check className="text-current" aria-hidden />
                  {acceptPanel === "payment"
                    ? tPage("acceptModal.confirmPayment")
                    : tPage("acceptModal.credit")}
                </Button>
              </>
            )
          ) : (
            <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/sales/quotation")}
          >
            {tCrud("btn.back")}
          </Button>

          {detail.status === "pending" && !superadmin ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled
                title={tPage("detail.pendingSellerHint")}
              >
                {tPage("detail.print")}
              </Button>
              <Button
                type="button"
                size="lg"
                disabled
                title={tPage("detail.pendingSellerHint")}
              >
                {tPage("detail.accept")}
              </Button>
            </>
          ) : null}

          {detail.status === "pending" && superadmin ? (
            <>
              {superadminEditMode && editDirty ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={savingEdit}
                    onClick={cancelSuperadminEdit}
                  >
                    {tCrud("btn.cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={savingEdit}
                    onClick={() => void saveSuperadminEdit()}
                  >
                    {tCrud("btn.save")}
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="text-destructive hover:text-destructive"
                onClick={() => void runReject()}
              >
                {tPage("detail.reject")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setReturnOpen(true)}
              >
                {tPage("detail.returnEdit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                aria-pressed={superadminEditMode}
                onClick={() => {
                  if (superadminEditMode) {
                    cancelSuperadminEdit();
                  } else {
                    setSuperadminEditMode(true);
                  }
                }}
              >
                {tPage("detail.edit")}
              </Button>
              <Button type="button" size="lg" onClick={() => void runApprove()}>
                {tPage("detail.approve")}
              </Button>
            </>
          ) : null}

          {showSellerAccept && !acceptPanel ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!canSellerQuotationActions}
                onClick={() => window.print()}
              >
                {tPage("detail.print")}
              </Button>
              <Button
                type="button"
                size="lg"
                disabled={!canSellerQuotationActions}
                onClick={() => setAcceptOpen(true)}
              >
                {tPage("detail.accept")}
              </Button>
            </>
          ) : null}

          {detail.status === "approved" &&
          !showSellerAccept &&
          !acceptPanel ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={!canSellerQuotationActions}
              onClick={() => window.print()}
            >
              {tPage("detail.print")}
            </Button>
          ) : null}

          {detail.status === "approved" && detail.accept_mode === "payment" ? (
            <Button
              type="button"
              size="lg"
              disabled={!canSellerQuotationActions}
              onClick={() => router.push(`/admin/sales/quotation/${id}/payment`)}
            >
              {tPage("detail.pay")}
            </Button>
          ) : null}

          {detail.status === "success" && !acceptPanel ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!canSellerQuotationActions}
                onClick={() => window.print()}
              >
                {tPage("detail.print")}
              </Button>
              {!detail.accept_mode ? (
                <Button
                  type="button"
                  size="lg"
                  disabled={!canSellerQuotationActions}
                  onClick={() => setAcceptOpen(true)}
                >
                  {tPage("detail.accept")}
                </Button>
              ) : null}
            </>
          ) : null}
            </>
          )}
        </div>
      </div>

      <Dialog
        open={returnOpen}
        onOpenChange={(open) => {
          setReturnOpen(open);
          if (!open) setReturnNote("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPage("returnModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="return-note">{tPage("returnModal.note")}</Label>
            <Textarea
              id="return-note"
              rows={4}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder={tForm("placeholder.input", {
                label: tPage("returnModal.note"),
              })}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={returnSubmitting}
              onClick={() => setReturnOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={returnSubmitting}
              onClick={() => void submitReturn()}
            >
              {tPage("detail.returnEdit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuotationAcceptDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onSelect={(mode) => {
          setAcceptOpen(false);
          setAcceptPhase("form");
          setAcceptPanel(mode);
        }}
      />
    </div>
  );
}
