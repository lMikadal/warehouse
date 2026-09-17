"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { StatusSwitchField } from "@/components/molecules/status-switch-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WarehouseCondition } from "@/lib/warehouse-api";

export type WarehouseSheetState =
  | { kind: "warehouse"; id?: number }
  | { kind: "zone"; warehouseId: number; id?: number }
  | {
      kind: "slot";
      parentId: number;
      id?: number;
      childType?: string;
      allowedTypes?: string[];
    };

export type ZoneConditionValues = { amount: string; amountActive: string };

export type ZoneConditionsForm = {
  shelf: ZoneConditionValues;
  rack: ZoneConditionValues;
  bin: ZoneConditionValues;
};

const ZERO_COND: ZoneConditionValues = { amount: "0", amountActive: "0" };

export const EMPTY_ZONE_CONDITIONS: ZoneConditionsForm = {
  shelf: { ...ZERO_COND },
  rack: { ...ZERO_COND },
  bin: { ...ZERO_COND },
};

export function conditionsFromApi(
  rows: WarehouseCondition[] | undefined
): ZoneConditionsForm {
  const form: ZoneConditionsForm = {
    shelf: { ...ZERO_COND },
    rack: { ...ZERO_COND },
    bin: { ...ZERO_COND },
  };
  for (const type of ["shelf", "rack", "bin"] as const) {
    const c = rows?.find((r) => r.type === type);
    if (c) {
      form[type] = {
        amount: String(c.amount ?? 0),
        amountActive: String(c.amount_active ?? 0),
      };
    }
  }
  return form;
}

export type ZoneConditionType = keyof ZoneConditionsForm;

export type ValidateZoneConditionResult =
  | { ok: true; amount: number; active: number }
  | {
      ok: false;
      reason: "required" | "exceeds";
      field: keyof ZoneConditionValues;
    };

export function validateZoneConditionAmounts(
  amountStr: string,
  activeStr: string
): ValidateZoneConditionResult {
  const amountTrim = amountStr.trim();
  const activeTrim = activeStr.trim();
  if (amountTrim === "") {
    return { ok: false, reason: "required", field: "amount" };
  }
  if (activeTrim === "") {
    return { ok: false, reason: "required", field: "amountActive" };
  }
  const amount = Number(amountTrim);
  const active = Number(activeTrim);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(active) ||
    active < 0
  ) {
    return { ok: false, reason: "required", field: "amount" };
  }
  if (active > amount) {
    return { ok: false, reason: "exceeds", field: "amountActive" };
  }
  return { ok: true, amount, active };
}

export function conditionsToPatchBody(form: ZoneConditionsForm) {
  const n = (s: string) => Number(s) || 0;
  return {
    shelf: { amount: n(form.shelf.amount), amount_active: n(form.shelf.amountActive) },
    rack: { amount: n(form.rack.amount), amount_active: n(form.rack.amountActive) },
    bin: { amount: n(form.bin.amount), amount_active: n(form.bin.amountActive) },
  };
}

export type WarehouseNodeFormInitial = {
  sku: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  capacity?: string;
  childType?: string;
  conditions?: ZoneConditionsForm;
};

export type WarehouseNodeSavePayload = {
  sku: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  capacity?: string;
  childType?: string;
  conditions?: ZoneConditionsForm;
};

type Props = {
  state: WarehouseSheetState | null;
  initial: WarehouseNodeFormInitial;
  canSave?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WarehouseNodeSavePayload) => void | Promise<void>;
};

const CONDITION_TYPES = [
  { key: "shelf" as const, legendKey: "typeShelf" },
  { key: "rack" as const, legendKey: "typeRack" },
  { key: "bin" as const, legendKey: "typeBin" },
];

export function WarehouseNodeEditSheet({
  state,
  initial,
  canSave = true,
  onOpenChange,
  onSave,
}: Props) {
  if (!state) return null;

  const formKey =
    state.kind === "warehouse"
      ? state.id
        ? `warehouse-edit-${state.id}`
        : "warehouse-create"
      : state.kind === "zone"
        ? state.id
          ? `zone-edit-${state.id}`
          : `zone-create-${state.warehouseId}`
        : state.id
          ? `slot-edit-${state.id}`
          : `slot-create-${state.parentId}-${state.childType ?? "x"}`;

  return (
    <WarehouseNodeEditForm
      key={formKey}
      state={state}
      initial={initial}
      canSave={canSave}
      onClose={() => onOpenChange(false)}
      onSave={onSave}
    />
  );
}

function WarehouseNodeEditForm({
  state,
  initial,
  canSave,
  onClose,
  onSave,
}: {
  state: WarehouseSheetState;
  initial: WarehouseNodeFormInitial;
  canSave: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
}) {
  const tCrud = useTranslations("crud");
  const tWh = useTranslations("warehouse");
  const tForm = useTranslations("form.placeholder");
  const tError = useTranslations("error");

  const slotTypeLabel = (type: string) => {
    if (type === "shelf") return tWh("typeShelf");
    if (type === "rack") return tWh("typeRack");
    if (type === "bin") return tWh("typeBin");
    return type;
  };

  const showSlotChildTypeSelect =
    state.kind === "slot" &&
    !state.id &&
    state.allowedTypes != null &&
    state.allowedTypes.length > 1;

  const [sku, setSku] = useState(initial.sku);
  const [nameTh, setNameTh] = useState(initial.nameTh);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [capacity, setCapacity] = useState(initial.capacity ?? "0");
  const [childType, setChildType] = useState(
    initial.childType ??
      (state.kind === "slot" ? state.childType ?? "" : "")
  );
  const [conditions, setConditions] = useState<ZoneConditionsForm>(
    initial.conditions ?? EMPTY_ZONE_CONDITIONS
  );
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [condErrorMsg, setCondErrorMsg] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const title =
    state.kind === "slot"
      ? state.id
        ? tWh("editNode")
        : tWh("addChild")
      : state.kind === "zone"
        ? state.id
          ? tWh("editZone")
          : tWh("addZone")
        : state.id
          ? tWh("editWarehouse")
          : tWh("addWarehouse");

  const setCond = (
    type: keyof ZoneConditionsForm,
    field: keyof ZoneConditionValues,
    value: string
  ) => {
    setConditions((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
    const key = `${type}-${field}`;
    setInvalid((p) => ({ ...p, [key]: false }));
    setCondErrorMsg((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, boolean> = {};
    if (!sku.trim()) next.sku = true;
    if (!nameTh.trim()) next.nameTh = true;
    if (!nameEn.trim()) next.nameEn = true;
    const condMsg: Record<string, string> = {};
    let childTypeMissing = false;
    if (state.kind === "slot" && !state.id) {
      const types = state.allowedTypes;
      if (types && types.length > 1 && !childType.trim()) {
        childTypeMissing = true;
      }
    }
    if (state.kind === "zone") {
      for (const key of ["shelf", "rack", "bin"] as const) {
        const v = validateZoneConditionAmounts(
          conditions[key].amount,
          conditions[key].amountActive
        );
        if (!v.ok) {
          const fieldKey = `${key}-${v.field}`;
          next[fieldKey] = true;
          condMsg[fieldKey] =
            v.reason === "exceeds"
              ? tWh("errorAmountActiveExceedsMax")
              : "";
        }
      }
    }
    if (childTypeMissing) {
      toast.error(tError("required"));
    }
    setInvalid(next);
    setCondErrorMsg(condMsg);
    if (childTypeMissing || Object.keys(next).length > 0) return;
    setSaving(true);
    try {
      await onSave({
        sku: sku.trim(),
        nameTh: nameTh.trim(),
        nameEn: nameEn.trim(),
        isActive,
        ...(state.kind === "zone" ? { conditions } : {}),
        ...(state.kind === "slot"
          ? { capacity: capacity.trim(), childType: childType.trim() }
          : {}),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudFormSheet open onOpenChange={(o) => !o && onClose()}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => void submit(e)}
        noValidate
      >
        <CrudFormSheetHeader title={title} />
        <CrudFormSheetBody className="space-y-4">
          {showSlotChildTypeSelect ? (
            <div className="form-field space-y-2">
              <label htmlFor="wh-child-type">
                {tWh("childType")}
                <span className="text-[#dc2626]" aria-hidden>
                  *
                </span>
              </label>
              <Select
                value={childType}
                onValueChange={(v) => {
                  if (v) setChildType(v);
                }}
              >
                <SelectTrigger id="wh-child-type" className="w-full">
                  <SelectValue
                    placeholder={tForm("select", {
                      label: tWh("childType"),
                    })}
                  >
                    {childType ? slotTypeLabel(childType) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {state.allowedTypes!.map((type) => (
                    <SelectItem key={type} value={type}>
                      {slotTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <FormField
            id="wh-sku"
            labelKey="warehouse.skuCol"
            required
            value={sku}
            onChange={setSku}
            invalid={invalid.sku}
            onClearInvalid={() => setInvalid((p) => ({ ...p, sku: false }))}
          />
          <FormField
            id="wh-name-th"
            labelKey="col.nameTh"
            required
            value={nameTh}
            onChange={setNameTh}
            invalid={invalid.nameTh}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameTh: false }))}
          />
          <FormField
            id="wh-name-en"
            labelKey="col.nameEn"
            required
            value={nameEn}
            onChange={setNameEn}
            invalid={invalid.nameEn}
            onClearInvalid={() => setInvalid((p) => ({ ...p, nameEn: false }))}
          />
          {state.kind === "slot" ? (
            <FormField
              id="wh-capacity"
              labelKey="warehouse.capacity"
              type="number"
              value={capacity}
              onChange={setCapacity}
            />
          ) : null}
          {state.kind === "zone"
            ? CONDITION_TYPES.map(({ key, legendKey }) => (
                <fieldset
                  key={key}
                  className="space-y-3 rounded-lg border border-border p-3"
                >
                  <legend className="px-1 text-sm font-semibold">
                    {tWh(legendKey)}
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      id={`wh-cond-${key}-amount`}
                      labelKey="warehouse.amountMax"
                      type="number"
                      required
                      value={conditions[key].amount}
                      onChange={(v) => setCond(key, "amount", v)}
                      invalid={invalid[`${key}-amount`]}
                      errorMessage={condErrorMsg[`${key}-amount`]}
                      onClearInvalid={() =>
                        setInvalid((p) => ({ ...p, [`${key}-amount`]: false }))
                      }
                    />
                    <FormField
                      id={`wh-cond-${key}-active`}
                      labelKey="warehouse.amountActive"
                      type="number"
                      required
                      value={conditions[key].amountActive}
                      onChange={(v) => setCond(key, "amountActive", v)}
                      invalid={invalid[`${key}-amountActive`]}
                      errorMessage={
                        condErrorMsg[`${key}-amountActive`] ||
                        undefined
                      }
                      onClearInvalid={() =>
                        setInvalid((p) => ({
                          ...p,
                          [`${key}-amountActive`]: false,
                        }))
                      }
                    />
                  </div>
                </fieldset>
              ))
            : null}
          <StatusSwitchField
            labelKey="col.active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </CrudFormSheetBody>
        <CrudFormSheetFooter
          dismissLabel={tCrud("btn.cancel")}
          showSave={canSave}
          saveDisabled={!canSave || saving}
        />
      </form>
    </CrudFormSheet>
  );
}
