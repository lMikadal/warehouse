"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { ExternalLink, Info, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CrudDeleteConfirmDialog } from "@/components/molecules/crud-delete-confirm-dialog";
import { CrudNestedSortableListItem } from "@/components/molecules/crud-nested-sortable-list";
import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { Button } from "@/components/ui/button";
import { useCrudSortableReorder } from "@/hooks/use-crud-sortable-reorder";
import { sortBySortOrderThenId } from "@/lib/crud-list-rows";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import {
  createMemberUserFile,
  deleteMemberUserFile,
  MemberUserApiError,
  reorderMemberUserFiles,
  type MemberUserFileRow,
} from "@/lib/member-user-api";
import {
  uploadSystemFile,
  type ImageUploadItemRemote,
} from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

const DOC_PURPOSE = "member_document";
const DOC_MAX = 10 * 1024 * 1024;
const DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function formatByteSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fileTypeLabel(contentType: string, originalName: string): string {
  if (/pdf/i.test(contentType)) return "PDF";
  if (/jpe?g/i.test(contentType)) return "JPG";
  if (/png/i.test(contentType)) return "PNG";
  const ext = originalName.split(".").pop()?.trim();
  return (ext || "FILE").toUpperCase();
}

function fileIconClass(contentType: string): string {
  if (/pdf/i.test(contentType)) {
    return "bg-red-500/15 text-red-600 dark:text-red-400";
  }
  if (/jpe?g/i.test(contentType)) {
    return "bg-green-500/15 text-green-600 dark:text-green-400";
  }
  if (/png/i.test(contentType)) {
    return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  }
  return "bg-primary/10 text-primary";
}

export type MemberUserFormFilesTabProps = {
  userId: number;
  files: MemberUserFileRow[];
  canManage: boolean;
  onReload: () => void | Promise<void>;
};

export function MemberUserFormFilesTab({
  userId,
  files,
  canManage,
  onReload,
}: MemberUserFormFilesTabProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberUserFileRow | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => sortBySortOrderThenId(files), [files]);
  const dragEnabled = canManage && sorted.length > 1;

  const { sortableEpoch, handleDragEnd } = useCrudSortableReorder({
    rows: sorted,
    dragEnabled,
    persistReorder: canManage
      ? (dragId, targetId) =>
          reorderMemberUserFiles(locale, userId, dragId, targetId)
      : undefined,
    onSuccess: () => {
      void onReload();
      toast.success(tCrud("toast.reordered"));
    },
    onError: (err) => {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    },
  });

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canManage) return;
    if (!DOC_TYPES.has(file.type)) {
      toast.error(t("filesUnsupportedType"));
      return;
    }
    if (file.size > DOC_MAX) {
      toast.error(t("filesTooLarge"));
      return;
    }
    setUploading(true);
    try {
      const remote: ImageUploadItemRemote = await uploadSystemFile(
        locale,
        DOC_PURPOSE,
        file
      );
      await createMemberUserFile(locale, userId, remote.id);
      toast.success(tCrud("toast.saved"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    const row = deleteTarget;
    if (!row || !canManage) return;
    setDeleting(true);
    try {
      await deleteMemberUserFile(locale, userId, row.id);
      toast.success(tCrud("toast.deleted"));
      setDeleteTarget(null);
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>{t("filesSectionTitle")}</FormCardTitle>
      </FormCardHeader>
      <FormCardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 flex min-w-0 flex-1 items-start gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            <Info
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>{t("filesHint")}</span>
          </div>
          {canManage ? (
            <>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => void onFileChange(e)}
              />
              <Button
                type="button"
                size="lg"
                className="shrink-0"
                disabled={uploading}
                onClick={onPickFile}
              >
                <Upload className="size-4" aria-hidden />
                {t("filesUpload")}
              </Button>
            </>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {t("emptyData")}
          </div>
        ) : (
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div
              key={dragEnabled ? sortableEpoch : "static"}
              className="flex flex-col gap-2"
            >
              {sorted.map((row, index) => {
                const label = fileTypeLabel(row.content_type, row.original_name);
                const uploader = row.uploaded_by_username?.trim() || "—";
                const metaDate = row.file_created_at || row.updated_at;
                const openUrl = row.url?.trim();

                return (
                  <CrudNestedSortableListItem
                    key={row.id}
                    id={row.id}
                    index={index}
                    dragEnabled={dragEnabled}
                    actions={canManage ? ["delete"] : []}
                    onEdit={() => {}}
                    onDelete={() => setDeleteTarget(row)}
                    className="items-center"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                        fileIconClass(row.content_type)
                      )}
                    >
                      {label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {row.original_name || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("filesUploadedBy", {
                          name: uploader,
                          date: formatDateTime(metaDate, locale),
                          size: formatByteSize(row.size_bytes ?? 0),
                        })}
                      </div>
                    </div>
                    {openUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-lg"
                        className="shrink-0"
                        asChild
                      >
                        <a
                          href={openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("filesOpen")}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    ) : null}
                  </CrudNestedSortableListItem>
                );
              })}
            </div>
          </DragDropProvider>
        )}

        <CrudDeleteConfirmDialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open && !deleting) setDeleteTarget(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      </FormCardContent>
    </FormCard>
  );
}
