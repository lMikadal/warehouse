"use client";

import { ArrowLeftRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudSearchField } from "@/components/molecules/crud-search-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTicketItemReject,
  OrderTicketApiError,
  type TicketItemDetail,
} from "@/lib/order-ticket-api";
import {
  fetchProductItems,
  type ProductItemBrowseRow,
} from "@/lib/product-list-api";
import { cn } from "@/lib/utils";

export type PurchaseChangeBrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  lineItem: TicketItemDetail | null;
  onSuccess?: () => void;
};

export function PurchaseChangeBrandDialog({
  open,
  onOpenChange,
  ticketId,
  lineItem,
  onSuccess,
}: PurchaseChangeBrandDialogProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderPurchase.receive");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ProductItemBrowseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setRows([]);
      setSelectedId(null);
      setSubmitting(false);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchProductItems(locale, {
        page: 1,
        limit: 25,
        search: query.trim() || undefined,
        isActive: true,
      })
        .then((res) => {
          if (!controller.signal.aborted) setRows(res.items);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRows([]);
            toast.error(tError("loadFailed"));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, locale, tError]);

  async function handleSubmit() {
    if (!lineItem) {
      toast.error(t("changeBrandModal.missingProductItem"));
      return;
    }
    if (lineItem.type !== "catalog") {
      toast.error(t("changeBrandModal.ineligibleType"));
      return;
    }
    if (!selectedId) {
      toast.error(t("changeBrandModal.pickProductFirst"));
      return;
    }
    if (selectedId === lineItem.product_item_id) {
      toast.error(t("changeBrandModal.sameProduct"));
      return;
    }
    setSubmitting(true);
    try {
      await createTicketItemReject(locale, ticketId, lineItem.id, {
        type: "change",
        note: "",
        product_item_id: selectedId,
      });
      toast.success(t("changeBrandModal.requestSuccess"));
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex gap-3 border-b border-border px-6 pt-6 pb-4 pr-14">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950/55"
            aria-hidden
          >
            <ArrowLeftRight className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <DialogHeader className="flex-1 gap-1 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">
              {t("changeBrandModal.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("considerModal.topics.change_brand.description")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-6 py-4">
          <CrudSearchField
            value={query}
            onChange={setQuery}
            placeholder={t("changeBrandModal.searchPlaceholder")}
            className="w-full"
          />
          <div className="max-h-[min(50vh,22rem)] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colProduct")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {t("colUnit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      {tError("noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "cursor-pointer",
                        selectedId === row.id && "bg-primary/10"
                      )}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell>
                        <p className="font-medium">{row.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.sku}
                          {row.brand_name ? ` · ${row.brand_name}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.total_stock.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {t("changeBrandModal.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
