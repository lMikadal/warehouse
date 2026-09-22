"use client";

import { Paperclip } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { Button } from "@/components/ui/button";
import type { PurchaseItemFile } from "@/lib/order-purchase-api";
import {
  OrderReceiveApiError,
  saveReceiveFiles,
} from "@/lib/order-receive-api";
import {
  fetchSystemFile,
  type ImageUploadItem,
  uploadSystemFile,
} from "@/lib/system-file-api";

/** Goods-in paperwork (delivery note, invoice photo) attached to the whole order. */
export function ReceiveFilesPanel({
  purchaseId,
  files,
  readOnly = false,
  onSaved,
}: {
  purchaseId: number;
  files: PurchaseItemFile[];
  readOnly?: boolean;
  onSaved?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("page.orderReceive.files");
  const tCrud = useTranslations("crud");
  const [items, setItems] = useState<ImageUploadItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      files.map((f) =>
        fetchSystemFile(locale, f.system_file_id).catch(() => null)
      )
    ).then((resolved) => {
      if (cancelled) return;
      setItems(resolved.filter((x) => x != null));
    });
    return () => {
      cancelled = true;
    };
  }, [files, locale]);

  const save = async () => {
    setSaving(true);
    try {
      const ids: number[] = [];
      for (const item of items) {
        if (item.kind === "remote") {
          ids.push(item.id);
          continue;
        }
        const remote = await uploadSystemFile(
          locale,
          "purchase_order_attachment",
          item.file
        );
        ids.push(remote.id);
      }
      await saveReceiveFiles(locale, purchaseId, ids);
      toast.success(t("uploadSuccess"));
      onSaved?.();
    } catch (e) {
      toast.error(
        e instanceof OrderReceiveApiError ? e.message : t("uploadFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold">{t("sectionTitle")}</h2>
      </div>
      {readOnly && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <ImageUploadField
            id={`receive-files-${purchaseId}`}
            labelKey="page.orderReceive.files.uploadButton"
            purpose="purchase_order_attachment"
            value={items}
            onChange={setItems}
            maxFiles={10}
            disabled={readOnly}
            showLabel={false}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("uploadHint")}</p>
          {readOnly ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={save}
              disabled={saving}
            >
              {tCrud("btn.save")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
