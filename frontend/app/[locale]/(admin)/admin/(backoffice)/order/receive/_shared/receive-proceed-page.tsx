"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Calendar,
  Copy,
  Package,
  Undo2,
  User,
  Warehouse,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseDetail, PurchaseItemDetail } from "@/lib/order-purchase-api";
import {
  convertReceiveItemUnit,
  fetchReceiveDetail,
  fetchReceiveRejects,
  OrderReceiveApiError,
  revertReceiveItemUnit,
  type ReceiveRejectDetail,
  type ReceiveStatusFilter,
} from "@/lib/order-receive-api";

import { lineNet } from "../../purchase/_lib/purchase-totals";
import { PurchaseConvertUnitDialog } from "../../purchase/_shared/purchase-convert-unit-dialog";
import { PurchaseItemsTable } from "../../purchase/_shared/purchase-items-table";
import { ReceiveFilesPanel } from "./receive-files-panel";
import { ReceivePlacementPanel } from "./receive-placement-panel";
import {
  ReceivePrintDialog,
  type ReceivePrintTarget,
} from "./receive-print-dialog";
import { ReceiveRejectDialog } from "./receive-reject-dialog";
import {
  receiveDisplayStatus,
  receiveStatusPillClass,
} from "./receive-status-styles";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function receiveStatusLabel(
  status: ReceiveStatusFilter,
  tPage: ReturnType<typeof useTranslations>
): string {
  switch (status) {
    case "completed":
      return tPage("statusPurchaseCompleted");
    case "receive_partial":
      return tPage("statusReceivePartial");
    case "receive_completed":
      return tPage("statusReceiveCompleted");
    case "reject":
      return tPage("statusReject");
    default:
      return "—";
  }
}

export function ReceiveProceedPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderReceive.proceed");
  const tPage = useTranslations("page.orderReceive");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_receive");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [rejects, setRejects] = useState<ReceiveRejectDetail[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PurchaseItemDetail | null>(
    null
  );
  const [convertTarget, setConvertTarget] = useState<PurchaseItemDetail | null>(
    null
  );
  const [printTarget, setPrintTarget] = useState<ReceivePrintTarget | null>(
    null
  );
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [next, rejectRes] = await Promise.all([
        fetchReceiveDetail(purchaseId),
        fetchReceiveRejects(purchaseId).catch(() => ({ items: [] })),
      ]);
      setDetail(next);
      setRejects(rejectRes.items);
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [purchaseId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => detail?.items ?? [], [detail]);
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const rejectsByItem = useMemo(() => {
    const map = new Map<number, ReceiveRejectDetail[]>();
    for (const r of rejects) {
      const list = map.get(r.purchase_order_item_id) ?? [];
      list.push(r);
      map.set(r.purchase_order_item_id, list);
    }
    return map;
  }, [rejects]);

  const progress = useMemo(() => {
    const received = items.filter((i) => i.status === "receive_approved");
    const problematic = items.filter((i) => i.status === "receive_rejected");
    const value = (list: PurchaseItemDetail[]) =>
      list.reduce(
        (sum, i) =>
          sum +
          lineNet({
            qty: i.qty,
            price_per_unit: i.price_per_unit,
            discount: i.discount,
          }),
        0
      );
    return {
      total: items.length,
      receivedCount: received.length,
      receivedValue: value(received),
      problemValue: value(problematic),
    };
  }, [items]);

  const displayStatus = useMemo(() => {
    if (!detail) return "completed" as ReceiveStatusFilter;
    return receiveDisplayStatus({
      status: detail.status,
      approved_item_count: progress.receivedCount,
      total_qty: detail.total_qty,
      item_reject_count: rejects.length,
    });
  }, [detail, progress.receivedCount, rejects.length]);

  const revertConvert = async (item: PurchaseItemDetail) => {
    setRevertingId(item.id);
    try {
      await revertReceiveItemUnit(locale, purchaseId, item.id);
      toast.success(t("revertConvertSuccess"));
      if (selectedId === item.id) setSelectedId(null);
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : t("revertConvertFailed")
      );
    } finally {
      setRevertingId(null);
    }
  };

  const copyPo = async () => {
    const sku = detail?.sku?.trim() || detail?.sku_draft?.trim();
    if (!sku) return;
    try {
      await navigator.clipboard.writeText(sku);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(tError("generic"));
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{t("notFound")}</p>;
  }

  const poNumber =
    detail.sku?.trim() || detail.sku_draft?.trim() || t("emptyCell");
  const canReceive = perms.update && detail.status !== "receive_completed";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPage("title")}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/order/receive")}
          >
            {t("back")}
          </Button>
        }
      />

      <ResizablePanelGroup className="min-h-[60vh] w-full">
        <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="shadow-none">
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-lg tabular-nums">
                      {poNumber}
                    </CardTitle>
                    <ButtonIcon
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={t("ariaCopyPO")}
                      onClick={() => void copyPo()}
                    >
                      <Copy className="size-3.5" />
                    </ButtonIcon>
                    {copied ? (
                      <span className="text-xs text-muted-foreground">
                        {tPage("copyDone")}
                      </span>
                    ) : null}
                  </div>
                  <Badge
                    variant="secondary"
                    className={receiveStatusPillClass(displayStatus)}
                  >
                    {receiveStatusLabel(displayStatus, tPage)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4 shrink-0" aria-hidden />
                    <span className="tabular-nums">
                      {formatDateTime(detail.created_at, locale)}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-4 shrink-0" aria-hidden />
                    <span>{detail.created_by_name?.trim() || "—"}</span>
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-4 shrink-0" aria-hidden />
                    <span>{detail.supplier_name?.trim() || "—"}</span>
                  </p>
                  {detail.purchase_request_id &&
                  detail.purchase_request_sku?.trim() ? (
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      <p>
                        {tDetail("requestTicketNumberLabel")}{" "}
                        <Link
                          href={`/admin/sales/ticket/${detail.purchase_request_id}/detail`}
                          className="font-medium text-primary underline"
                        >
                          {detail.purchase_request_sku}
                        </Link>
                      </p>
                      {detail.request_created_by_name?.trim() ? (
                        <p>
                          {tDetail("ticketCreatorLabel")}{" "}
                          {detail.request_created_by_name.trim()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10"
                      aria-hidden
                    >
                      <Package className="size-4 text-primary" />
                    </span>
                    {t("progressTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("progressReceived")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {progress.receivedCount.toLocaleString()}{" "}
                      {t("progressUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("progressTotal")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {progress.total.toLocaleString()} {t("progressUnit")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("progressReceivedValue")}
                    </p>
                    <p className="font-bold tabular-nums">
                      {money(progress.receivedValue, locale)}{" "}
                      {tPage("currencySuffix")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("progressProblemValue")}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {money(progress.problemValue, locale)}{" "}
                      {tPage("currencySuffix")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">
                {t("itemsHeading", { count: items.length })}
              </h2>
              <PurchaseItemsTable
                items={items}
                selectedItemId={selectedId}
                actionsHeader={t("colManage")}
                renderProductExtra={(item) => {
                  const rows = rejectsByItem.get(item.id) ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <span className="flex items-center gap-1 text-xs text-warehouse-error-fg">
                      <AlertTriangle
                        className="size-3.5 shrink-0"
                        aria-hidden
                      />
                      {t("problemFoundBadge")}
                      {` (${rows.length})`}
                    </span>
                  );
                }}
                renderActions={(item) => (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        selectedId === item.id ? "default" : "outline"
                      }
                      className="gap-1"
                      aria-label={t("ariaSelectWarehouse")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                    >
                      <Warehouse className="size-3.5" aria-hidden />
                      {t("labelActionWarehouse")}
                    </Button>
                    {canReceive && item.status !== "receive_approved" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 border-warehouse-error-border text-warehouse-error-fg hover:bg-warehouse-error-bg"
                        aria-label={t("ariaReject")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectTarget(item);
                        }}
                      >
                        <X className="size-3.5" aria-hidden />
                        {t("labelActionCancel")}
                      </Button>
                    ) : null}
                    {canReceive && item.status !== "receive_approved" ? (
                      <ButtonIcon
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t("unitConvert.ariaConvertUnit")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConvertTarget(item);
                        }}
                      >
                        <ArrowLeftRight className="size-4" />
                      </ButtonIcon>
                    ) : null}
                    {canReceive && item.parent_id != null ? (
                      <ButtonIcon
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t("ariaRevertConvert")}
                        disabled={revertingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void revertConvert(item);
                        }}
                      >
                        <Undo2 className="size-4" />
                      </ButtonIcon>
                    ) : null}
                  </div>
                )}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("selectWarehouseHint")}
              </p>
            </div>

            <ReceiveFilesPanel
              purchaseId={purchaseId}
              files={detail.files ?? []}
              readOnly={!perms.update}
              onSaved={() => void load()}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-2 w-1.5" />
        <ResizablePanel defaultSize={32} minSize={22} className="min-w-0">
          <div className="h-full overflow-y-auto pl-1">
            <ReceivePlacementPanel
              purchaseId={purchaseId}
              item={selectedItem}
              vatRate={detail.vat_rate}
              disabled={!canReceive}
              onCancel={() => setSelectedId(null)}
              onReceived={() => {
                setSelectedId(null);
                void load();
              }}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ReceiveRejectDialog
        open={rejectTarget != null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        purchaseId={purchaseId}
        item={rejectTarget}
        vatRate={detail.vat_rate}
        onSubmitted={() => void load()}
      />

      <PurchaseConvertUnitDialog
        onOpenChange={(open) => {
          if (!open) setConvertTarget(null);
        }}
        purchaseId={purchaseId}
        item={convertTarget}
        convert={convertReceiveItemUnit}
        onConverted={() => void load()}
      />

      <ReceivePrintDialog
        open={printTarget != null}
        onOpenChange={(open) => {
          if (!open) setPrintTarget(null);
        }}
        target={printTarget}
      />
    </div>
  );
}
