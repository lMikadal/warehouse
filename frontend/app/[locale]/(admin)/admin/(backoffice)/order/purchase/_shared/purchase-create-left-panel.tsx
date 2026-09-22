"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  resolveOrderSalesCarBrandLabel,
  resolveOrderSalesCarEngineLabel,
  resolveOrderSalesCarModelLabel,
} from "@/lib/order-sales-form-api";
import type { PurchaseStockHistoryRow } from "@/lib/order-purchase-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import type { ImageUploadItem } from "@/lib/system-file-api";

import { StoreSalesProductBrowsePanel } from "../../../sales/store/_shared/store-sales-product-browse-panel";
import {
  TicketCustomStagePanel,
  type CustomDraft,
  type StagedCustom,
} from "../../../sales/ticket/_shared/ticket-custom-stage-panel";
import {
  PurchaseConsiderTopicsDialog,
  type PurchaseConsiderTopic,
} from "./purchase-consider-topics-dialog";
import {
  PurchaseStockHistoryDialog,
  type PurchaseStockHistoryTarget,
} from "./purchase-stock-history-dialog";
import { PurchaseSupplierSelectDialog } from "./purchase-supplier-select-dialog";
import {
  coercePurchaseUnit,
  type ReceiveDraftLine,
  type ReceiveDraftLinePricing,
  type ReceiveSupplierOption,
} from "./purchase-ticket-receive-types";

const EMPTY_CUSTOM_DRAFT: CustomDraft = {
  name: "",
  brandId: "",
  modelId: "",
  engineId: "",
  identificationNumber: "",
  note: "",
};

function remoteImageIds(images: ImageUploadItem[]): number[] {
  return images
    .filter((img): img is Extract<ImageUploadItem, { kind: "remote" }> =>
      img.kind === "remote"
    )
    .map((img) => img.id);
}

function catalogRowToDraftLine(
  row: ProductItemBrowseRow,
  pricing?: ReceiveDraftLinePricing
): ReceiveDraftLine {
  return {
    key: `catalog-${row.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productItemId: row.id,
    name: row.name?.trim() || "—",
    sku: row.sku?.trim() || "",
    type: "catalog",
    unit: coercePurchaseUnit(row.unit ?? "piece"),
    qtySell: 0,
    qtyOrder: 1,
    brandId: null,
    modelId: null,
    engineId: null,
    identificationNumber: "",
    note: "",
    pricing: {
      pricePerUnit: pricing?.pricePerUnit ?? row.price ?? 0,
      discount: pricing?.discount ?? 0,
    },
  };
}

function stagedToDraftLine(row: StagedCustom): ReceiveDraftLine {
  return {
    key: `custom-${row.key}`,
    productItemId: null,
    name: row.name,
    sku: "",
    type: "custom",
    unit: "piece",
    qtySell: 0,
    qtyOrder: 1,
    brandId: row.brandId ? Number(row.brandId) : null,
    modelId: row.modelId ? Number(row.modelId) : null,
    engineId: row.engineId ? Number(row.engineId) : null,
    identificationNumber: row.identificationNumber || "",
    note: row.note || "",
    systemFileIds: row.systemFileIds,
    pricing: { pricePerUnit: 0, discount: 0 },
  };
}

export type PurchaseCreateLeftPanelProps = {
  cartQtyByItemId: Record<number, number>;
  onAssignLines: (
    supplier: ReceiveSupplierOption,
    lines: ReceiveDraftLine[]
  ) => void;
};

export function PurchaseCreateLeftPanel({
  cartQtyByItemId,
  onAssignLines,
}: PurchaseCreateLeftPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("page.orderPurchase.form");
  const tTicketForm = useTranslations("page.orderTicket.form");
  const tError = useTranslations("error");

  const [tab, setTab] = useState<"catalog" | "custom">("catalog");

  const [pendingCatalog, setPendingCatalog] = useState<ProductItemBrowseRow[]>(
    []
  );
  const catalogBatchRef = useRef<ProductItemBrowseRow[]>([]);
  const catalogFlushScheduled = useRef(false);
  const dialogFollowUpRef = useRef(false);

  const [considerOpen, setConsiderOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [stockTarget, setStockTarget] =
    useState<PurchaseStockHistoryTarget | null>(null);

  const [customDraft, setCustomDraft] =
    useState<CustomDraft>(EMPTY_CUSTOM_DRAFT);
  const [customImages, setCustomImages] = useState<ImageUploadItem[]>([]);
  const [stagedCustoms, setStagedCustoms] = useState<StagedCustom[]>([]);
  const [selectedStageKeys, setSelectedStageKeys] = useState<string[]>([]);
  const [activeStageKey, setActiveStageKey] = useState<string | null>(null);
  const [editingStageKey, setEditingStageKey] = useState<string | null>(null);
  const [pendingCustomKeys, setPendingCustomKeys] = useState<string[]>([]);

  const flushCatalogBatch = useCallback(() => {
    catalogFlushScheduled.current = false;
    const batch = catalogBatchRef.current;
    catalogBatchRef.current = [];
    if (batch.length === 0) return;
    setPendingCatalog(batch);
    setPendingCustomKeys([]);
    setConsiderOpen(true);
  }, []);

  const onBrowseAdd = useCallback(
    (row: ProductItemBrowseRow) => {
      catalogBatchRef.current.push(row);
      if (!catalogFlushScheduled.current) {
        catalogFlushScheduled.current = true;
        queueMicrotask(flushCatalogBatch);
      }
    },
    [flushCatalogBatch]
  );

  const resolveDraftLabels = async (draft: CustomDraft) => {
    const [brandLabel, modelLabel, engineLabel] = await Promise.all([
      draft.brandId
        ? resolveOrderSalesCarBrandLabel(
            locale,
            "purchases",
            Number(draft.brandId)
          )
        : Promise.resolve(""),
      draft.modelId
        ? resolveOrderSalesCarModelLabel(
            locale,
            "purchases",
            Number(draft.modelId)
          )
        : Promise.resolve(""),
      draft.engineId
        ? resolveOrderSalesCarEngineLabel(
            locale,
            "purchases",
            Number(draft.engineId)
          )
        : Promise.resolve(""),
    ]);
    return { brandLabel, modelLabel, engineLabel };
  };

  const onStageAdd = async () => {
    if (!customDraft.name.trim()) {
      toast.error(tError("required"));
      return;
    }
    const labels = await resolveDraftLabels(customDraft);
    const fileIds = remoteImageIds(customImages);
    if (editingStageKey) {
      setStagedCustoms((prev) =>
        prev.map((row) =>
          row.key === editingStageKey
            ? {
                ...row,
                name: customDraft.name.trim(),
                brandId: customDraft.brandId,
                brandLabel: labels.brandLabel,
                modelId: customDraft.modelId,
                modelLabel: labels.modelLabel,
                engineId: customDraft.engineId,
                engineLabel: labels.engineLabel,
                identificationNumber: customDraft.identificationNumber.trim(),
                note: customDraft.note.trim(),
                systemFileIds: fileIds,
                images: customImages,
              }
            : row
        )
      );
      setActiveStageKey(editingStageKey);
      setEditingStageKey(null);
    } else {
      const key = `stage-${Date.now()}-${stagedCustoms.length}`;
      setStagedCustoms((prev) => [
        ...prev,
        {
          key,
          name: customDraft.name.trim(),
          brandId: customDraft.brandId,
          brandLabel: labels.brandLabel,
          modelId: customDraft.modelId,
          modelLabel: labels.modelLabel,
          engineId: customDraft.engineId,
          engineLabel: labels.engineLabel,
          identificationNumber: customDraft.identificationNumber.trim(),
          note: customDraft.note.trim(),
          systemFileIds: fileIds,
          images: customImages,
        },
      ]);
      setActiveStageKey(key);
      setSelectedStageKeys((prev) =>
        prev.includes(key) ? prev : [...prev, key]
      );
    }
    setCustomDraft(EMPTY_CUSTOM_DRAFT);
    setCustomImages([]);
  };

  const openCustomSupplier = (keys: string[]) => {
    if (keys.length === 0) {
      toast.error(tTicketForm("validationSelectStage"));
      return;
    }
    setPendingCatalog([]);
    setPendingCustomKeys(keys);
    setSupplierOpen(true);
  };

  const handleCatalogTopic = (topic: PurchaseConsiderTopic) => {
    if (pendingCatalog.length === 0) return;
    dialogFollowUpRef.current = true;
    if (topic === "compare_prices") {
      const first = pendingCatalog[0]!;
      setStockTarget({
        productItemId: first.id,
        productName: first.name?.trim() || "—",
      });
      return;
    }
    if (topic === "select_partner") {
      setSupplierOpen(true);
    }
  };

  const assignCatalogToSupplier = (
    supplier: ReceiveSupplierOption,
    pricingByProductId?: Map<number, ReceiveDraftLinePricing>
  ) => {
    if (pendingCatalog.length === 0) return;
    const lines = pendingCatalog.map((row) =>
      catalogRowToDraftLine(row, pricingByProductId?.get(row.id))
    );
    onAssignLines(supplier, lines);
    setPendingCatalog([]);
  };

  const assignCustomToSupplier = (supplier: ReceiveSupplierOption) => {
    const rows = stagedCustoms.filter((r) =>
      pendingCustomKeys.includes(r.key)
    );
    if (rows.length === 0) return;
    onAssignLines(
      supplier,
      rows.map((row) => stagedToDraftLine(row))
    );
    setStagedCustoms((prev) =>
      prev.filter((r) => !pendingCustomKeys.includes(r.key))
    );
    setSelectedStageKeys((prev) =>
      prev.filter((k) => !pendingCustomKeys.includes(k))
    );
    setPendingCustomKeys([]);
    setActiveStageKey(null);
  };

  const onSupplierConfirm = (supplier: ReceiveSupplierOption) => {
    if (pendingCustomKeys.length > 0) {
      assignCustomToSupplier(supplier);
      return;
    }
    assignCatalogToSupplier(supplier);
  };

  const onStockHistorySelect = (row: PurchaseStockHistoryRow) => {
    if (!row.supplier_user_id) return;
    const supplier: ReceiveSupplierOption = {
      id: row.supplier_user_id,
      label: row.supplier_name?.trim() || String(row.supplier_user_id),
    };
    const pricing = new Map<number, ReceiveDraftLinePricing>();
    pricing.set(row.product_item_id, {
      pricePerUnit: row.cost_per_unit,
      discount: row.discount_per_unit ?? 0,
    });
    assignCatalogToSupplier(supplier, pricing);
    setStockTarget(null);
  };

  return (
    <Card className="flex min-h-0 flex-1 flex-col shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{tForm("sectionProduct")}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "catalog" | "custom")}
        >
          <TabsList>
            <TabsTrigger value="catalog">{tForm("tabExisting")}</TabsTrigger>
            <TabsTrigger value="custom">{tForm("tabNew")}</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-3">
            <StoreSalesProductBrowsePanel
              resource="purchases"
              onAdd={onBrowseAdd}
              cartQtyByItemId={cartQtyByItemId}
              allowOutOfStock
              autoLoad
            />
          </TabsContent>
          <TabsContent value="custom" className="mt-3 space-y-3">
            <TicketCustomStagePanel
              resource="purchases"
              imagePurpose="purchase_order_item_image"
              displayLocale={locale}
              readOnly={false}
              draft={customDraft}
              images={customImages}
              staged={stagedCustoms}
              selectedKeys={selectedStageKeys}
              activeKey={activeStageKey}
              editingKey={editingStageKey}
              onDraftChange={(patch) =>
                setCustomDraft((prev) => ({ ...prev, ...patch }))
              }
              onImagesChange={setCustomImages}
              onToggleSelect={(key) =>
                setSelectedStageKeys((prev) =>
                  prev.includes(key)
                    ? prev.filter((k) => k !== key)
                    : [...prev, key]
                )
              }
              onSelectAll={(checked) =>
                setSelectedStageKeys(
                  checked ? stagedCustoms.map((r) => r.key) : []
                )
              }
              onStageAdd={() => void onStageAdd()}
              onStageEdit={(key) => {
                const row = stagedCustoms.find((r) => r.key === key);
                if (!row) return;
                setEditingStageKey(key);
                setActiveStageKey(key);
                setCustomDraft({
                  name: row.name,
                  brandId: row.brandId,
                  modelId: row.modelId,
                  engineId: row.engineId,
                  identificationNumber: row.identificationNumber,
                  note: row.note,
                });
                setCustomImages(row.images);
              }}
              onStageRemove={(key) => {
                setStagedCustoms((prev) => prev.filter((r) => r.key !== key));
                setSelectedStageKeys((prev) => prev.filter((k) => k !== key));
                if (activeStageKey === key) setActiveStageKey(null);
                if (editingStageKey === key) {
                  setEditingStageKey(null);
                  setCustomDraft(EMPTY_CUSTOM_DRAFT);
                  setCustomImages([]);
                }
              }}
              onClearAll={() => {
                setStagedCustoms([]);
                setSelectedStageKeys([]);
                setActiveStageKey(null);
                setEditingStageKey(null);
                setCustomDraft(EMPTY_CUSTOM_DRAFT);
                setCustomImages([]);
              }}
              onRowActivate={(key) => setActiveStageKey(key)}
            />
            <Button
              type="button"
              disabled={selectedStageKeys.length === 0}
              onClick={() => openCustomSupplier(selectedStageKeys)}
            >
              {tForm("addSelected")}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      <PurchaseConsiderTopicsDialog
        open={considerOpen}
        onOpenChange={(open) => {
          setConsiderOpen(open);
          if (!open) {
            if (!dialogFollowUpRef.current) setPendingCatalog([]);
            dialogFollowUpRef.current = false;
          }
        }}
        onTopicSelect={handleCatalogTopic}
        visibleTopics={["compare_prices", "select_partner"]}
      />
      <PurchaseSupplierSelectDialog
        open={supplierOpen}
        onOpenChange={(open) => {
          setSupplierOpen(open);
          if (!open) {
            setPendingCustomKeys([]);
            if (!stockTarget) setPendingCatalog([]);
          }
        }}
        onConfirm={onSupplierConfirm}
      />
      <PurchaseStockHistoryDialog
        target={stockTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStockTarget(null);
            if (!supplierOpen) setPendingCatalog([]);
          }
        }}
        onSelectRow={onStockHistorySelect}
      />
    </Card>
  );
}
