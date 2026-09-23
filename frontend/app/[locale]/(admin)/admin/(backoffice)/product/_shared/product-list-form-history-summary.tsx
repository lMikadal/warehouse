"use client";

import {
  Gift,
  Package,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  PurchaseHistorySummary,
  SalesHistorySummary,
} from "@/lib/product-list-api";

function formatMoney(n: number) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(n: number) {
  return n.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function StatCard({
  tone,
  icon,
  label,
  amount,
  unit,
}: {
  tone: "blue" | "green" | "orange";
  icon: React.ReactNode;
  label: string;
  amount: React.ReactNode;
  unit?: string;
}) {
  const iconWellClass =
    tone === "blue"
      ? "bg-primary/15 text-primary"
      : tone === "orange"
        ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  return (
    <div className="border-border bg-background flex items-center gap-2.5 rounded-[var(--radius)] border p-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconWellClass}`}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-muted-foreground text-xs leading-snug">{label}</div>
        <div className="text-lg leading-tight font-semibold tabular-nums">
          {amount}
          {unit ? (
            <>
              {" "}
              <span className="text-muted-foreground text-sm font-normal">
                {unit}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductListFormHistoryPurchaseSummary({
  summary,
}: {
  summary: PurchaseHistorySummary | null;
}) {
  const tForm = useTranslations("productListForm");
  const pcs = tForm("histPiecesSuffix");
  const s = summary ?? {
    total_received_pieces: 0,
    total_value_baht: 0,
    min_net_cost_per_piece: 0,
    max_net_cost_per_piece: 0,
    total_free_pieces: 0,
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        tone="blue"
        icon={<Package className="size-5" />}
        label={tForm("histSummaryReceived")}
        amount={formatQty(s.total_received_pieces)}
        unit={pcs}
      />
      <StatCard
        tone="green"
        icon={<Wallet className="size-5" />}
        label={tForm("histSummaryValue")}
        amount={formatMoney(s.total_value_baht)}
        unit="THB"
      />
      <StatCard
        tone="orange"
        icon={<TrendingDown className="size-5" />}
        label={tForm("histSummaryMinCost")}
        amount={formatMoney(s.min_net_cost_per_piece)}
        unit="THB"
      />
      <StatCard
        tone="orange"
        icon={<TrendingUp className="size-5" />}
        label={tForm("histSummaryMaxCost")}
        amount={formatMoney(s.max_net_cost_per_piece)}
        unit="THB"
      />
      <StatCard
        tone="green"
        icon={<Gift className="size-5" />}
        label={tForm("histSummaryFreeTotal")}
        amount={formatQty(s.total_free_pieces)}
        unit={pcs}
      />
    </div>
  );
}

export function ProductListFormHistorySalesSummary({
  summary,
}: {
  summary: SalesHistorySummary | null;
}) {
  const tForm = useTranslations("productListForm");
  const pcs = tForm("histPiecesSuffix");
  const s = summary ?? {
    total_sold_pieces: 0,
    total_value_baht: 0,
    min_sell_per_piece: 0,
    max_sell_per_piece: 0,
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        tone="blue"
        icon={<Package className="size-5" />}
        label={tForm("histSalesSummarySold")}
        amount={formatQty(s.total_sold_pieces)}
        unit={pcs}
      />
      <StatCard
        tone="green"
        icon={<Wallet className="size-5" />}
        label={tForm("histSalesSummaryValue")}
        amount={formatMoney(s.total_value_baht)}
        unit="THB"
      />
      <StatCard
        tone="orange"
        icon={<TrendingDown className="size-5" />}
        label={tForm("histSalesSummaryMin")}
        amount={formatMoney(s.min_sell_per_piece)}
        unit="THB"
      />
      <StatCard
        tone="orange"
        icon={<TrendingUp className="size-5" />}
        label={tForm("histSalesSummaryMax")}
        amount={formatMoney(s.max_sell_per_piece)}
        unit="THB"
      />
    </div>
  );
}
