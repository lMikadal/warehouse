"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import {
  CrudFormSheet,
  CrudFormSheetBody,
  CrudFormSheetFooter,
  CrudFormSheetHeader,
} from "@/components/molecules/crud-form-sheet";
import { FormField } from "@/components/molecules/form-field";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  loadAdminRoleComboboxOptions,
  resolveAdminRoleComboboxLabel,
} from "@/lib/admin-role-combobox";
import {
  BOOTSTRAP_ADMIN_USER_ID,
  type AdminUserRow,
} from "@/lib/admin-user-api";
import { useAdminBackofficeActor } from "@/lib/admin-backoffice-actor-context";

const USER_STATUSES = ["active", "inactive", "suspended", "locked"] as const;
const USER_TYPES = ["superadmin", "owner", "manager", "staff"] as const;

export type AdminUserEditPayload = {
  username: string;
  email: string;
  password: string;
  creditPin: string;
  discountPin: string;
  adminRoleId: number;
  type: string;
  status: string;
};

export type AdminUserSaveOptions = {
  changePassword: boolean;
  changeCreditPin: boolean;
  changeDiscountPin: boolean;
};

export type AdminUserSheetState =
  | { mode: "edit"; row: AdminUserRow }
  | { mode: "create" };

export type AdminUserEditSheetProps = {
  state: AdminUserSheetState | null;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: number | null,
    payload: AdminUserEditPayload,
    options: AdminUserSaveOptions
  ) => void | Promise<void>;
  serverFieldErrors?: Partial<
    Record<"username" | "email" | "password" | "passwordConfirm", string>
  >;
};

type RequiredKey = "username" | "adminRoleId";

function emptyInvalid(): Record<RequiredKey, boolean> {
  return { username: false, adminRoleId: false };
}

function AdminUserEditForm({
  mode,
  editId,
  initial,
  onSave,
  onClose,
  serverFieldErrors,
  locale,
}: {
  mode: "edit" | "create";
  editId: number | null;
  initial: AdminUserEditPayload & { roleValue: string };
  onSave: AdminUserEditSheetProps["onSave"];
  onClose: () => void;
  serverFieldErrors?: AdminUserEditSheetProps["serverFieldErrors"];
  locale: string;
}) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");
  const tPage = useTranslations("page.adminUser");
  const tError = useTranslations("error");
  const tUserType = useTranslations("userType");
  const tUserStatus = useTranslations("userStatus");
  const tForm = useTranslations("form");
  const tComboboxEmpty = useTranslations("form.combobox");
  const actor = useAdminBackofficeActor();

  const [username, setUsername] = useState(initial.username);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [changePassword, setChangePassword] = useState(mode === "create");
  const [changeCreditPin, setChangeCreditPin] = useState(false);
  const [changeDiscountPin, setChangeDiscountPin] = useState(false);
  const [creditPin, setCreditPin] = useState("");
  const [creditPinConfirm, setCreditPinConfirm] = useState("");
  const [discountPin, setDiscountPin] = useState("");
  const [discountPinConfirm, setDiscountPinConfirm] = useState("");
  const [roleValue, setRoleValue] = useState(initial.roleValue);
  const [type, setType] = useState(initial.type);
  const [status, setStatus] = useState(initial.status);
  const [fieldInvalid, setFieldInvalid] = useState(emptyInvalid);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [passwordConfirmInvalid, setPasswordConfirmInvalid] = useState(false);
  const [creditPinInvalid, setCreditPinInvalid] = useState(false);
  const [creditPinConfirmInvalid, setCreditPinConfirmInvalid] = useState(false);
  const [discountPinInvalid, setDiscountPinInvalid] = useState(false);
  const [discountPinConfirmInvalid, setDiscountPinConfirmInvalid] =
    useState(false);

  const showApprovalPins = mode === "edit" && type === "superadmin";
  const isBootstrapUser =
    mode === "edit" && editId === BOOTSTRAP_ADMIN_USER_ID;

  const typeOptions = useMemo(() => {
    const base =
      actor.type === "superadmin"
        ? [...USER_TYPES]
        : USER_TYPES.filter((v) => v !== "superadmin");
    return base;
  }, [actor.type]);

  useEffect(() => {
    setUsername(initial.username);
    setEmail(initial.email);
    setRoleValue(initial.roleValue);
    setType(initial.type);
    setStatus(initial.status);
    setPassword("");
    setPasswordConfirm("");
    setChangePassword(mode === "create");
    setChangeCreditPin(false);
    setChangeDiscountPin(false);
    setCreditPin("");
    setCreditPinConfirm("");
    setDiscountPin("");
    setDiscountPinConfirm("");
    setFieldInvalid(emptyInvalid());
  }, [initial, mode]);

  useEffect(() => {
    if (type !== "superadmin") {
      setChangeCreditPin(false);
      setChangeDiscountPin(false);
      setCreditPin("");
      setCreditPinConfirm("");
      setDiscountPin("");
      setDiscountPinConfirm("");
      setCreditPinInvalid(false);
      setCreditPinConfirmInvalid(false);
      setDiscountPinInvalid(false);
      setDiscountPinConfirmInvalid(false);
    }
  }, [type]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const nextInvalid = emptyInvalid();
    if (!trimmedUser) nextInvalid.username = true;
    const roleId = Number(roleValue);
    if (!Number.isFinite(roleId) || roleId <= 0) nextInvalid.adminRoleId = true;

    let pwInvalid = false;
    let pwConfirmInvalid = false;
    if (changePassword) {
      if (!password) pwInvalid = true;
      if (!passwordConfirm) pwConfirmInvalid = true;
      if (password && passwordConfirm && password !== passwordConfirm) {
        pwConfirmInvalid = true;
      }
    }

    let creditInvalid = false;
    let creditConfirmInvalid = false;
    if (showApprovalPins && changeCreditPin) {
      if (!creditPin) creditInvalid = true;
      if (!creditPinConfirm) creditConfirmInvalid = true;
      if (
        creditPin &&
        creditPinConfirm &&
        creditPin !== creditPinConfirm
      ) {
        creditConfirmInvalid = true;
      }
    }

    let discountInvalid = false;
    let discountConfirmInvalid = false;
    if (showApprovalPins && changeDiscountPin) {
      if (!discountPin) discountInvalid = true;
      if (!discountPinConfirm) discountConfirmInvalid = true;
      if (
        discountPin &&
        discountPinConfirm &&
        discountPin !== discountPinConfirm
      ) {
        discountConfirmInvalid = true;
      }
    }

    setFieldInvalid(nextInvalid);
    setPasswordInvalid(pwInvalid);
    setPasswordConfirmInvalid(pwConfirmInvalid);
    setCreditPinInvalid(creditInvalid);
    setCreditPinConfirmInvalid(creditConfirmInvalid);
    setDiscountPinInvalid(discountInvalid);
    setDiscountPinConfirmInvalid(discountConfirmInvalid);

    if (
      nextInvalid.username ||
      nextInvalid.adminRoleId ||
      pwInvalid ||
      pwConfirmInvalid ||
      creditInvalid ||
      creditConfirmInvalid ||
      discountInvalid ||
      discountConfirmInvalid
    ) {
      return;
    }

    await onSave(
      editId,
      {
        username: trimmedUser,
        email: email.trim(),
        password,
        creditPin,
        discountPin,
        adminRoleId: roleId,
        type,
        status,
      },
      { changePassword, changeCreditPin, changeDiscountPin }
    );
    onClose();
  };

  const dismissLabel =
    mode === "create" ? tCrud("btn.back") : tCrud("btn.cancel");

  const roleLabel = tCol("role");
  const rolePlaceholder = tForm("placeholder.select", { label: roleLabel });

  return (
    <form
      id="admin-user-edit-form"
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      <CrudFormSheetHeader
        title={mode === "create" ? tPage("add") : tPage("editTitle")}
      />
      <CrudFormSheetBody className="space-y-4">
        <FormField
          id="admin-user-username"
          labelKey="col.username"
          required
          value={username}
          invalid={fieldInvalid.username || !!serverFieldErrors?.username}
          onChange={setUsername}
          onClearInvalid={() =>
            setFieldInvalid((p) => (p.username ? { ...p, username: false } : p))
          }
        />
        <FormField
          id="admin-user-email"
          labelKey="col.email"
          type="email"
          value={email}
          invalid={!!serverFieldErrors?.email}
          onChange={setEmail}
        />
        {mode === "edit" ? (
          <Field className="flex flex-row items-center justify-between gap-2">
            <FieldLabel htmlFor="admin-user-change-pw">
              {tPage("changePassword")}
            </FieldLabel>
            <Switch
              id="admin-user-change-pw"
              checked={changePassword}
              onCheckedChange={setChangePassword}
            />
          </Field>
        ) : null}
        {changePassword ? (
          <>
            <FormField
              id="admin-user-password"
              labelKey="col.password"
              type="password"
              required
              value={password}
              invalid={passwordInvalid || !!serverFieldErrors?.password}
              onChange={setPassword}
              onClearInvalid={() => setPasswordInvalid(false)}
            />
            <FormField
              id="admin-user-password-confirm"
              labelKey="col.passwordConfirm"
              type="password"
              required
              value={passwordConfirm}
              invalid={
                passwordConfirmInvalid || !!serverFieldErrors?.passwordConfirm
              }
              onChange={setPasswordConfirm}
              onClearInvalid={() => setPasswordConfirmInvalid(false)}
            />
            {passwordConfirmInvalid && password && passwordConfirm ? (
              <p className="text-sm text-destructive" role="alert">
                {tError("passwordMismatch")}
              </p>
            ) : null}
          </>
        ) : null}
        {showApprovalPins ? (
          <>
            <Field className="flex flex-row items-center justify-between gap-2">
              <FieldLabel htmlFor="admin-user-change-credit-pin">
                {tPage("changeCreditPin")}
              </FieldLabel>
              <Switch
                id="admin-user-change-credit-pin"
                checked={changeCreditPin}
                onCheckedChange={setChangeCreditPin}
              />
            </Field>
            {changeCreditPin ? (
              <>
                <FormField
                  id="admin-user-credit-pin"
                  labelKey="col.approvalCreditPin"
                  type="password"
                  required
                  value={creditPin}
                  invalid={creditPinInvalid}
                  onChange={setCreditPin}
                  onClearInvalid={() => setCreditPinInvalid(false)}
                />
                <FormField
                  id="admin-user-credit-pin-confirm"
                  labelKey="col.approvalCreditPinConfirm"
                  type="password"
                  required
                  value={creditPinConfirm}
                  invalid={creditPinConfirmInvalid}
                  onChange={setCreditPinConfirm}
                  onClearInvalid={() => setCreditPinConfirmInvalid(false)}
                />
                {creditPinConfirmInvalid &&
                creditPin &&
                creditPinConfirm ? (
                  <p className="text-sm text-destructive" role="alert">
                    {tError("passwordMismatch")}
                  </p>
                ) : null}
              </>
            ) : null}
            <Field className="flex flex-row items-center justify-between gap-2">
              <FieldLabel htmlFor="admin-user-change-discount-pin">
                {tPage("changeDiscountPin")}
              </FieldLabel>
              <Switch
                id="admin-user-change-discount-pin"
                checked={changeDiscountPin}
                onCheckedChange={setChangeDiscountPin}
              />
            </Field>
            {changeDiscountPin ? (
              <>
                <FormField
                  id="admin-user-discount-pin"
                  labelKey="col.approvalDiscountPin"
                  type="password"
                  required
                  value={discountPin}
                  invalid={discountPinInvalid}
                  onChange={setDiscountPin}
                  onClearInvalid={() => setDiscountPinInvalid(false)}
                />
                <FormField
                  id="admin-user-discount-pin-confirm"
                  labelKey="col.approvalDiscountPinConfirm"
                  type="password"
                  required
                  value={discountPinConfirm}
                  invalid={discountPinConfirmInvalid}
                  onChange={setDiscountPinConfirm}
                  onClearInvalid={() => setDiscountPinConfirmInvalid(false)}
                />
                {discountPinConfirmInvalid &&
                discountPin &&
                discountPinConfirm ? (
                  <p className="text-sm text-destructive" role="alert">
                    {tError("passwordMismatch")}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
        <Field>
          <FieldLabel>
            {roleLabel}
            <span className="text-destructive" aria-hidden>
              *
            </span>
          </FieldLabel>
          <RemoteComboboxField
            id="admin-user-role"
            label={roleLabel}
            value={roleValue}
            onValueChange={setRoleValue}
            placeholder={rolePlaceholder}
            emptyLabel={tComboboxEmpty("noResults")}
            inputClassName="w-full"
            disabled={isBootstrapUser}
            invalid={fieldInvalid.adminRoleId}
            onLoadOptions={(ctx) =>
              loadAdminRoleComboboxOptions(locale, {
                search: ctx.search,
                signal: ctx.signal,
                activeOnly: true,
              })
            }
            resolveSelectedLabel={(value) =>
              resolveAdminRoleComboboxLabel(locale, value)
            }
          />
        </Field>
        <Field>
          <FieldLabel>{tCol("type")}</FieldLabel>
          <Select
            value={type}
            disabled={isBootstrapUser}
            onValueChange={(v) => v && setType(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {USER_TYPES.includes(type as (typeof USER_TYPES)[number])
                  ? tUserType(type as (typeof USER_TYPES)[number])
                  : type}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {tUserType(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>{tCol("status")}</FieldLabel>
          <Select
            value={status}
            disabled={isBootstrapUser}
            onValueChange={(v) => v && setStatus(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])
                  ? tUserStatus(status as (typeof USER_STATUSES)[number])
                  : status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {USER_STATUSES.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {tUserStatus(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CrudFormSheetBody>
      <CrudFormSheetFooter dismissLabel={dismissLabel} />
    </form>
  );
}

export function AdminUserEditSheet({
  state,
  locale,
  onOpenChange,
  onSave,
  serverFieldErrors,
}: AdminUserEditSheetProps) {
  const open = state != null;
  const editId = state?.mode === "edit" ? state.row.id : null;

  const initial =
    state?.mode === "edit"
      ? {
          username: state.row.username,
          email: state.row.email ?? "",
          password: "",
          creditPin: "",
          discountPin: "",
          adminRoleId: state.row.admin_role_id ?? 0,
          type: state.row.type,
          status: state.row.status,
          roleValue:
            state.row.admin_role_id != null
              ? String(state.row.admin_role_id)
              : "",
        }
      : {
          username: "",
          email: "",
          password: "",
          creditPin: "",
          discountPin: "",
          adminRoleId: 0,
          type: "staff",
          status: "active",
          roleValue: "",
        };

  return (
    <CrudFormSheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AdminUserEditForm
          key={editId ?? "new"}
          mode={state.mode}
          editId={editId}
          initial={initial}
          locale={locale}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          serverFieldErrors={serverFieldErrors}
        />
      ) : null}
    </CrudFormSheet>
  );
}
