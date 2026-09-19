"use client";

import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const DOC_PURPOSE = "member_document";
const DOC_MAX = 10 * 1024 * 1024;
const DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

type FileMeta = {
  id: number;
  systemFileId: number;
  name: string;
  updatedAt: string;
};

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
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadMeta = useCallback(async () => {
    const sortedFiles = [...files].sort(
      (a, b) => a.sort_order - b.sort_order || a.id - b.id
    );
    const next: FileMeta[] = [];
    for (const f of sortedFiles) {
      next.push({
        id: f.id,
        systemFileId: f.system_file_id,
        name: `File #${f.system_file_id}`,
        updatedAt: f.updated_at,
      });
    }
    setRows(next);
  }, [locale, files]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- file meta fetch
    void loadMeta();
  }, [loadMeta]);

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

  const removeFile = async (fileId: number) => {
    if (!canManage) return;
    setBusyId(fileId);
    try {
      await deleteMemberUserFile(locale, userId, fileId);
      toast.success(tCrud("toast.deleted"));
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setBusyId(null);
    }
  };

  const moveFile = async (index: number, direction: -1 | 1) => {
    if (!canManage) return;
    const sortedFiles = [...files].sort(
      (a, b) => a.sort_order - b.sort_order || a.id - b.id
    );
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedFiles.length) return;
    const drag = sortedFiles[index]!;
    const target = sortedFiles[targetIndex]!;
    setBusyId(drag.id);
    try {
      await reorderMemberUserFiles(locale, userId, drag.id, target.id);
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof MemberUserApiError ? err.message : tErr("generic")
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>{t("tabFiles")}</FormCardTitle>
      </FormCardHeader>
      <FormCardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("filesHint")}</p>
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
              variant="outline"
              disabled={uploading}
              onClick={onPickFile}
            >
              <Upload className="size-4" aria-hidden />
              {t("filesUpload")}
            </Button>
          </>
        ) : null}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("productName")}</TableHead>
                <TableHead>{tCol("updatedAt")}</TableHead>
                {canManage ? (
                  <TableHead className="w-32 text-center">
                    {tCrud("table.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 3 : 2}
                    className="text-center text-muted-foreground"
                  >
                    {t("emptyData")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      {formatDateTime(row.updatedAt, locale)}
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={busyId != null || index === 0}
                            aria-label={tCrud("sort.asc")}
                            onClick={() => void moveFile(index, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={
                              busyId != null || index === rows.length - 1
                            }
                            aria-label={tCrud("sort.desc")}
                            onClick={() => void moveFile(index, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            disabled={busyId === row.id}
                            aria-label={tCrud("btn.delete")}
                            onClick={() => void removeFile(row.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FormCardContent>
    </FormCard>
  );
}
