"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  loadOrderSalesCarBrandComboboxOptions,
  loadOrderSalesCarEngineComboboxOptions,
  loadOrderSalesCarModelComboboxOptions,
  resolveOrderSalesCarBrandLabel,
  resolveOrderSalesCarEngineLabel,
  resolveOrderSalesCarModelLabel,
  type OrderSalesFormResource,
} from "@/lib/order-sales-form-api";
import type {
  ImageUploadItem,
  SystemFilePurpose,
} from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

export type StagedCustom = {
  key: string;
  name: string;
  brandId: string;
  brandLabel: string;
  modelId: string;
  modelLabel: string;
  engineId: string;
  engineLabel: string;
  identificationNumber: string;
  note: string;
  systemFileIds: number[];
  images: ImageUploadItem[];
};

export type CustomDraft = {
  name: string;
  brandId: string;
  modelId: string;
  engineId: string;
  identificationNumber: string;
  note: string;
};

type Props = {
  resource: Extract<OrderSalesFormResource, "tickets" | "purchases">;
  /** Image upload purpose; tickets use request-item, PO create uses order-item. */
  imagePurpose?: Extract<
    SystemFilePurpose,
    "purchase_request_item_image" | "purchase_order_item_image"
  >;
  displayLocale: DisplayLocale;
  readOnly: boolean;
  draft: CustomDraft;
  images: ImageUploadItem[];
  staged: StagedCustom[];
  selectedKeys: string[];
  activeKey: string | null;
  editingKey: string | null;
  onDraftChange: (patch: Partial<CustomDraft>) => void;
  onImagesChange: (images: ImageUploadItem[]) => void;
  onToggleSelect: (key: string) => void;
  onSelectAll: (checked: boolean) => void;
  onStageAdd: () => void;
  onStageEdit: (key: string) => void;
  onStageRemove: (key: string) => void;
  onClearAll: () => void;
  onRowActivate: (key: string) => void;
};

function detailsLabel(row: StagedCustom): string {
  const parts = [row.modelLabel, row.engineLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function TicketCustomStagePanel({
  resource,
  imagePurpose = "purchase_request_item_image",
  displayLocale,
  readOnly,
  draft,
  images,
  staged,
  selectedKeys,
  activeKey,
  onDraftChange,
  onImagesChange,
  onToggleSelect,
  onSelectAll,
  onStageAdd,
  onStageEdit,
  onStageRemove,
  onClearAll,
  onRowActivate,
}: Props) {
  const tForm = useTranslations("page.orderTicket.form");
  const tFormRoot = useTranslations("form");
  const selectedSet = new Set(selectedKeys);
  const allSelected = staged.length > 0 && selectedKeys.length === staged.length;

  return (
    <div className="flex flex-col gap-3">
      <ImageUploadField
        id={`${resource}-new-images`}
        labelKey="page.orderTicket.form.newImages"
        purpose={imagePurpose}
        value={images}
        onChange={onImagesChange}
        maxFiles={3}
        uploadTiming="immediate"
        disabled={readOnly}
        showLabel={false}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          id="ticket-new-name"
          value={draft.name}
          disabled={readOnly}
          aria-label={tForm("newName")}
          placeholder={tFormRoot("placeholder.input", {
            label: tForm("newName"),
          })}
          onChange={(e) => onDraftChange({ name: e.target.value })}
        />
        <RemoteComboboxField
          label={tForm("newBrand")}
          value={draft.brandId}
          onValueChange={(v) =>
            onDraftChange({ brandId: v, modelId: "", engineId: "" })
          }
          placeholder={tFormRoot("placeholder.select", {
            label: tForm("newBrand"),
          })}
          emptyLabel={tFormRoot("combobox.noResults")}
          inputClassName="w-full"
          showClear
          disabled={readOnly}
          onLoadOptions={(ctx) =>
            loadOrderSalesCarBrandComboboxOptions(displayLocale, resource, {
              search: ctx.search,
              signal: ctx.signal,
            })
          }
          resolveSelectedLabel={async (value) => {
            const id = Number(value);
            if (!Number.isFinite(id)) return null;
            return resolveOrderSalesCarBrandLabel(displayLocale, resource, id);
          }}
        />
        <RemoteComboboxField
          label={tForm("newModel")}
          value={draft.modelId}
          onValueChange={(v) => onDraftChange({ modelId: v, engineId: "" })}
          placeholder={tFormRoot("placeholder.select", {
            label: tForm("newModel"),
          })}
          emptyLabel={tFormRoot("combobox.noResults")}
          inputClassName="w-full"
          showClear
          disabled={readOnly || !draft.brandId}
          onLoadOptions={(ctx) =>
            loadOrderSalesCarModelComboboxOptions(displayLocale, resource, {
              search: ctx.search,
              signal: ctx.signal,
              parentId: draft.brandId ? Number(draft.brandId) : undefined,
            })
          }
          resolveSelectedLabel={async (value) => {
            const id = Number(value);
            if (!Number.isFinite(id)) return null;
            return resolveOrderSalesCarModelLabel(displayLocale, resource, id);
          }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <RemoteComboboxField
          label={tForm("newEngine")}
          value={draft.engineId}
          onValueChange={(v) => onDraftChange({ engineId: v })}
          placeholder={tFormRoot("placeholder.select", {
            label: tForm("newEngine"),
          })}
          emptyLabel={tFormRoot("combobox.noResults")}
          inputClassName="w-full"
          showClear
          disabled={readOnly || !draft.modelId}
          onLoadOptions={(ctx) =>
            loadOrderSalesCarEngineComboboxOptions(displayLocale, resource, {
              search: ctx.search,
              signal: ctx.signal,
              parentId: draft.modelId ? Number(draft.modelId) : undefined,
            })
          }
          resolveSelectedLabel={async (value) => {
            const id = Number(value);
            if (!Number.isFinite(id)) return null;
            return resolveOrderSalesCarEngineLabel(displayLocale, resource, id);
          }}
        />
        <Input
          id="ticket-new-chassis"
          value={draft.identificationNumber}
          disabled={readOnly}
          aria-label={tForm("newChassis")}
          placeholder={tFormRoot("placeholder.input", {
            label: tForm("newChassis"),
          })}
          onChange={(e) =>
            onDraftChange({ identificationNumber: e.target.value })
          }
        />
        <Input
          id="ticket-new-note"
          value={draft.note}
          disabled={readOnly}
          aria-label={tForm("newNote")}
          placeholder={tFormRoot("placeholder.input", {
            label: tForm("newNote"),
          })}
          onChange={(e) => onDraftChange({ note: e.target.value })}
        />
        <Button
          type="button"
          className="w-full"
          disabled={readOnly}
          onClick={onStageAdd}
        >
          <Plus className="text-current" aria-hidden />
          {tForm("addStage")}
        </Button>
      </div>

      {staged.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {tForm("emptyStage")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      disabled={readOnly}
                      aria-label={tForm("selectItems")}
                      onCheckedChange={(v) => onSelectAll(v === true)}
                    />
                  </TableHead>
                  <TableHead>{tForm("colProduct")}</TableHead>
                  <TableHead>{tForm("colBrand")}</TableHead>
                  <TableHead>{tForm("colDetails")}</TableHead>
                  <TableHead>{tForm("newChassis")}</TableHead>
                  <TableHead>{tForm("newNote")}</TableHead>
                  <TableHead className="text-center">
                    {tForm("colManage")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staged.map((row) => {
                  const selected = selectedSet.has(row.key);
                  const active = activeKey === row.key;
                  return (
                    <TableRow
                      key={row.key}
                      className={cn(
                        "cursor-pointer",
                        (selected || active) &&
                          "bg-primary/5 border-l-primary border-l-4",
                      )}
                      onClick={() => {
                        if (readOnly) return;
                        onRowActivate(row.key);
                      }}
                    >
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="w-10"
                      >
                        <Checkbox
                          checked={selected}
                          disabled={readOnly}
                          aria-label={row.name}
                          onCheckedChange={() => onToggleSelect(row.key)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
                            aria-hidden
                          >
                            <Package className="size-4" />
                          </span>
                          <span className="font-medium">{row.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.brandLabel || "—"}</TableCell>
                      <TableCell>{detailsLabel(row)}</TableCell>
                      <TableCell>{row.identificationNumber || "—"}</TableCell>
                      <TableCell>{row.note || "—"}</TableCell>
                      <TableCell
                        className="text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TableIconActions
                          actions={["edit", "delete"]}
                          disabledActions={readOnly ? ["edit", "delete"] : []}
                          onAction={(action) => {
                            if (action === "edit") onStageEdit(row.key);
                            if (action === "delete") onStageRemove(row.key);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/5"
              disabled={readOnly}
              onClick={onClearAll}
            >
              <Trash2 className="text-current" aria-hidden />
              {tForm("clearAllStaged")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
