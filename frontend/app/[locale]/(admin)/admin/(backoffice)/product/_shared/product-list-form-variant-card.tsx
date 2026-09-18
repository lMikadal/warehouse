"use client";

import { ChevronDown, ImageIcon, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { fetchSystemFile } from "@/lib/system-file-api";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { ListItemBody } from "@/lib/product-list-api";
import type { SettingVatItem } from "@/lib/setting-api";
import { cn } from "@/lib/utils";

import { ProductListWarehouseModal } from "./product-list-modals";
import { ProductListFormVariantLotModal } from "./product-list-form-variant-lot-modals";
import { ProductListFormVariantSections } from "./product-list-form-variant-sections";
import {
  formatStockQty,
  itemDisplayName,
  type ItemSalesFieldErrors,
} from "./product-list-form-utils";

type SaleChannel = { id: number; name: string };

type Props = {
  item: ListItemBody;
  listSku: string;
  listSupplierIds: number[];
  vat: SettingVatItem | null;
  saleChannels: SaleChannel[];
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onChange: (next: ListItemBody) => void;
  onRemove: () => void;
  canRemove: boolean;
  loadSuppliers: (ctx: RemoteComboboxLoadContext) => Promise<
    { value: string; label: string }[]
  >;
  fieldErrors?: ItemSalesFieldErrors;
  onClearFieldError?: (key: keyof ItemSalesFieldErrors) => void;
  allItems: ListItemBody[];
  canCloneItem: boolean;
  onCloneAlternateSku: (newSuffix: string) => void | Promise<void>;
  canMutateLots: boolean;
  onStockChanged?: () => void;
};

export function ProductListFormVariantCard({
  item,
  listSku,
  listSupplierIds,
  vat,
  saleChannels,
  expanded,
  onExpandedChange,
  onChange,
  onRemove,
  canRemove,
  loadSuppliers,
  fieldErrors,
  onClearFieldError,
  allItems,
  canCloneItem,
  onCloneAlternateSku,
  canMutateLots,
  onStockChanged,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const tList = useTranslations("productList");
  const tCol = useTranslations("col");
  const tForm = useTranslations("productListForm");
  const tCrud = useTranslations("crud");

  const [whOpen, setWhOpen] = useState(false);
  const [lotOpen, setLotOpen] = useState(false);
  const [lotSession, setLotSession] = useState(0);

  const stock = item.total_stock ?? 0;
  const low =
    item.low_stock ?? stock < (Number(item.minimum_stock) || 0);
  const whCount = item.warehouse_root_count ?? 0;
  const displaySku = item.sku?.trim() || "—";
  const displayName = itemDisplayName(item, locale);
  const coverFileId = useMemo(() => {
    const files = item.files ?? [];
    if (!files.length) return null;
    const sorted = [...files].sort(
      (a, b) => a.sort_order - b.sort_order || a.system_file_id - b.system_file_id
    );
    return sorted[0]?.system_file_id ?? null;
  }, [item.files]);

  return (
    <>
      <Collapsible
        open={expanded}
        onOpenChange={onExpandedChange}
        className="rounded-md border border-border bg-background"
      >
        <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <VariantCoverThumb fileId={coverFileId} locale={locale} />
          </div>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-left sm:gap-4"
              />
            }
          >
            <StatCol label={tCol("sku")} value={displaySku} sku />
            <StatCol label={tForm("variantName")} value={displayName} />
            <StatCol
              label={tList("colStock")}
              value={formatStockQty(stock, locale)}
              low={low}
            />
          </CollapsibleTrigger>
          <div className="flex min-w-20 flex-1 flex-col items-center gap-1 text-center">
            <span className="text-muted-foreground text-xs">
              {tList("colWarehouse")}
            </span>
            <span className="text-sm font-semibold">
              {tList("warehouseCountLabel", { count: whCount })}
            </span>
            {whCount > 0 && item.id ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWhOpen(true)}
              >
                {tList("viewMore")}
              </Button>
            ) : null}
          </div>
          <div
            className="ml-auto flex shrink-0 items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <StatusSwitchField
              checked={item.is_active}
              onCheckedChange={(checked) => onChange({ ...item, is_active: checked })}
            />
            {canRemove ? (
              <ButtonIcon
                type="button"
                variant="outline"
                tone="delete"
                aria-label={tCrud("btn.delete")}
                onClick={() => onRemove()}
              >
                <Trash2 className="text-current" />
              </ButtonIcon>
            ) : null}
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground inline-flex p-1"
                  aria-label={tList("viewMoreDetails")}
                />
              }
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="px-3 pb-4 sm:px-4">
          <ProductListFormVariantSections
            item={item}
            listSku={listSku}
            vat={vat}
            saleChannels={saleChannels}
            onChange={onChange}
            loadSuppliers={loadSuppliers}
            onViewLots={() => {
              setLotSession((n) => n + 1);
              setLotOpen(true);
            }}
            fieldErrors={fieldErrors}
            onClearFieldError={onClearFieldError}
            allItems={allItems}
            canCloneItem={canCloneItem}
            onCloneAlternateSku={onCloneAlternateSku}
          />
        </CollapsibleContent>
      </Collapsible>

      <ProductListWarehouseModal
        itemId={item.id ?? null}
        open={whOpen}
        onOpenChange={setWhOpen}
      />
      <ProductListFormVariantLotModal
        key={lotSession}
        item={item}
        listSku={listSku}
        listSupplierIds={listSupplierIds}
        open={lotOpen}
        onOpenChange={setLotOpen}
        canMutate={canMutateLots}
        loadSuppliers={loadSuppliers}
        onStockChanged={onStockChanged}
      />
    </>
  );
}

function VariantCoverThumb({
  fileId,
  locale,
}: {
  fileId: number | null;
  locale: string;
}) {
  if (fileId == null) {
    return (
      <div
        className="flex size-11 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
        aria-hidden
      >
        <ImageIcon className="text-muted-foreground size-5" />
      </div>
    );
  }

  return <VariantCoverThumbLoaded fileId={fileId} locale={locale} />;
}

function VariantCoverThumbLoaded({
  fileId,
  locale,
}: {
  fileId: number;
  locale: string;
}) {
  const t = useTranslations();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSystemFile(locale, fileId)
      .then((item) => {
        if (!cancelled) setUrl(item.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, locale]);

  if (loading) {
    return (
      <div className="flex size-11 items-center justify-center rounded-md border border-border">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (failed || !url) {
    return (
      <div
        className="flex size-11 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
        aria-hidden
      >
        <ImageIcon className="text-muted-foreground size-5" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="block size-11 overflow-hidden rounded-md border border-border"
        onClick={() => setPreviewOpen(true)}
        aria-label={t("form.upload.view")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="size-full object-cover" />
      </button>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg p-2">
          <DialogTitle className="sr-only">{t("form.upload.view")}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCol({
  label,
  value,
  sku,
  low,
}: {
  label: string;
  value: string;
  sku?: boolean;
  low?: boolean;
}) {
  return (
    <div className="flex min-w-20 flex-1 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "truncate text-sm font-semibold",
          sku && "max-w-40",
          low && "text-destructive"
        )}
      >
        {value}
      </span>
    </div>
  );
}
