"use client";

import { AlertTriangle, Boxes, History, ImageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseDetail } from "@/lib/order-purchase-api";
import {
  fetchReceiveDetail,
  fetchReceiveHistory,
  fetchReceivePlacements,
  fetchReceiveRejects,
  OrderReceiveApiError,
  type ReceivePlacementRow,
  type ReceiveRejectDetail,
} from "@/lib/order-receive-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";
import { fetchSystemFile } from "@/lib/system-file-api";

import { PurchaseHistoryDialog } from "../../purchase/_shared/purchase-history-dialog";
import { PurchaseItemsTable } from "../../purchase/_shared/purchase-items-table";
import { PurchaseSummaryCard } from "../../purchase/_shared/purchase-summary-card";
import { ReceiveFilesPanel } from "./receive-files-panel";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ReceiveDetailPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderReceive.proceed");
  const tDetail = useTranslations("page.orderReceive.detail");
  const tPage = useTranslations("page.orderReceive");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_receive");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [rejects, setRejects] = useState<ReceiveRejectDetail[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [placements, setPlacements] = useState<ReceivePlacementRow[] | null>(null);
  const [placementsError, setPlacementsError] = useState("");
  const [rejectImages, setRejectImages] = useState<
    { title: string; urls: string[] } | null
  >(null);

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
      toast.error(e instanceof OrderReceiveApiError ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [purchaseId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const rejectsByItem = useMemo(() => {
    const map = new Map<number, ReceiveRejectDetail[]>();
    for (const r of rejects) {
      const list = map.get(r.purchase_order_item_id) ?? [];
      list.push(r);
      map.set(r.purchase_order_item_id, list);
    }
    return map;
  }, [rejects]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchReceiveHistory(locale, purchaseId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const openPlacements = async (itemId: number) => {
    setPlacements([]);
    setPlacementsError("");
    try {
      const res = await fetchReceivePlacements(purchaseId, itemId);
      setPlacements(res.items);
    } catch {
      setPlacementsError(tDetail("placementsLoadFailed"));
    }
  };

  const openRejectImages = async (reject: ReceiveRejectDetail) => {
    const urls: string[] = [];
    for (const f of reject.files) {
      const remote = await fetchSystemFile(locale, f.system_file_id).catch(
        () => null
      );
      if (remote) urls.push(remote.url);
    }
    setRejectImages({
      title: t("rejectImagesDialogTitle"),
      urls,
    });
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={`${t("purchaseNumberLabel")} ${poNumber}`}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={openHistory}>
              <History className="size-4" />
              {tPage("historyTitle")}
            </Button>
            {perms.update && detail.status !== "receive_completed" ? (
              <Button
                type="button"
                onClick={() =>
                  router.push(`/admin/order/receive/${purchaseId}`)
                }
              >
                {t("confirm")}
              </Button>
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

      <PurchaseSummaryCard detail={detail} />

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold">{t("colProduct")}</h2>
        <PurchaseItemsTable
          items={detail.items}
          actionsHeader={tPage("detailColManage")}
          renderProductExtra={(item) => {
            const rows = rejectsByItem.get(item.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <span className="flex flex-col gap-0.5">
                {rows.map((r) => (
                  <span
                    key={r.id}
                    className="flex items-center gap-1 text-xs text-warehouse-error-fg"
                  >
                    <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                    {`${t(`rejectDialog.problem${r.type === "overage" ? "Overage" : r.type === "shortage" ? "Shortage" : r.type === "damaged" ? "Damaged" : r.type === "wrong" ? "Wrong" : "Other"}`)} · ${r.qty}`}
                    {r.files.length > 0 ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => void openRejectImages(r)}
                      >
                        <ImageIcon className="size-3.5" />
                        {t("viewRejectImages")}
                      </Button>
                    ) : null}
                  </span>
                ))}
              </span>
            );
          }}
          renderActions={(item) => (
            <ButtonIcon
              aria-label={tDetail("ariaViewPlacements")}
              onClick={() => void openPlacements(item.id)}
            >
              <Boxes className="size-4" />
            </ButtonIcon>
          )}
        />
      </div>

      <ReceiveFilesPanel
        purchaseId={purchaseId}
        files={detail.files ?? []}
        readOnly
      />

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />

      <Dialog
        open={placements != null}
        onOpenChange={(open) => {
          if (!open) setPlacements(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tDetail("placementsDialogTitle")}</DialogTitle>
          </DialogHeader>
          {placementsError ? (
            <p className="text-sm text-destructive">{placementsError}</p>
          ) : (placements?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tDetail("placementsEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("binPathLabel")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {t("colQty")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {t("colBonus")}
                  </TableHead>
                  <TableHead className="text-right tabular-nums">
                    {t("colPricePerUnit")}
                  </TableHead>
                  <TableHead className="text-center">
                    {t("printCardReceiveCaption")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placements?.map((row) => (
                  <TableRow key={row.stock_id}>
                    <TableCell>
                      <span className="flex flex-col">
                        <span className="font-medium">{row.bin_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.path}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.remain_quantity.toLocaleString()} /{" "}
                      {row.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.free_gift.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.cost_per_unit, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.received_at
                        ? formatDateTime(row.received_at, locale)
                        : t("emptyCell")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectImages != null}
        onOpenChange={(open) => {
          if (!open) setRejectImages(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{rejectImages?.title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {rejectImages?.urls.map((url, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL from object storage, not a static asset
              <img
                key={url}
                src={url}
                alt={t("ariaSelectRejectImage", { index: index + 1 })}
                className="aspect-square w-full rounded-md border object-cover"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
