"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { PurchaseVatType } from "@/lib/order-purchase-api";
import { fetchSettingVat } from "@/lib/setting-api";

import { PurchaseCreateLeftPanel } from "./purchase-create-left-panel";
import { PurchaseTicketReceiveDesktopSplitSkeleton } from "./purchase-ticket-receive-desktop-split-skeleton";
import { PurchaseTicketReceiveSummaryPanel } from "./purchase-ticket-receive-summary-panel";
import type {
  ReceiveDraftCard,
  ReceiveDraftLine,
  ReceiveSupplierOption,
} from "./purchase-ticket-receive-types";

const PurchaseTicketReceiveDesktopSplit = dynamic(
  () =>
    import("./purchase-ticket-receive-desktop-split").then(
      (m) => m.PurchaseTicketReceiveDesktopSplit
    ),
  { ssr: false, loading: () => <PurchaseTicketReceiveDesktopSplitSkeleton /> }
);

const DEFAULT_VAT_RATE = 7;
const DEFAULT_VAT_TYPE: PurchaseVatType = "exclude";

export function PurchaseCreatePage() {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tForm = useTranslations("page.orderPurchase.form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [draftCards, setDraftCards] = useState<ReceiveDraftCard[]>([]);
  const [vatRate, setVatRate] = useState(DEFAULT_VAT_RATE);
  const [vatType, setVatType] = useState<PurchaseVatType>(DEFAULT_VAT_TYPE);

  useEffect(() => {
    const ac = new AbortController();
    void fetchSettingVat(locale)
      .then((vat) => {
        if (ac.signal.aborted) return;
        if (vat?.rate != null && Number.isFinite(vat.rate)) {
          setVatRate(vat.rate);
        }
        if (vat?.vat_type === "include" || vat?.vat_type === "exclude") {
          setVatType(vat.vat_type);
        }
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => ac.abort();
  }, [locale]);

  const cartQtyByItemId = useMemo(() => {
    const m: Record<number, number> = {};
    for (const card of draftCards) {
      for (const line of card.lines) {
        if (line.type !== "catalog" || !line.productItemId) continue;
        m[line.productItemId] =
          (m[line.productItemId] ?? 0) + line.qtyOrder;
      }
    }
    return m;
  }, [draftCards]);

  const onAssignLines = useCallback(
    (supplier: ReceiveSupplierOption, lines: ReceiveDraftLine[]) => {
      if (lines.length === 0) return;
      setDraftCards((prev) => {
        const idx = prev.findIndex(
          (c) => c.supplierId === String(supplier.id)
        );
        if (idx >= 0) {
          const card = prev[idx]!;
          const nextLines = [...card.lines];
          for (const line of lines) {
            if (
              line.type === "catalog" &&
              line.productItemId != null &&
              nextLines.some(
                (l) =>
                  l.type === "catalog" &&
                  l.productItemId === line.productItemId
              )
            ) {
              continue;
            }
            nextLines.push(line);
          }
          if (nextLines.length === card.lines.length) return prev;
          const next = [...prev];
          next[idx] = { ...card, lines: nextLines };
          return next;
        }
        return [
          ...prev,
          {
            key: `card-${supplier.id}-${Date.now()}`,
            supplierId: String(supplier.id),
            supplierLabel: supplier.label,
            discount: 0,
            note: "",
            lines,
          },
        ];
      });
    },
    []
  );

  const onSaveSuccess = useCallback(
    (_savedTicketItemIds: number[]) => {
      // Summary panel already removed the submitted card via setCards.
      requestAnimationFrame(() => {
        setDraftCards((prev) => {
          if (prev.length === 0) {
            router.push("/admin/order/purchase");
          }
          return prev;
        });
      });
    },
    [router]
  );

  const backBtn = (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push("/admin/order/purchase")}
    >
      {tCrud("btn.back")}
    </Button>
  );

  if (!perms.view || !perms.create) {
    return (
      <div className="flex w-full flex-col gap-4">
        <CrudPageHeader title={tForm("titleCreate")} actions={backBtn} />
        <p className="text-sm text-muted-foreground">{tError("forbidden")}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6">
      <CrudPageHeader title={tForm("titleCreate")} actions={backBtn} />
      <PurchaseTicketReceiveDesktopSplit
        left={
          <PurchaseCreateLeftPanel
            cartQtyByItemId={cartQtyByItemId}
            onAssignLines={onAssignLines}
          />
        }
        right={
          <PurchaseTicketReceiveSummaryPanel
            cards={draftCards}
            setCards={setDraftCards}
            ticketId={null}
            vatRate={vatRate}
            vatType={vatType}
            emptyStateMessage={tForm("linesEmpty")}
            onSaveSuccess={onSaveSuccess}
          />
        }
      />
    </div>
  );
}
