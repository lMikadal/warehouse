"use client";

import { History, Printer, SquarePen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  type DisplayLocale,
  formatDate,
  formatDateTime,
} from "@/lib/format-datetime";
import {
  fetchPurchaseDetail,
  fetchPurchaseList,
  type PurchaseDetail,
} from "@/lib/order-purchase-api";
import {
  fetchTicketDetail,
  fetchTicketHistory,
  OrderTicketApiError,
  patchTicketCustomer,
  patchTicketItemRejectStatus,
  patchTicketNote,
  type TicketDetail,
  type TicketHistoryEntry,
  type TicketItemDetail,
  type TicketItemReject,
} from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

import { PurchaseTicketExistingPosPanel } from "../../../order/purchase/_shared/purchase-ticket-existing-pos-panel";
import { toDepositReceiptNo } from "../_lib/ticket-line-helpers";
import { ticketStatusPillClass } from "./ticket-status-styles";

function money(n: number, locale: string) {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  ticketId: number;
  /** Inside the PO approve/payment tabs the page is a panel, so it drops its own page header. */
  embedded?: boolean;
  /**
   * Purchase ticket detail: right rail shows linked POs (ใบสั่งซื้อจากคำร้องนี้)
   * instead of stacking only customer / deposit / note cards.
   */
  showLinkedPurchases?: boolean;
};

export function TicketDetailPage({
  ticketId,
  embedded = false,
  showLinkedPurchases = false,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderTicket");
  const tDetail = useTranslations("page.orderTicket.detail");
  const tForm = useTranslations("page.orderTicket.form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tFormI18n = useTranslations("form");
  const perms = useResourcePermissions("order", "order_ticket");
  const { open: sidebarOpen, isMobile: sidebarMobile } = useSidebar();
  const footerInsetLeft = !sidebarMobile && sidebarOpen;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [note, setNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({
    sku: "",
    name: "",
    tel: "",
    email: "",
    dateReceive: "",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [busyRejectId, setBusyRejectId] = useState<number | null>(null);
  const [linkedPos, setLinkedPos] = useState<PurchaseDetail[]>([]);
  const [linkedPosLoading, setLinkedPosLoading] = useState(false);
  const [linkedPosError, setLinkedPosError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!perms.view) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await fetchTicketDetail(ticketId);
      setDetail(d);
      setNote(d.note ?? "");
      setCustomerDraft({
        sku: d.customer?.sku ?? "",
        name: d.customer?.name ?? "",
        tel: d.customer?.tel ?? "",
        email: d.customer?.email ?? "",
        dateReceive: d.customer?.date_receive?.slice(0, 10) ?? "",
      });
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [perms.view, ticketId, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showLinkedPurchases || !perms.view) {
      setLinkedPos([]);
      setLinkedPosError(null);
      setLinkedPosLoading(false);
      return;
    }
    const ac = new AbortController();
    setLinkedPosLoading(true);
    setLinkedPosError(null);
    void (async () => {
      try {
        const list = await fetchPurchaseList({
          page: 1,
          limit: 100,
          purchase_request_id: String(ticketId),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        const details = (
          await Promise.all(
            list.items.map(async (row) => {
              try {
                return await fetchPurchaseDetail(row.id);
              } catch {
                return null;
              }
            })
          )
        ).filter((d): d is PurchaseDetail => d != null);
        if (ac.signal.aborted) return;
        setLinkedPos(details);
        setLinkedPosLoading(false);
      } catch {
        if (ac.signal.aborted) return;
        setLinkedPos([]);
        setLinkedPosError(tError("loadFailed"));
        setLinkedPosLoading(false);
      }
    })();
    return () => ac.abort();
  }, [showLinkedPurchases, perms.view, ticketId, tError]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchTicketHistory(locale, ticketId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const openNoteEdit = () => {
    setNoteDraft(note);
    setNoteOpen(true);
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await patchTicketNote(locale, ticketId, noteDraft);
      setNote(noteDraft);
      toast.success(tCrud("toast.saved"));
      setNoteOpen(false);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSavingNote(false);
    }
  };

  const saveCustomer = async () => {
    setSavingCustomer(true);
    try {
      await patchTicketCustomer(locale, ticketId, {
        member_user_id: detail?.customer?.member_user_id ?? null,
        sku: customerDraft.sku,
        name: customerDraft.name.trim(),
        tel: customerDraft.tel.trim(),
        email: customerDraft.email.trim(),
        date_receive: customerDraft.dateReceive
          ? `${customerDraft.dateReceive}T00:00:00.000Z`
          : null,
      });
      toast.success(tCrud("toast.saved"));
      setCustomerOpen(false);
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const decideReject = async (
    rejectId: number,
    status: "approved" | "cancelled"
  ) => {
    setBusyRejectId(rejectId);
    try {
      await patchTicketItemRejectStatus(locale, ticketId, rejectId, status);
      toast.success(tCrud("toast.saved"));
      void load();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setBusyRejectId(null);
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{tError("noData")}</p>;
  }

  const catalogItems = detail.items.filter((i) => i.type === "catalog");
  const customItems = detail.items.filter((i) => i.type === "custom");

  const showDraftEdit = perms.update && detail.status === "draft";
  const noteLabel = tDetail("noteCard");

  const pendingRejectFor = (item: TicketItemDetail) =>
    item.rejects.find((r) => r.status === "pending") ?? null;

  const rejectProblemText = (reject: TicketItemReject) => {
    const parts = [
      tDetail(`rejectType.${reject.type}`),
      reject.note?.trim() || null,
      reject.product_item_name?.trim() || null,
      reject.date ? formatDate(reject.date, locale) : null,
    ].filter(Boolean);
    return parts.join(" — ");
  };

  const footerActions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void openHistory()}
      >
        <History className="text-current" aria-hidden />
        {tDetail("openHistory")}
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        {showDraftEdit ? (
          <Button asChild variant="outline">
            <Link href={`/admin/sales/ticket/${detail.id}`}>
              <SquarePen className="text-current" aria-hidden />
              {tDetail("edit")}
            </Link>
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="text-current" aria-hidden />
          {tDetail("printRequest")}
        </Button>
        <Button
          type="button"
          disabled={detail.total_deposit <= 0}
          onClick={() => window.print()}
        >
          <Printer className="text-current" aria-hidden />
          {tDetail("printDeposit")}
        </Button>
      </div>
    </>
  );

  const itemsTable = (heading: string, items: TicketItemDetail[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{heading}</p>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tForm("colProduct")}</TableHead>
                <TableHead className="text-center">{tForm("colQtySell")}</TableHead>
                <TableHead className="text-center">
                  {tForm("colQtyReorder")}
                </TableHead>
                <TableHead className="text-center">{tForm("colUnit")}</TableHead>
                <TableHead className="text-right">{tForm("colDeposit")}</TableHead>
                <TableHead className="text-center">{tPage("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const pendingReject = pendingRejectFor(item);
                const rowTone = pendingReject
                  ? "bg-warehouse-error-bg/60 hover:bg-warehouse-error-bg/60"
                  : undefined;
                return (
                  <Fragment key={item.id}>
                    <TableRow className={rowTone}>
                      <TableCell>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium">
                            {(item.type === "catalog"
                              ? item.product_item_name
                              : item.name) || "—"}
                          </p>
                          {item.product_item_sku ? (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.product_item_sku}
                            </p>
                          ) : null}
                          {item.brand_name || item.model_name ? (
                            <p className="text-xs text-muted-foreground">
                              {[
                                item.brand_name,
                                item.model_name,
                                item.engine_name,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          ) : null}
                          {item.identification_number ? (
                            <p className="text-xs text-muted-foreground">
                              {tForm("newChassis")}:{" "}
                              {item.identification_number}
                            </p>
                          ) : null}
                          {item.note ? (
                            <p className="text-xs text-muted-foreground">
                              {item.note}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {item.qty_sell}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {item.qty_reorder}
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(item.deposit, locale)}
                      </TableCell>
                      <TableCell className="text-center">
                        {pendingReject ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border border-warehouse-error-border bg-warehouse-error-bg px-2 py-0.5 text-xs font-medium text-warehouse-error-fg"
                            )}
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full bg-warehouse-error-fg"
                              aria-hidden
                            />
                            {tDetail("hasProblemBadge")}
                          </span>
                        ) : (
                          <span className={ticketStatusPillClass(item.status)}>
                            {tPage(`status.${item.status}`)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {pendingReject ? (
                      <TableRow className={rowTone}>
                        <TableCell colSpan={6} className="pt-0">
                          <div className="rounded-md border border-warehouse-error-border bg-warehouse-error-bg/80 px-3 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-warehouse-error-fg">
                                {tDetail("problemInLineTitle")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {tDetail("problemDetectedAt")}:{" "}
                                <span className="tabular-nums">
                                  {formatDate(
                                    pendingReject.created_at,
                                    locale
                                  )}
                                </span>
                              </p>
                            </div>
                            <p className="mt-1.5 text-sm">
                              <span className="text-muted-foreground">
                                {tDetail("problemFoundPrefix")}{" "}
                              </span>
                              {rejectProblemText(pendingReject)}
                            </p>
                            <p className="mt-1 text-xs text-warehouse-error-fg">
                              {tDetail("acceptConditionHint")}
                            </p>
                            {perms.update ? (
                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busyRejectId === pendingReject.id}
                                  onClick={() =>
                                    void decideReject(
                                      pendingReject.id,
                                      "cancelled"
                                    )
                                  }
                                >
                                  {tDetail("declineReject")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={busyRejectId === pendingReject.id}
                                  onClick={() =>
                                    void decideReject(
                                      pendingReject.id,
                                      "approved"
                                    )
                                  }
                                >
                                  {tDetail("acceptReject")}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const customerCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{tDetail("customerCard")}</CardTitle>
        {perms.update ? (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCustomerOpen(true)}
            >
              <SquarePen className="text-current" aria-hidden />
              {tDetail("editAction")}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <p>
          <span className="text-muted-foreground">
            {tForm("customerSku")}:{" "}
          </span>
          {detail.customer?.sku?.trim() || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            {tForm("customerName")}:{" "}
          </span>
          {detail.customer?.name?.trim() || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            {tForm("customerTel")}:{" "}
          </span>
          {detail.customer?.tel?.trim() || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            {tForm("customerEmail")}:{" "}
          </span>
          {detail.customer?.email?.trim() || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            {tForm("customerDateReceive")}:{" "}
          </span>
          {detail.customer?.date_receive
            ? formatDateTime(detail.customer.date_receive, locale)
            : "—"}
        </p>
        <p>
          <span className="text-muted-foreground">
            {tDetail("depositReceiptNo")}:{" "}
          </span>
          {toDepositReceiptNo(detail.sku) || "—"}
        </p>
      </CardContent>
    </Card>
  );

  const depositCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{tForm("depositGrand")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {tForm("depositExisting")}
          </span>
          <span className="tabular-nums">
            {money(detail.total_deposit_old, locale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tForm("depositNew")}</span>
          <span className="tabular-nums">
            {money(detail.total_deposit_new, locale)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>{tForm("depositGrand")}</span>
          <span className="tabular-nums">
            {money(detail.total_deposit, locale)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tPage("colTotalQty")}</span>
          <span className="tabular-nums">{detail.total_qty}</span>
        </div>
      </CardContent>
    </Card>
  );

  const noteCard = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{tDetail("noteCard")}</CardTitle>
        {perms.update ? (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openNoteEdit}
            >
              <SquarePen className="text-current" aria-hidden />
              {tDetail("editAction")}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{note.trim() || "—"}</p>
      </CardContent>
    </Card>
  );

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-4",
        embedded ? undefined : "pb-20"
      )}
    >
      {embedded ? null : (
        <CrudPageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>{detail.sku?.trim() || "—"}</span>
              <span className={ticketStatusPillClass(detail.status)}>
                {tPage(`status.${detail.status}`)}
              </span>
            </span>
          }
          description={tDetail("title")}
          actions={
            <p className="text-sm text-muted-foreground">
              {tDetail("createdDate")}{" "}
              <span className="tabular-nums">
                {formatDateTime(detail.created_at, locale)}
              </span>
              <span className="mx-1 text-muted-foreground/70" aria-hidden>
                |
              </span>
              {tDetail("creatorLabel")}:{" "}
              <span className="tabular-nums">
                {detail.created_by_name?.trim() || "—"}
              </span>
            </p>
          }
        />
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tDetail("itemsExisting")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {itemsTable(tDetail("itemsExisting"), catalogItems)}
              {itemsTable(tDetail("itemsNew"), customItems)}
              {detail.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {tError("noData")}
                </p>
              ) : null}
            </CardContent>
          </Card>
          {showLinkedPurchases ? (
            <>
              {customerCard}
              {depositCard}
              {noteCard}
            </>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {showLinkedPurchases ? (
            <PurchaseTicketExistingPosPanel
              orders={linkedPos}
              loading={linkedPosLoading}
              error={linkedPosError}
              showEmpty
            />
          ) : (
            <>
              {customerCard}
              {depositCard}
              {noteCard}
            </>
          )}
        </div>
      </div>

      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          {footerActions}
        </div>
      ) : (
        <div
          className={cn(
            "fixed bottom-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm transition-[left] duration-200 ease-linear",
            footerInsetLeft ? "left-(--sidebar-width)" : "left-0"
          )}
        >
          <div className="mx-auto flex w-full max-w-crud-page flex-wrap items-center justify-between gap-2 px-admin-content py-3">
            {footerActions}
          </div>
        </div>
      )}

      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tDetail("editCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="ticket-edit-customer-name">
                {tForm("customerName")}
              </Label>
              <Input
                id="ticket-edit-customer-name"
                value={customerDraft.name}
                placeholder={tFormI18n("placeholder.input", {
                  label: tForm("customerName"),
                })}
                onChange={(e) =>
                  setCustomerDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ticket-edit-customer-tel">
                {tForm("customerTel")}
              </Label>
              <Input
                id="ticket-edit-customer-tel"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={customerDraft.tel}
                placeholder={tFormI18n("placeholder.input", {
                  label: tForm("customerTel"),
                })}
                onChange={(e) =>
                  setCustomerDraft((d) => ({ ...d, tel: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ticket-edit-customer-email">
                {tForm("customerEmail")}
              </Label>
              <Input
                id="ticket-edit-customer-email"
                type="email"
                inputMode="email"
                value={customerDraft.email}
                placeholder={tFormI18n("placeholder.input", {
                  label: tForm("customerEmail"),
                })}
                onChange={(e) =>
                  setCustomerDraft((d) => ({ ...d, email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ticket-edit-customer-date">
                {tForm("customerDateReceive")}
              </Label>
              <Input
                id="ticket-edit-customer-date"
                type="date"
                value={customerDraft.dateReceive}
                onChange={(e) =>
                  setCustomerDraft((d) => ({
                    ...d,
                    dateReceive: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={
                savingCustomer ||
                !customerDraft.name.trim() ||
                !customerDraft.tel.trim()
              }
              onClick={() => void saveCustomer()}
            >
              {tPage("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tDetail("editNote")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="ticket-edit-note">{noteLabel}</Label>
            <Textarea
              id="ticket-edit-note"
              rows={4}
              value={noteDraft}
              placeholder={tFormI18n("placeholder.input", { label: noteLabel })}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoteOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={savingNote || noteDraft === (detail.note ?? "")}
              onClick={() => void saveNote()}
            >
              {tDetail("saveNote")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tDetail("historyTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tError("noData")}</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at, locale)}
                    </p>
                  </div>
                  {entry.description ? (
                    <p className="mt-1 text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                  {entry.created_by_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.created_by_name}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
