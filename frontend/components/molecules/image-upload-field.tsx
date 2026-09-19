"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { Upload, GripVertical, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { toast } from "sonner";

import { ButtonIcon } from "@/components/ui/button-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { reorderIdsFromSortableEvent } from "@/lib/crud-list-rows";
import {
  imageUploadItemKey,
  imageUploadItemUrl,
  revokeImageUploadItems,
  type ImageUploadItem,
  type ImageUploadItemRemote,
  uploadSystemFile,
} from "@/lib/system-file-api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ImageUploadTiming = "deferred" | "immediate";

export type ImageUploadFieldProps = {
  id: string;
  labelKey: string;
  purpose: string;
  value: ImageUploadItem[];
  onChange: (items: ImageUploadItem[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  /** Default `deferred` — upload on save; use `immediate` in Storybook demos. */
  uploadTiming?: ImageUploadTiming;
  /** Storybook / immediate mode — defaults to `uploadSystemFile`. */
  uploadFile?: (file: File) => Promise<ImageUploadItemRemote>;
  className?: string;
  /** Default true; set false when the upload zone is self-explanatory (e.g. setting logo). */
  showLabel?: boolean;
  /** Single-file mode only — stretch upload card to container width (e.g. setting sheet). */
  fullWidth?: boolean;
};

function validateImageFile(file: File, t: (key: string) => string): string | null {
  if (!ALLOWED.has(file.type)) {
    return t("form.upload.invalidType");
  }
  if (file.size > MAX_BYTES) {
    return t("form.upload.tooLarge");
  }
  return null;
}

function SortableThumb({
  item,
  index,
  cover,
  disabled,
  onRemove,
  onPreview,
  sortable,
}: {
  item: ImageUploadItem;
  index: number;
  cover: boolean;
  disabled?: boolean;
  onRemove: () => void;
  onPreview: () => void;
  sortable: boolean;
}) {
  const t = useTranslations();
  const { ref, handleRef, isDragging } = useSortable({
    id: imageUploadItemKey(item),
    index,
    disabled: !sortable || disabled,
  });
  const src = imageUploadItemUrl(item);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background",
        isDragging && "opacity-50"
      )}
    >
      {cover ? (
        <Badge className="absolute left-1 top-1 z-10 px-1.5 py-0 text-[10px]">
          {t("form.upload.cover")}
        </Badge>
      ) : null}
      <button
        type="button"
        className="size-full"
        onClick={onPreview}
        aria-label={t("form.upload.view")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="size-full object-cover" />
      </button>
      {sortable ? (
        <button
          type="button"
          ref={handleRef}
          disabled={disabled}
          className="absolute bottom-1 left-1 inline-flex size-7 cursor-grab items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm hover:text-foreground active:cursor-grabbing"
          aria-label={t("form.upload.reorder")}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <ButtonIcon
        type="button"
        tone="delete"
        size="xs"
        className="absolute right-1 top-1 size-7 bg-background/90 shadow-sm"
        aria-label={t("form.upload.remove")}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="size-3.5" />
      </ButtonIcon>
    </div>
  );
}

export function ImageUploadField({
  id,
  labelKey,
  purpose,
  value,
  onChange,
  maxFiles = 1,
  disabled,
  uploadTiming = "deferred",
  uploadFile,
  className,
  showLabel = true,
  fullWidth = false,
}: ImageUploadFieldProps) {
  const t = useTranslations();
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    return () => {
      revokeImageUploadItems(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  const label = t(labelKey);
  const atMax = value.length >= maxFiles;
  const gallery = maxFiles > 1;
  const sortable = gallery && value.length > 1;

  const replaceValue = useCallback(
    (next: ImageUploadItem[]) => {
      const removed = value.filter(
        (v) => !next.some((n) => imageUploadItemKey(n) === imageUploadItemKey(v))
      );
      revokeImageUploadItems(removed);
      onChange(next);
    },
    [onChange, value]
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length || disabled) return;

      const room = maxFiles - value.length;
      const batch = maxFiles === 1 ? list.slice(0, 1) : list.slice(0, room);
      if (!batch.length) {
        toast.error(t("form.upload.maxFiles", { max: maxFiles }));
        return;
      }

      const added: ImageUploadItem[] = [];
      for (const file of batch) {
        const err = validateImageFile(file, t);
        if (err) {
          toast.error(err);
          continue;
        }
        if (uploadTiming === "deferred") {
          added.push({
            kind: "local",
            file,
            previewUrl: URL.createObjectURL(file),
          });
        }
      }

      if (uploadTiming === "immediate") {
        setUploading(true);
        const doUpload =
          uploadFile ?? ((file: File) => uploadSystemFile(locale, purpose, file));
        try {
          for (const file of batch) {
            const err = validateImageFile(file, t);
            if (err) continue;
            setProgress(12);
            try {
              const item = await doUpload(file);
              added.push(item);
              setProgress(100);
            } catch {
              toast.error(t("error.generic"));
            }
          }
        } finally {
          setUploading(false);
          setProgress(0);
        }
      }

      if (!added.length) return;

      if (maxFiles === 1) {
        replaceValue([added[0]!]);
      } else {
        replaceValue([...value, ...added].slice(0, maxFiles));
      }
    },
    [
      disabled,
      locale,
      maxFiles,
      purpose,
      replaceValue,
      t,
      uploadFile,
      uploadTiming,
      value,
    ]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void processFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void processFiles(e.dataTransfer.files);
  };

  const removeAt = (index: number) => {
    const removed = value[index];
    if (removed) revokeImageUploadItems([removed]);
    onChange(value.filter((_, i) => i !== index));
  };

  const showUploadZone = !atMax || maxFiles === 1;
  const previewSrc = value.length === 1 ? imageUploadItemUrl(value[0]!) : null;
  const singleLogo = maxFiles === 1;
  const singleFullWidth = singleLogo && fullWidth;
  const showLimitsHint = value.length === 0;
  const limitsHintId = `${id}-hint`;
  const singleWithPreview = singleLogo && previewSrc != null && maxFiles === 1;

  return (
    <Field className={cn("gap-1.5", className)}>
      {showLabel ? <FieldLabel htmlFor={inputId}>{label}</FieldLabel> : null}
      <div
        className={cn(
          singleLogo
            ? cn("flex w-full", !singleFullWidth && "justify-center")
            : "flex flex-wrap items-start gap-3"
        )}
      >
        {showUploadZone ? (
          <Card
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || uploading}
            className={cn(
              "relative flex cursor-pointer flex-col items-center border-dashed text-center text-xs text-muted-foreground shadow-none transition-colors",
              singleWithPreview
                ? "aspect-square w-full min-w-0 max-w-full justify-between gap-1 p-2"
                : "justify-center gap-1.5 p-3",
              !singleWithPreview &&
                (singleFullWidth
                  ? "min-h-28 w-full min-w-0"
                  : "min-h-[6.5rem] min-w-[6.5rem]"),
              dragOver && "border-primary bg-muted/40",
              (disabled || uploading) && "pointer-events-none opacity-60"
            )}
            onClick={() => !disabled && !uploading && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {uploading ? (
              <Spinner className="size-6" />
            ) : previewSrc && maxFiles === 1 ? (
              <>
                {previewSrc && !disabled && !uploading ? (
                  <ButtonIcon
                    type="button"
                    tone="delete"
                    size="xs"
                    className="absolute right-2 top-2 z-10 size-7 bg-background/90 shadow-sm"
                    aria-label={t("form.upload.remove")}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(0);
                    }}
                  >
                    <X className="size-3.5" />
                  </ButtonIcon>
                ) : null}
                <div className="flex min-h-0 w-full flex-1 flex-col items-stretch">
                  <div className="flex min-h-0 flex-1 items-center justify-center px-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt=""
                      className={cn(
                        "max-h-full max-w-full rounded-md object-contain",
                        singleFullWidth && "w-full"
                      )}
                    />
                  </div>
                  {/* <span className="shrink-0 pt-0.5">
                    {t("form.upload.change")}
                  </span> */}
                </div>
              </>
            ) : (
              <>
                <Upload className="size-6" />
                <span>{t("form.upload.hint")}</span>
              </>
            )}
            {uploading ? (
              <Progress value={progress} className="mt-1 h-1 w-full max-w-[5rem]" />
            ) : null}
          </Card>
        ) : null}

        {gallery && value.length > 0 ? (
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled || !sortable) return;
              const ids = value.map((v) => imageUploadItemKey(v));
              const nextIds = reorderIdsFromSortableEvent(ids, event);
              if (!nextIds) return;
              const byId = new Map(value.map((v) => [imageUploadItemKey(v), v]));
              onChange(nextIds.map((sid) => byId.get(sid)!));
            }}
          >
            <div className="flex flex-wrap gap-2">
              {value.map((item, index) => (
                <SortableThumb
                  key={imageUploadItemKey(item)}
                  item={item}
                  index={index}
                  cover={index === 0}
                  disabled={disabled}
                  sortable={sortable}
                  onRemove={() => removeAt(index)}
                  onPreview={() => setPreviewUrl(imageUploadItemUrl(item))}
                />
              ))}
            </div>
          </DragDropProvider>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={maxFiles > 1}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={onInputChange}
        aria-label={showLabel ? undefined : label}
        aria-describedby={showLimitsHint ? limitsHintId : undefined}
      />
      {showLimitsHint ? (
        <p
          id={limitsHintId}
          className={cn("text-xs text-muted-foreground", singleLogo && "text-center")}
        >
          {t("form.upload.limits")}
        </p>
      ) : null}

      <Dialog open={previewUrl != null} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-lg p-2">
          <DialogTitle className="sr-only">{t("form.upload.view")}</DialogTitle>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="max-h-[70vh] w-full rounded-md object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </Field>
  );
}
