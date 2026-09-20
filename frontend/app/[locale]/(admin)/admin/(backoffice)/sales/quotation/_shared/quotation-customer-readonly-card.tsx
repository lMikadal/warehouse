"use client";

import { FileText, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  loadStoreSalesMemberComboboxOptions,
  resolveStoreSalesMemberLabel,
} from "@/lib/store-sales-member-combobox";
import { cn } from "@/lib/utils";

const storeSalesStepBadgeClass =
  "bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";

type Props = {
  locale: string;
  memberId: string;
  memberComboboxLabel: string;
  creditId: string;
  creditOptions: { value: string; label: string }[];
  memberName: string;
  memberTel: string;
  memberEmail: string;
  memberAddressDisplay: string;
  memberTaxNumber: string;
};

export function QuotationCustomerReadonlyCard({
  locale,
  memberId,
  memberComboboxLabel,
  creditId,
  creditOptions,
  memberName,
  memberTel,
  memberEmail,
  memberAddressDisplay,
  memberTaxNumber,
}: Props) {
  const tForm = useTranslations("page.orderStore.form");
  const tFormRoot = useTranslations("form");

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={storeSalesStepBadgeClass}>1</span>
          {tForm("customerStep")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 overflow-visible">
        <div className="pointer-events-none grid gap-4 opacity-60">
          <div className="grid gap-1">
            <Label htmlFor="quotation-detail-member">{tForm("memberCode")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-h-10 min-w-[min(100%,18rem)] flex-1 items-center gap-1 overflow-visible sm:min-w-48">
                <div className="min-w-0 flex-1 overflow-visible">
                  <RemoteComboboxField
                    id="quotation-detail-member"
                    label={tForm("memberCode")}
                    value={memberId}
                    onValueChange={() => {}}
                    placeholder={tForm("memberCodeSearchPlaceholder")}
                    emptyLabel={tFormRoot("combobox.noResults")}
                    inputClassName="w-full min-w-min"
                    disabled
                    pinnedItems={
                      memberId && memberComboboxLabel
                        ? [{ value: memberId, label: memberComboboxLabel }]
                        : []
                    }
                    onLoadOptions={({ search, signal }) =>
                      loadStoreSalesMemberComboboxOptions(locale, {
                        search,
                        signal,
                        resource: "quotations",
                      })
                    }
                    resolveSelectedLabel={(v) =>
                      resolveStoreSalesMemberLabel(locale, v, "quotations")
                    }
                  />
                </div>
              </div>
              {creditOptions.length > 0 ? (
                <RadioGroup
                  value={creditId}
                  onValueChange={() => {}}
                  className={cn("flex shrink-0 flex-wrap items-center gap-4")}
                  aria-label={tForm("creditType")}
                >
                  {creditOptions.map((c) => (
                    <div key={c.value} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={c.value}
                        id={`quotation-detail-credit-${c.value}`}
                        disabled
                      />
                      <Label htmlFor={`quotation-detail-credit-${c.value}`}>
                        {c.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label htmlFor="quotation-detail-member-name">
                {tForm("memberName")}
              </Label>
              <Input
                id="quotation-detail-member-name"
                value={memberName}
                readOnly
                disabled
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("memberName"),
                })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="quotation-detail-member-tel">
                {tForm("memberTel")}
              </Label>
              <Input
                id="quotation-detail-member-tel"
                value={memberTel}
                readOnly
                disabled
                type="tel"
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("memberTel"),
                })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="quotation-detail-member-email">
                {tForm("memberEmail")}
              </Label>
              <Input
                id="quotation-detail-member-email"
                value={memberEmail}
                readOnly
                disabled
                type="email"
                placeholder={tFormRoot("placeholder.input", {
                  label: tForm("memberEmail"),
                })}
              />
            </div>
          </div>

          <div className="text-muted-foreground min-w-0 space-y-2 text-sm">
            {memberAddressDisplay ? (
              <p className="flex gap-2">
                <MapPin
                  className="text-primary mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>
                  {tForm("memberAddress")} : {memberAddressDisplay}
                </span>
              </p>
            ) : null}
            {memberTaxNumber ? (
              <p className="flex gap-2">
                <FileText
                  className="text-primary mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>
                  {tForm("memberTaxId")} : {memberTaxNumber}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
