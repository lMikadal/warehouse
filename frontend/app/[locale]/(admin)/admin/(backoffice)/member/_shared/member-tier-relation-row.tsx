"use client";

import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { profileDisplayById, type ProfileComboOption } from "./member-tier-profile-combos";
import { TableIconActions } from "@/components/molecules/table-icon-actions";
import type { MemberTierRelation, TierScopeType } from "@/lib/member-tier-api";

const REL_ROW_GRID =
  "grid min-w-[42rem] grid-cols-[minmax(8.5rem,1.15fr)_minmax(6.5rem,0.95fr)_minmax(6.5rem,0.85fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_auto] items-stretch border-b border-border/60 text-sm last:border-b-0";

const REL_CELL =
  "flex min-h-11 items-center border-r border-primary/20 px-3 py-2.5";

function formatBaht(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function scopeSummary(
  t: ReturnType<typeof useTranslations<"memberTier">>,
  type: TierScopeType,
  attrCount: number
) {
  if (type === "all") return t("countAllProducts");
  if (type === "brand") return t("relBrandCount", { count: attrCount });
  if (type === "category") return t("relCategoryCount", { count: attrCount });
  if (type === "except_brand") return t("relExceptBrandCount", { count: attrCount });
  return t("relExceptCategoryCount", { count: attrCount });
}

function CheckLine({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-foreground/85 leading-snug">
      <CircleCheck
        className="size-3.5 shrink-0 text-green-600 dark:text-green-400"
        aria-hidden
      />
      {children}
    </span>
  );
}

export type MemberTierRelationRowProps = {
  rel: MemberTierRelation;
  profileOptions: ProfileComboOption[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function MemberTierRelationRow({
  rel,
  profileOptions,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: MemberTierRelationRowProps) {
  const t = useTranslations("memberTier");
  const embeddedProfile =
    rel.profile_business_title != null && rel.profile_business_title !== ""
      ? {
          businessTitle: rel.profile_business_title,
          creditName: rel.profile_credit_name?.trim() ?? "",
        }
      : null;
  const profile =
    embeddedProfile ??
    profileDisplayById(profileOptions, rel.member_setting_relation_id);
  const attrCount = rel.attribute_ids?.length ?? 0;
  const rangeLabel = `${formatBaht(rel.purchase_start)}–${formatBaht(rel.purchase_end)} ${t("bahtUnit")}`;
  const discountBadge =
    rel.discount_type === "baht"
      ? `${formatBaht(rel.discount)} ${t("discountBaht")}`
      : `${Math.round(rel.discount)}%`;

  const actions: ("edit" | "delete")[] = [];
  if (canEdit) actions.push("edit");
  if (canDelete) actions.push("delete");

  return (
    <div className={REL_ROW_GRID}>
      <div className={`${REL_CELL} min-w-0`}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground">
            {profile?.businessTitle ?? "—"}
          </span>
          {profile?.creditName ? (
            <span className="inline-flex rounded bg-green-600/15 px-1.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">
              {profile.creditName}
            </span>
          ) : null}
        </div>
      </div>
      <div className={REL_CELL}>
        <span className="whitespace-nowrap font-bold tabular-nums">{rangeLabel}</span>
      </div>
      <div className={`${REL_CELL} flex-col items-start justify-center gap-1`}>
        <span className="text-muted-foreground text-xs">{t("tierDiscount")}</span>
        <span className="inline-flex rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">
          {discountBadge}
        </span>
      </div>
      <div className={`${REL_CELL} min-w-0`}>
        {rel.type === "all" ? (
          <CheckLine>{scopeSummary(t, rel.type, attrCount)}</CheckLine>
        ) : (
          <span className="leading-snug">{scopeSummary(t, rel.type, attrCount)}</span>
        )}
      </div>
      <div className={REL_CELL}>
        {rel.is_promotion ? (
          <CheckLine>{t("includePromotionShort")}</CheckLine>
        ) : null}
      </div>
      <div className={`${REL_CELL} justify-center border-r-0`}>
        {actions.length > 0 ? (
          <TableIconActions
            actions={actions}
            onAction={(key) => {
              if (key === "edit") onEdit();
              if (key === "delete") onDelete();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function MemberTierRelationTable({
  relations,
  profileOptions,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  relations: MemberTierRelation[];
  profileOptions: ProfileComboOption[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (rel: MemberTierRelation) => void;
  onDelete: (rel: MemberTierRelation) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md bg-card">
      {relations.map((rel) => (
        <MemberTierRelationRow
          key={rel.id}
          rel={rel}
          profileOptions={profileOptions}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={() => onEdit(rel)}
          onDelete={() => onDelete(rel)}
        />
      ))}
    </div>
  );
}
