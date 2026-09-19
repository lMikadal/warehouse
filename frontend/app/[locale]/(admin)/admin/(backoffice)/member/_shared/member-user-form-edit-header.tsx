"use client";

import { CalendarDays, Copy, Mail, Phone, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  FormCard,
  FormCardContent,
} from "@/components/molecules/form-card";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteMultiComboboxField } from "@/components/molecules/remote-multi-combobox-field";
import { StatusBadge } from "@/components/molecules/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDate } from "@/lib/format-datetime";
import {
  MemberUserApiError,
  patchMemberUser,
} from "@/lib/member-user-api";
import { loadMemberUserAdminOptions } from "@/lib/member-user-filters-combobox";
import type { ImageUploadItem } from "@/lib/system-file-api";

const AVATAR_PURPOSE = "member_avatar";

export type MemberUserFormEditHeaderProps = {
  userId: number;
  sku: string;
  displayName: string;
  tel: string;
  email: string;
  createdAt?: string;
  memberTierName: string;
  isActive: boolean;
  canToggleStatus: boolean;
  onIsActiveChange: (next: boolean) => void;
  avatarItems: ImageUploadItem[];
  onAvatarChange: (items: ImageUploadItem[]) => void;
  avatarDisabled: boolean;
  staffIds: string[];
  staffLabels: Record<string, string>;
  onStaffIdsChange: (ids: string[]) => void;
  staffDisabled: boolean;
};

export function MemberUserFormEditHeader({
  userId,
  sku,
  displayName,
  tel,
  email,
  createdAt,
  memberTierName,
  isActive,
  canToggleStatus,
  onIsActiveChange,
  avatarItems,
  onAvatarChange,
  avatarDisabled,
  staffIds,
  staffLabels,
  onStaffIdsChange,
  staffDisabled,
}: MemberUserFormEditHeaderProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tForm = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [draftStaffIds, setDraftStaffIds] = useState<string[]>(staffIds);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const copySku = useCallback(async () => {
    if (!sku) return;
    try {
      await navigator.clipboard.writeText(sku);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }, [sku, t]);

  const onStatusClick = async () => {
    if (!canToggleStatus || togglingStatus) return;
    const next = !isActive;
    setTogglingStatus(true);
    try {
      await patchMemberUser(locale, userId, { is_active: next });
      onIsActiveChange(next);
      toast.success(tCrud("toast.saved"));
    } catch (e) {
      toast.error(
        e instanceof MemberUserApiError ? e.message : tErr("generic")
      );
    } finally {
      setTogglingStatus(false);
    }
  };

  const openStaffDialog = () => {
    setDraftStaffIds(staffIds);
    setStaffDialogOpen(true);
  };

  const saveStaff = () => {
    onStaffIdsChange(draftStaffIds);
    setStaffDialogOpen(false);
  };

  const memberSince =
    createdAt != null && createdAt !== ""
      ? t("memberSinceOn", { date: formatDate(createdAt, locale) })
      : null;

  return (
    <>
      <FormCard>
        <FormCardContent className="grid gap-4 px-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <div className="w-full max-w-36 shrink-0 justify-center items-center">
            <ImageUploadField
              id="mu-avatar-edit"
              labelKey="memberUser.uploadImage"
              purpose={AVATAR_PURPOSE}
              value={avatarItems}
              onChange={onAvatarChange}
              maxFiles={1}
              uploadTiming="deferred"
              showLabel={false}
              disabled={avatarDisabled}
            />
          </div>
          <div className="relative min-w-0 space-y-2">
            <div className="absolute right-0 top-0 flex flex-wrap items-center justify-end gap-2">
              {canToggleStatus ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={togglingStatus}
                  onClick={() => void onStatusClick()}
                >
                  <StatusBadge className="cursor-pointer" active={isActive} />
                </button>
              ) : (
                <StatusBadge className="cursor-pointer" active={isActive} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pr-28">
              {memberTierName ? (
                <Badge variant="secondary" className="font-normal">
                  {memberTierName}
                </Badge>
              ) : null}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              {displayName.trim() || "—"}
            </h2>
            {sku ? (
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <span>{t("customerCode", { sku })}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={t("copySku")}
                  onClick={() => void copySku()}
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" aria-hidden />
                {tel.trim() || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0" aria-hidden />
                {email.trim() || "—"}
              </span>
              {memberSince ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  {memberSince}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-sm text-muted-foreground">
                {t("staff")}:
              </span>
              {staffIds.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                staffIds.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="font-normal"
                  >
                    {staffLabels[id] ?? id}
                  </Badge>
                ))
              )}
              {!staffDisabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn("size-8 shrink-0 text-green-600")}
                  aria-label={t("addStaff")}
                  onClick={openStaffDialog}
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>
        </FormCardContent>
      </FormCard>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("adminUsers")}</DialogTitle>
          </DialogHeader>
          <RemoteMultiComboboxField
            id="mu-staff-dialog"
            label={t("staff")}
            values={draftStaffIds}
            onValuesChange={setDraftStaffIds}
            placeholder={tForm("placeholder.select", {
              label: t("staff"),
            })}
            emptyLabel={tForm("combobox.noResults")}
            disabled={staffDisabled}
            onLoadOptions={async ({ search }) => {
              const { options } = await loadMemberUserAdminOptions(
                locale,
                search,
                1
              );
              return options;
            }}
            resolveSelectedLabels={async (vals) => {
              const out = await Promise.all(
                vals.map(async (v) => {
                  const { options } = await loadMemberUserAdminOptions(
                    locale,
                    "",
                    1,
                    Number(v)
                  );
                  return options[0] ?? { value: v, label: v };
                })
              );
              return out;
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStaffDialogOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="button" onClick={saveStaff}>
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
