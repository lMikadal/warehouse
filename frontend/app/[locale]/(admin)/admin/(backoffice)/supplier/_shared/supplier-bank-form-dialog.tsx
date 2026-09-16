"use client";

import { useTranslations } from "next-intl";

import { FormField } from "@/components/molecules/form-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchSettingLangById, fetchSettingLangList } from "@/lib/setting-api";
import type { SupplierBankInput } from "@/lib/supplier-user-api";

type SupplierBankFormDialogProps = {
  open: boolean;
  locale: string;
  draft: SupplierBankInput;
  onDraftChange: (next: SupplierBankInput) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SupplierBankFormDialog({
  open,
  locale,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: SupplierBankFormDialogProps) {
  const tSupplier = useTranslations("supplier");
  const tCol = useTranslations("col");
  const tCrud = useTranslations("crud");
  const tForm = useTranslations("form");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tSupplier("editBank")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <RemoteComboboxField
            id="bank-dialog-bank"
            label={tCol("bank")}
            value={
              draft.setting_bank_id ? String(draft.setting_bank_id) : ""
            }
            inputClassName="w-full"
            emptyLabel={tForm("combobox.noResults")}
            placeholder={tForm("placeholder.select", { label: tCol("bank") })}
            onValueChange={(v) =>
              onDraftChange({
                ...draft,
                setting_bank_id: Number(v),
              })
            }
            onLoadOptions={async ({ search, signal }) => {
              const { items } = await fetchSettingLangList(locale, "banks", {
                page: 1,
                limit: 50,
                search,
                isActive: true,
              });
              if (signal?.aborted) return [];
              return items.map((i) => ({ value: String(i.id), label: i.name }));
            }}
            resolveSelectedLabel={async (value) => {
              const item = await fetchSettingLangById(
                locale,
                "banks",
                Number(value)
              );
              return item.name;
            }}
          />
          <FormField
            id="bank-dialog-name"
            labelKey="supplier.bankAccountName"
            required
            value={draft.name}
            onChange={(v) => onDraftChange({ ...draft, name: v })}
          />
          <FormField
            id="bank-dialog-number"
            labelKey="supplier.bankAccountNumber"
            required
            value={draft.number}
            onChange={(v) => onDraftChange({ ...draft, number: v })}
          />
          <FormField
            id="bank-dialog-branch"
            labelKey="supplier.bankBranch"
            value={draft.branch ?? ""}
            onChange={(v) => onDraftChange({ ...draft, branch: v })}
          />
          <div className="flex flex-col gap-3">
            <StatusSwitchField
              className="w-full"
              checked={draft.is_active ?? true}
              onCheckedChange={(v) =>
                onDraftChange({ ...draft, is_active: v })
              }
              labelKey="col.active"
            />
            <StatusSwitchField
              className="w-full"
              checked={draft.is_default ?? false}
              onCheckedChange={(v) =>
                onDraftChange({ ...draft, is_default: v })
              }
              labelKey="col.default"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            {tCrud("btn.cancel")}
          </Button>
          <Button size="lg" onClick={() => void onSave()}>
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
