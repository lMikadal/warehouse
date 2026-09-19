"use client";

import {
  Barcode,
  Box,
  Car,
  Clock,
  Layers,
  Package,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  type DisplayLocale,
} from "@/lib/format-datetime";
import {
  resolveProductListFormCategoryLabel,
} from "@/lib/product-category-combobox";
import { resolveProductBrandLabels } from "@/lib/product-brand-combobox";
import type { ProductListAggregate } from "@/lib/product-list-api";
import { cn } from "@/lib/utils";

type Props = {
  draft: ProductListAggregate;
  canEditNote: boolean;
  onActiveChange: (checked: boolean) => void;
  onNoteChange: (note: string) => void;
};

function SummaryRow({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border py-3 last:border-b-0",
        className
      )}
    >
      <Icon
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function ProductListFormSidebar({
  draft,
  canEditNote,
  onActiveChange,
  onNoteChange,
}: Props) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");

  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [brandLabel, setBrandLabel] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const id = draft.product_category_id;
    if (id == null || id <= 0) return;
    let cancelled = false;
    void resolveProductListFormCategoryLabel(locale, String(id)).then((name) => {
      if (!cancelled) setCategoryLabel(name);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.product_category_id, locale]);

  useEffect(() => {
    const id = draft.product_brand_id;
    if (id == null || id <= 0) return;
    let cancelled = false;
    void resolveProductBrandLabels(locale, [String(id)], "listForm").then(
      (opts) => {
        if (!cancelled) setBrandLabel(opts[0]?.label ?? null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [draft.product_brand_id, locale]);

  const categoryDisplay =
    draft.product_category_id != null && draft.product_category_id > 0
      ? categoryLabel
      : null;
  const brandDisplay =
    draft.product_brand_id != null && draft.product_brand_id > 0
      ? brandLabel
      : null;

  const displayName =
    locale === "en"
      ? draft.languages.en.name || draft.languages.th.name
      : draft.languages.th.name || draft.languages.en.name;

  const sku =
    draft.sku.trim() ||
    draft.items.find((it) => it.sku?.trim())?.sku?.trim() ||
    "";

  const carCount =
    draft.cars?.filter((c) => c.product_attribute_engine_id > 0).length ?? 0;

  const notePreview = draft.note?.trim() ? draft.note : "—";

  const openNoteModal = () => {
    setNoteDraft(draft.note ?? "");
    setNoteOpen(true);
  };

  const saveNote = () => {
    onNoteChange(noteDraft.trim());
    setNoteOpen(false);
    toast.success(tForm("toastNoteSaved"));
  };

  return (
    <>
      <FormCard>
        <FormCardContent>
          <StatusSwitchField
            labelKey="col.status"
            checked={draft.is_active}
            disabled={!canEditNote}
            onCheckedChange={onActiveChange}
          />
        </FormCardContent>
      </FormCard>

      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{tForm("summaryTitle")}</FormCardTitle>
        </FormCardHeader>
        <FormCardContent className="pt-0">
          <SummaryRow icon={Package} label={tForm("summaryName")}>
            {displayName || "—"}
          </SummaryRow>
          <SummaryRow icon={Barcode} label={tCol("sku")}>
            {sku || "—"}
          </SummaryRow>
          <SummaryRow icon={Layers} label={tCol("category")}>
            {categoryDisplay || "—"}
          </SummaryRow>
          <SummaryRow icon={Box} label={tCol("brand")}>
            {brandDisplay || "—"}
          </SummaryRow>
          <SummaryRow icon={Car} label={tForm("summaryCars")}>
            {tForm("summaryCarCount", { count: carCount })}
          </SummaryRow>
          <SummaryRow icon={Clock} label={tForm("summaryUpdated")}>
            {draft.updated_at
              ? formatDateTime(draft.updated_at, locale)
              : "—"}
          </SummaryRow>
        </FormCardContent>
      </FormCard>

      <FormCard>
        <FormCardHeader className="flex flex-row items-center justify-between gap-2">
          <FormCardTitle>{tForm("noteTitle")}</FormCardTitle>
          {canEditNote ? (
            <ButtonIcon
              type="button"
              variant="outline"
              tone="neutral"
              aria-label={tCrud("btn.edit")}
              onClick={openNoteModal}
            >
              <Pencil className="text-current" />
            </ButtonIcon>
          ) : null}
        </FormCardHeader>
        <FormCardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {notePreview}
          </p>
        </FormCardContent>
      </FormCard>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tForm("noteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Textarea
              rows={8}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={tForm("noteModalPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setNoteOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="button" size="lg" onClick={saveNote}>
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
