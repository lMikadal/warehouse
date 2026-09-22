"use client";

import { Building2, MapPin, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  fetchSalesClaimSupplierOptions,
  OrderSalesClaimApiError,
  type SalesClaimSupplierOption,
} from "@/lib/order-sales-claim-api";

export type SalesClaimSupplierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SalesClaimSupplierOption) => void;
};

/**
 * Picks the supplier the claim document is sent to (mock 3). A three-line row (name / address /
 * phone) is why this is a list dialog rather than the FK combobox: the combobox rule targets form
 * fields, not a rich picker like this.
 */
export function SalesClaimSupplierDialog({
  open,
  onOpenChange,
  onSelect,
}: SalesClaimSupplierDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderSalesClaim");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tSearch = useTranslations("search");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SalesClaimSupplierOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (term: string, signal: AbortSignal) => {
      setLoading(true);
      try {
        const items = await fetchSalesClaimSupplierOptions({
          locale,
          search: term,
          signal,
        });
        if (!signal.aborted) setRows(items);
      } catch (e) {
        if (signal.aborted) return;
        toast.error(
          e instanceof OrderSalesClaimApiError ? e.message : tError("loadFailed"),
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [locale, tError],
  );

  // Debounced server search while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const handle = setTimeout(() => void load(search, controller.signal), 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [open, search, load]);

  // Clearing on close happens in the event handler, not an effect, so the term resets on re-open.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      setRows([]);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("supplierDialogTitle")}</DialogTitle>
        </DialogHeader>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tSearch("placeholder")}
          aria-label={tSearch("placeholder")}
        />
        <div className="max-h-80 overflow-y-auto rounded-md border">
          {loading ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              {tCrud("loading")}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              {tError("noData")}
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="hover:bg-muted flex w-full flex-col gap-1 p-3 text-left"
                    onClick={() => {
                      onSelect(row);
                      handleOpenChange(false);
                    }}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Building2
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                      {row.name}
                    </span>
                    {row.address?.trim() ? (
                      <span className="text-muted-foreground flex items-center gap-2 text-xs">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        {row.address}
                      </span>
                    ) : null}
                    {row.tel?.trim() ? (
                      <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
                        <Phone className="size-3.5 shrink-0" aria-hidden />
                        {row.tel}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
