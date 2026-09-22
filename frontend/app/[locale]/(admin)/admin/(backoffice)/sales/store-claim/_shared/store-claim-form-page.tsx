"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchOrderSalesFormItemsByIds,
  fetchOrderSalesFormMember,
} from "@/lib/order-sales-form-api";
import {
  createStoreClaim,
  fetchStoreClaimPayment,
  fetchStoreClaims,
  OrderStoreClaimApiError,
  type StoreClaimDetail,
  type StoreClaimPaymentDetail,
  type StoreClaimPaymentLine,
  type StoreClaimType,
} from "@/lib/order-store-claim-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";

import {
  PickingCustomerCard,
  type PickingCustomerDisplay,
} from "../../order/_shared/picking-panels";
import {
  addStoreClaimItem,
  BLANK_STORE_CLAIM_DRAFT,
  canAddStoreClaimItem,
  canSubmitStoreClaim,
  proportionalLineTotal,
  remainingClaimAmount,
  removeStoreClaimItem,
  type StoreClaimDraft,
} from "../_lib/store-claim-draft";
import {
  ExistingStoreClaimCard,
  StoreClaimDocumentPanel,
  StoreClaimItemsCard,
  StoreClaimPaymentSummaryCard,
} from "./store-claim-cards";
import { StoreClaimTopicDialog } from "./store-claim-topic-dialog";

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[6fr_4fr]">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export function StoreClaimFormPage({ paymentId }: { paymentId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderStoreClaim");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_store_claim");

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<StoreClaimPaymentDetail | null>(null);
  const [customer, setCustomer] = useState<PickingCustomerDisplay | null>(null);
  const [productsById, setProductsById] = useState<
    Map<number, ProductItemBrowseRow>
  >(new Map());
  const [claims, setClaims] = useState<StoreClaimDetail[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState<StoreClaimDraft>(BLANK_STORE_CLAIM_DRAFT);
  const [dialogLine, setDialogLine] = useState<StoreClaimPaymentLine | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = perms.create || perms.update;

  const load = useCallback(async () => {
    if (!perms.view || paymentId <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, claimList] = await Promise.all([
        fetchStoreClaimPayment(paymentId),
        fetchStoreClaims(paymentId),
      ]);

      const productIds = detail.lines
        .map((l) => l.product_item_id ?? 0)
        .filter((id) => id > 0);
      const products = await fetchOrderSalesFormItemsByIds(
        locale,
        "store-claims",
        productIds
      );

      let memberSku = "";
      let memberFileId: number | null = null;
      if (detail.member_user_id && detail.member_user_id > 0) {
        try {
          const member = await fetchOrderSalesFormMember(
            locale,
            "store-claims",
            detail.member_user_id
          );
          memberSku = member.sku?.trim() ?? "";
          memberFileId = member.system_file_id ?? null;
        } catch {
          // A deleted member only costs the header its extras; the claim still files.
        }
      }

      setPayment(detail);
      setProductsById(new Map(products.map((p) => [p.id, p])));
      setCustomer({
        name: detail.member_name?.trim() ?? "",
        memberSku,
        tel: detail.member_tel?.trim() ?? "",
        email: detail.member_email?.trim() ?? "",
        preparedAt: detail.order_created_at ?? null,
        deliveryAt: detail.delivery_at ?? null,
        sellerName: detail.created_by_name?.trim() ?? "",
        imageFileId: memberFileId,
      });
      setClaims(claimList.items);
      setExpanded(new Set(claimList.items.map((c) => c.id)));
      setDraft(BLANK_STORE_CLAIM_DRAFT);
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError ? e.message : tPage("notFound")
      );
      router.replace("/admin/sales/store-claim");
    } finally {
      setLoading(false);
    }
  }, [perms.view, paymentId, locale, router, tPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIds = useMemo(
    () => new Set(draft.items.map((it) => it.paymentItemId)),
    [draft.items]
  );

  const dialogMaxQty = dialogLine ? remainingClaimAmount(dialogLine) : 0;

  const dialogTopics = useMemo((): StoreClaimType[] => {
    if (!dialogLine || dialogMaxQty <= 0) return [];
    return (["return", "claim"] as const).filter((topic) =>
      canAddStoreClaimItem(draft, topic, dialogLine.id)
    );
  }, [draft, dialogLine, dialogMaxQty]);

  const handleEdit = (line: StoreClaimPaymentLine) => {
    if (!canCreate) return;
    if (selectedIds.has(line.id) || remainingClaimAmount(line) <= 0) return;
    if (draft.type === "claim" && draft.items.length >= 1) {
      toast.warning(tPage("claimSingleItemOnly"));
      return;
    }
    setDialogLine(line);
  };

  const handleTopicConfirm = (input: {
    type: StoreClaimType;
    reasonId: number;
    reasonName: string;
    amount: number;
  }) => {
    const line = dialogLine;
    if (!line) return;
    if (!canAddStoreClaimItem(draft, input.type, line.id)) {
      toast.warning(
        input.type === "claim"
          ? tPage("claimSingleItemOnly")
          : tPage("topicMismatch")
      );
      return;
    }
    setDraft((prev) =>
      addStoreClaimItem(prev, {
        paymentItemId: line.id,
        type: input.type,
        reasonId: input.reasonId,
        reasonName: input.reasonName,
        amount: input.amount,
        note: "",
        product: line.product_item_id
          ? productsById.get(line.product_item_id)
          : undefined,
        detail: line.detail ?? "",
        lineTotalPrice: proportionalLineTotal(
          line.total_price,
          line.amount,
          input.amount
        ),
      })
    );
    setDialogLine(null);
  };

  const handleConfirm = async () => {
    if (!payment || draft.type == null || !draft.paymentType) return;
    const totalPrice = Number(draft.totalPrice);
    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      toast.error(tPage("requiredFields"));
      return;
    }
    setSubmitting(true);
    try {
      await createStoreClaim(locale, payment.id, {
        type: draft.type,
        payment_type: draft.paymentType,
        other_reason:
          draft.paymentType === "other" ? draft.otherReason.trim() : "",
        total_price: totalPrice,
        items: draft.items.map((it) => ({
          order_payment_item_id: it.paymentItemId,
          type: it.type,
          setting_claim_reason_id: it.reasonId,
          amount: it.amount,
          note: it.note,
        })),
      });
      toast.success(tPage("saveSuccess"));
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderStoreClaimApiError ? e.message : tPage("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }
  if (loading) return <FormSkeleton />;
  if (!payment || !customer) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("formTitle")}
        description={tPage("pageSubtitle")}
      />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[6fr_4fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <PickingCustomerCard
            customer={customer}
            sku={payment.sku}
            locale={locale}
            extraLabel={tPage("billCreatedAt")}
            extraValue={payment.created_at}
          />
          <StoreClaimItemsCard
            lines={payment.lines}
            productsById={productsById}
            selectedIds={selectedIds}
            canEdit={canCreate}
            onEdit={handleEdit}
            locale={locale}
          />
          <StoreClaimPaymentSummaryCard
            methods={payment.methods}
            paymentTotal={payment.total_price}
            locale={locale}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {claims.map((claim) => (
            <ExistingStoreClaimCard
              key={claim.id}
              claim={claim}
              productsById={productsById}
              collapsed={!expanded.has(claim.id)}
              onToggleCollapse={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(claim.id)) next.delete(claim.id);
                  else next.add(claim.id);
                  return next;
                })
              }
              locale={locale}
            />
          ))}
          <StoreClaimDocumentPanel
            draft={draft}
            paymentCategory={payment.payment_category}
            canSubmit={canCreate && canSubmitStoreClaim(draft)}
            submitting={submitting}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            onRemoveItem={(id) => setDraft((prev) => removeStoreClaimItem(prev, id))}
            onCancel={() => setDraft(BLANK_STORE_CLAIM_DRAFT)}
            onConfirm={() => void handleConfirm()}
            locale={locale}
          />
        </div>
      </div>

      <StoreClaimTopicDialog
        open={dialogLine != null}
        onOpenChange={(open) => {
          if (!open) setDialogLine(null);
        }}
        lineKey={dialogLine?.id ?? null}
        maxQty={dialogMaxQty}
        allowedTopics={dialogTopics}
        onConfirm={handleTopicConfirm}
      />
    </div>
  );
}
