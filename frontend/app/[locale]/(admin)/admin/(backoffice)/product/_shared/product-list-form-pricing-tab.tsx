"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { ListItemBody, ProductListAggregate } from "@/lib/product-list-api";
import {
  fetchProductListFilters,
  filterItemsToComboboxOptions,
} from "@/lib/product-filters-api";
import { fetchSettingVat, type SettingVatItem } from "@/lib/setting-api";

import { ProductListFormVariantCard } from "./product-list-form-variant-card";
import {
  cloneListItemBody,
  emptyItem,
  hasItemSalesFieldErrors,
  hasPendingAlternateClone,
  type ItemSalesFieldErrors,
  validateItemSalesFields,
  variantItemKey,
} from "./product-list-form-utils";

type Props = {
  locale: string;
  draft: ProductListAggregate;
  setDraft: React.Dispatch<React.SetStateAction<ProductListAggregate>>;
  saleChannels: { id: number; name: string }[];
  itemFieldErrors: Record<string, ItemSalesFieldErrors>;
  setItemFieldErrors: React.Dispatch<
    React.SetStateAction<Record<string, ItemSalesFieldErrors>>
  >;
  expandVariantKey: string | null;
  onExpandVariantHandled: () => void;
  canCloneItem: boolean;
};

export function ProductListFormPricingTab({
  locale,
  draft,
  setDraft,
  saleChannels,
  itemFieldErrors,
  setItemFieldErrors,
  expandVariantKey,
  onExpandVariantHandled,
  canCloneItem,
}: Props) {
  const tForm = useTranslations("productListForm");
  const tError = useTranslations("error");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null
  );
  const [vat, setVat] = useState<SettingVatItem | null>(null);

  useEffect(() => {
    void fetchSettingVat(locale).then(setVat).catch(() => setVat(null));
  }, [locale]);

  useEffect(() => {
    if (!expandVariantKey) return;
    setExpanded((e) => ({ ...e, [expandVariantKey]: true }));
    onExpandVariantHandled();
  }, [expandVariantKey, onExpandVariantHandled]);

  const loadSuppliers = useCallback(
    async (ctx: RemoteComboboxLoadContext) => {
      const res = await fetchProductListFilters(locale, "suppliers", {
        page: 1,
        limit: 50,
        search: ctx.search.trim() || undefined,
        signal: ctx.signal,
      });
      if (ctx.signal.aborted) return [];
      return filterItemsToComboboxOptions(res.items);
    },
    [locale]
  );

  const updateItem = (index: number, next: ListItemBody) => {
    setDraft((d) => {
      const items = [...d.items];
      items[index] = next;
      return { ...d, items };
    });
  };

  const addVariant = () => {
    const item = emptyItem(true);
    const key = variantItemKey(item, draft.items.length);
    setExpanded((e) => ({ ...e, [key]: true }));
    setDraft((d) => ({ ...d, items: [...d.items, item] }));
  };

  const confirmRemoveVariant = () => {
    const index = deleteConfirmIndex;
    if (index == null) return;
    const key = variantItemKey(draft.items[index], index);
    setDraft((d) => ({
      ...d,
      items: d.items.filter((_, i) => i !== index),
    }));
    setItemFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setExpanded((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
    setDeleteConfirmIndex(null);
    toast.success(tForm("toastVariantRemovedDraft"));
  };

  const cloneAlternateSku = (index: number, newSuffix: string) => {
    const source = draft.items[index];
    if (!source?.id) {
      toast.error(tForm("errorCloneNeedsSaved"));
      throw new Error("clone-needs-saved");
    }
    if (hasPendingAlternateClone(draft.items)) {
      toast.error(tForm("errorClonePending"));
      throw new Error("clone-pending");
    }
    const trimmed = newSuffix.trim();
    const clone = cloneListItemBody(source, draft.sku, trimmed);
    const salesErrors = validateItemSalesFields(
      clone,
      draft.sku,
      tError("required")
    );
    if (hasItemSalesFieldErrors(salesErrors)) {
      toast.error(salesErrors.sku ?? salesErrors.weight ?? tError("required"));
      throw new Error("clone-validation");
    }
    const nextItems = [...draft.items, clone];
    setDraft((d) => ({ ...d, items: nextItems }));
    const expandKey = variantItemKey(clone, nextItems.length - 1);
    setExpanded((e) => ({ ...e, [expandKey]: true }));
    toast.success(tForm("toastItemCloned"));
  };

  const clearItemFieldError = (
    index: number,
    field: keyof ItemSalesFieldErrors
  ) => {
    const key = variantItemKey(draft.items[index], index);
    setItemFieldErrors((prev) => {
      const cur = prev[key];
      if (!cur?.[field]) return prev;
      const nextItem = { ...cur };
      delete nextItem[field];
      if (!hasItemSalesFieldErrors(nextItem)) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: nextItem };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {draft.items.map((item, index) => {
        const key = variantItemKey(item, index);
        return (
          <ProductListFormVariantCard
            key={key}
            item={item}
            listSku={draft.sku}
            vat={vat}
            saleChannels={saleChannels}
            expanded={expanded[key] ?? item._open === true}
            onExpandedChange={(open) =>
              setExpanded((e) => ({ ...e, [key]: open }))
            }
            onChange={(next) => updateItem(index, next)}
            onRemove={() => setDeleteConfirmIndex(index)}
            canRemove={draft.items.length > 1}
            loadSuppliers={loadSuppliers}
            fieldErrors={itemFieldErrors[key]}
            onClearFieldError={(f) => clearItemFieldError(index, f)}
            allItems={draft.items}
            canCloneItem={canCloneItem}
            onCloneAlternateSku={(suffix) => cloneAlternateSku(index, suffix)}
          />
        );
      })}
      <div className="rounded-md border border-dashed border-border py-6">
        <Button
          type="button"
          variant="outline"
          className="mx-auto flex border-primary text-primary"
          onClick={addVariant}
        >
          <Plus className="mr-1 size-4" />
          {tForm("addPrice")}
        </Button>
      </div>
      <CrudDeleteConfirmDialog
        open={deleteConfirmIndex != null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmIndex(null);
        }}
        onConfirm={confirmRemoveVariant}
        description={tForm("deleteVariantConfirm")}
      />
    </div>
  );
}
