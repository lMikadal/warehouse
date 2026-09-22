"use client";

import { AlertTriangle, ArrowLeftRight, Copy, Printer, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
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
} from "@/lib/order-receive-api";

import { lineNet } from "../../purchase/_lib/purchase-totals";
import { PurchaseConvertUnitDialog } from "../../purchase/_shared/purchase-convert-unit-dialog";
import { PurchaseItemsTable } from "../../purchase/_shared/purchase-items-table";
import { PurchaseSummaryCard } from "../../purchase/_shared/purchase-summary-card";
import { ReceiveFilesPanel } from "./receive-files-panel";
import { ReceivePlacementPanel } from "./receive-placement-panel";
import {
  ReceivePrintDialog,
  type ReceivePrintTarget,
} from "./receive-print-dialog";
import { ReceiveRejectDialog } from "./receive-reject-dialog";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReceiveProceedPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderReceive.proceed");
  const tPage = useTranslations("page.orderReceive");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_receive");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [rejects, setRejects] = useState<ReceiveRejectDetail[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PurchaseItemDetail | null>(null);
  const [convertTarget, setConvertTarget] = useState<PurchaseItemDetail | null>(null);
  const [printTarget, setPrintTarget] = useState<ReceivePrintTarget | null>(null);
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
      percent: items.length ? (received.length / items.length) * 100 : 0,
    };
  }, [items]);

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

  const poNumber = detail.sku?.trim() || detail.sku_draft?.trim() || t("emptyCell");
  const canReceive = perms.update && detail.status !== "receive_completed";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={`${t("purchaseNumberLabel")} ${poNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <ButtonIcon
              variant="outline"
              aria-label={t("ariaCopyPO")}
              onClick={copyPo}
            >
              <Copy className="size-4" />
            </ButtonIcon>
            {copied ? (
              <span className="text-xs text-muted-foreground">
                {tPage("copyDone")}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/order/receive")}
            >
              {t("back")}
            </Button>
          </div>
        }
      />

      <ResizablePanelGroup className="min-h-[60vh] w-full">
        <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <PurchaseSummaryCard detail={detail} />

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">{t("progressTitle")}</h2>
              <Progress value={progress.percent} className="mb-3" />
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("progressTotal")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {progress.total.toLocaleString()} {t("progressUnit")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("progressReceived")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {progress.receivedCount.toLocaleString()} {t("progressUnit")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("progressReceivedValue")}
                  </span>
                  <span className="font-bold tabular-nums">
                    {money(progress.receivedValue, locale)} {tPage("currencySuffix")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("progressProblemValue")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(progress.problemValue, locale)} {tPage("currencySuffix")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">{t("colProduct")}</h2>
              <PurchaseItemsTable
                items={items}
                selectedItemId={selectedId}
                onSelectItem={(item) => setSelectedId(item.id)}
                actionsHeader={t("colManage")}
                renderProductExtra={(item) => {
                  const rows = rejectsByItem.get(item.id) ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <span className="flex items-center gap-1 text-xs text-warehouse-error-fg">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      {t("problemFoundBadge")}
                      {` (${rows.length})`}
                    </span>
                  );
                }}
                renderActions={(item) => (
                  <>
                    <ButtonIcon
                      aria-label={t("ariaPrintBarcode")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintTarget({
                          sku: item.product_item_sku?.trim() ?? "",
                          name:
                            item.product_item_name?.trim() ||
                            item.name?.trim() ||
                            "",
                          barcode: item.code_barcode?.trim() ?? "",
                          qrcode: item.code_qrcode?.trim() ?? "",
                          supplierName: detail.supplier_name?.trim() ?? "",
                          receivedAt: formatDateTime(item.updated_at, locale),
                        });
                      }}
                    >
                      <Printer className="size-4" />
                    </ButtonIcon>
                    {canReceive && item.status !== "receive_approved" ? (
                      <ButtonIcon
                        aria-label={t("ariaReject")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectTarget(item);
                        }}
                      >
                        <AlertTriangle className="size-4 text-warehouse-error-fg" />
                      </ButtonIcon>
                    ) : null}
                    {canReceive && item.status !== "receive_approved" ? (
                      <ButtonIcon
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
                  </>
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
