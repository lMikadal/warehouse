"use client";

import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { DisplayLocale } from "@/lib/format-datetime";
import { formatDateTime } from "@/lib/format-datetime";
import type { MemberUserHistoryRow } from "@/lib/member-user-api";

function formatBaht(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type MemberUserFormEditAsideProps = {
  creditLimit: string;
  note: string;
  onNoteChange: (value: string) => void;
  noteReadOnly: boolean;
  histories: MemberUserHistoryRow[];
};

export function MemberUserFormEditAside({
  creditLimit,
  note,
  onNoteChange,
  noteReadOnly,
  histories,
}: MemberUserFormEditAsideProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("memberUser");
  const tCol = useTranslations("col");
  const tForm = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tErr = useTranslations("error");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(note);

  const limit = Number(creditLimit) || 0;
  // ponytail: outstanding/overdue stay 0 until member order APIs feed KPIs (see orders tab)
  const outstanding = 0;
  const overdue = 0;
  const available = Math.max(0, limit - outstanding);

  const recent = useMemo(() => {
    return [...histories]
      .sort((a, b) => {
        const ca = a.created_at ?? "";
        const cb = b.created_at ?? "";
        return cb.localeCompare(ca) || b.id - a.id;
      })
      .slice(0, 5);
  }, [histories]);

  const sortedAll = useMemo(() => {
    return [...histories].sort((a, b) => {
      const ca = a.created_at ?? "";
      const cb = b.created_at ?? "";
      return cb.localeCompare(ca) || b.id - a.id;
    });
  }, [histories]);

  const openNoteEdit = () => {
    setDraftNote(note);
    setNoteOpen(true);
  };

  const saveNote = () => {
    onNoteChange(draftNote);
    setNoteOpen(false);
  };

  return (
    <aside
      className="flex min-w-0 w-full flex-col gap-4 lg:col-start-2 lg:max-h-[calc(100svh-3.5rem-1rem-4.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-y-contain lg:sticky lg:top-[calc(3.5rem+1rem)]"
    >
      <FormCard className="shrink-0">
          <FormCardHeader>
            <FormCardTitle>{t("currentBalance")}</FormCardTitle>
          </FormCardHeader>
          <FormCardContent className="flex flex-col gap-3">
            <p className="text-lg font-semibold tabular-nums">
              {t("creditBalance", {
                amount: formatBaht(available),
                unit: t("bahtUnit"),
              })}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-1 py-2 text-center text-primary">
                <p className="text-[0.625rem] leading-tight">
                  {t("creditLimit")}
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums leading-none">
                  {formatBaht(limit)}
                </p>
                <p className="mt-0.5 text-[0.625rem]">{t("bahtUnit")}</p>
              </div>
              <div className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 px-1 py-2 text-center text-amber-700 dark:text-amber-400">
                <p className="text-[0.625rem] leading-tight">
                  {t("outstandingBalance")}
                </p>
                <p className="mt-1 text-base font-semibold tabular-nums leading-none">
                  {formatBaht(outstanding)}
                </p>
                <p className="mt-0.5 text-[0.625rem]">{t("bahtUnit")}</p>
              </div>
              <div className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border border-destructive/25 bg-destructive/10 px-1 py-2 text-center text-destructive">
                <p className="text-[0.625rem] leading-tight">{t("overdue")}</p>
                <p className="mt-1 text-base font-semibold tabular-nums leading-none">
                  {formatBaht(overdue)}
                </p>
                <p className="mt-0.5 text-[0.625rem]">{t("bahtUnit")}</p>
              </div>
            </div>
          </FormCardContent>
      </FormCard>

      <FormCard className="shrink-0">
          <FormCardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <FormCardTitle>{t("recentActivity")}</FormCardTitle>
            {histories.length > 0 ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => setHistoryOpen(true)}
              >
                {t("viewAll")}
              </Button>
            ) : null}
          </FormCardHeader>
          <FormCardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tErr("noData")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recent.map((h) => (
                  <li key={h.id} className="text-sm">
                    <span className="block text-xs text-muted-foreground">
                      {h.created_at
                        ? formatDateTime(h.created_at, locale)
                        : "—"}
                    </span>
                    <span>{h.title?.trim() || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </FormCardContent>
      </FormCard>

      <FormCard className="shrink-0">
          <FormCardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <FormCardTitle>{tCol("note")}</FormCardTitle>
            {!noteReadOnly ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                aria-label={t("editNote")}
                onClick={openNoteEdit}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            ) : null}
          </FormCardHeader>
          <FormCardContent>
            <p className="whitespace-pre-wrap text-sm">
              {note.trim() || "—"}
            </p>
          </FormCardContent>
      </FormCard>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[min(32rem,90vh)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("recentActivity")}</DialogTitle>
          </DialogHeader>
          {sortedAll.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tErr("noData")}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {sortedAll.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="block text-xs text-muted-foreground">
                    {h.created_at
                      ? formatDateTime(h.created_at, locale)
                      : "—"}
                  </span>
                  <span>{h.title?.trim() || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHistoryOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tCol("note")}</DialogTitle>
          </DialogHeader>
          <Textarea
            id="mu-note-dialog"
            value={draftNote}
            disabled={noteReadOnly}
            placeholder={tForm("placeholder.input", { label: tCol("note") })}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoteOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button type="button" onClick={saveNote}>
              {tCrud("btn.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
