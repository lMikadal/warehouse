"use client";

import { AlertTriangle, History, Pencil, Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
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
} from "@/lib/order-ticket-api";

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
};

export function TicketDetailPage({ ticketId, embedded = false }: Props) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderTicket");
  const tDetail = useTranslations("page.orderTicket.detail");
  const tForm = useTranslations("page.orderTicket.form");
  const tPrint = useTranslations("page.orderTicket.print");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_ticket");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [note, setNote] = useState("");
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
  const [printOpen, setPrintOpen] = useState(false);
  const [busyRejectId, setBusyRejectId] = useState<number | null>(null);

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

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchTicketHistory(locale, ticketId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await patchTicketNote(locale, ticketId, note);
      toast.success(tCrud("toast.saved"));
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
  const pendingRejects = detail.items.flatMap((item) =>
    item.rejects
      .filter((r) => r.status === "pending")
      .map((r) => ({ item, reject: r }))
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
              {items.map((item) => (
                <TableRow key={item.id}>
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
                          {[item.brand_name, item.model_name, item.engine_name]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      ) : null}
                      {item.identification_number ? (
                        <p className="text-xs text-muted-foreground">
                          {tForm("newChassis")}: {item.identification_number}
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
                    <span className={ticketStatusPillClass(item.status)}>
                      {tPage(`status.${item.status}`)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void openHistory()}>
              <History className="text-current" aria-hidden />
              {tDetail("openHistory")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintOpen(true)}
            >
              <Printer className="text-current" aria-hidden />
              {tPrint("title")}
            </Button>
            {perms.update && detail.status === "draft" ? (
              <Button asChild>
                <Link href={`/admin/sales/ticket/${detail.id}`}>
                  <Pencil className="text-current" aria-hidden />
                  {tDetail("edit")}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {pendingRejects.length > 0 ? (
            <Card className="border-warehouse-error-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-warehouse-error-fg">
                  <AlertTriangle className="size-4" aria-hidden />
                  {tDetail("rejectsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRejects.map(({ item, reject }) => (
                  <div
                    key={reject.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">
                        {(item.type === "catalog"
                          ? item.product_item_name
                          : item.name) || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tDetail(`rejectType.${reject.type}`)}
                        {reject.note ? ` — ${reject.note}` : ""}
                      </p>
                      {reject.product_item_name ? (
                        <p className="text-xs text-muted-foreground">
                          {reject.product_item_name}
                        </p>
                      ) : null}
                    </div>
                    {perms.update ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyRejectId === reject.id}
                          onClick={() => void decideReject(reject.id, "cancelled")}
                        >
                          {tDetail("declineReject")}
                        </Button>
                        <Button
                          type="button"
                          disabled={busyRejectId === reject.id}
                          onClick={() => void decideReject(reject.id, "approved")}
                        >
                          {tDetail("acceptReject")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

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
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">{tDetail("customerCard")}</CardTitle>
              {perms.update ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomerOpen(true)}
                >
                  <Pencil className="text-current" aria-hidden />
                  {tDetail("editCustomer")}
                </Button>
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
                  {tPage("colSeller")}:{" "}
                </span>
                {detail.created_by_name?.trim() || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {tDetail("depositReceiptNo")}:{" "}
                </span>
                {toDepositReceiptNo(detail.sku) || "—"}
              </p>
            </CardContent>
          </Card>

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
                <span className="text-muted-foreground">
                  {tPage("colTotalQty")}
                </span>
                <span className="tabular-nums">{detail.total_qty}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tDetail("noteCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                aria-label={tDetail("noteCard")}
                rows={4}
                value={note}
                disabled={!perms.update}
                onChange={(e) => setNote(e.target.value)}
              />
              {perms.update ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={savingNote || note === (detail.note ?? "")}
                    onClick={() => void saveNote()}
                  >
                    {tDetail("saveNote")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

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
                value={customerDraft.tel}
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

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tPrint("title")}</DialogTitle>
            <DialogDescription>{tPrint("hint")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPrintOpen(false);
                window.print();
              }}
            >
              <Printer className="text-current" aria-hidden />
              {tPrint("request")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={detail.total_deposit <= 0}
              onClick={() => {
                setPrintOpen(false);
                window.print();
              }}
            >
              <Printer className="text-current" aria-hidden />
              {tPrint("deposit")}
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintOpen(false)}
            >
              {tPrint("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
