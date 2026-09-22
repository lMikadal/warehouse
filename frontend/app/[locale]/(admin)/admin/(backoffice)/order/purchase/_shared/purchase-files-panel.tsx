"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchaseItemFile } from "@/lib/order-purchase-api";
import { fetchSystemFile } from "@/lib/system-file-api";

/** Read-only attachment strip for a PO: the rows only carry file ids, so resolve each to a URL. */
export function PurchaseFilesPanel({ files }: { files: PurchaseItemFile[] }) {
  const locale = useLocale();
  const tDetail = useTranslations("page.orderPurchase.detail");
  const [urls, setUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (files.length === 0) return;
    let live = true;
    void Promise.all(
      files.map(async (file) => {
        try {
          const item = await fetchSystemFile(locale, file.system_file_id);
          return [file.system_file_id, item.url] as const;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      if (!live) return;
      setUrls(Object.fromEntries(pairs.filter((p) => p != null)));
    });
    return () => {
      live = false;
    };
  }, [files, locale]);

  if (files.length === 0) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{tDetail("filesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {files.map((file) => {
          const url = urls[file.system_file_id];
          return (
            <a
              key={file.id}
              href={url ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={url == null}
              className="relative size-24 overflow-hidden rounded-md border bg-muted"
            >
              {url ? (
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
