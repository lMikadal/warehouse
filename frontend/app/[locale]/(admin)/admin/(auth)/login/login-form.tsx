"use client";

import { Lock, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/molecules/form-field";
import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export function LoginForm() {
  const t = useTranslations();
  const tLogin = useTranslations("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameInvalid, setUsernameInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);

  const usernameLabel = tLogin("username");
  const passwordLabel = tLogin("password.label");
  const usernamePlaceholder = t("form.placeholder.input", {
    label: usernameLabel,
  });
  const passwordPlaceholder = t("form.placeholder.input", {
    label: passwordLabel,
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const usernameEmpty = !username.trim();
    const passwordEmpty = !password;

    if (usernameEmpty || passwordEmpty) {
      if (usernameEmpty) {
        toast.error(usernamePlaceholder);
        setUsernameInvalid(true);
        document.getElementById("login-username")?.focus();
      } else {
        toast.error(passwordPlaceholder);
        setPasswordInvalid(true);
        document.getElementById("login-password")?.focus();
      }
      if (passwordEmpty) {
        setPasswordInvalid(true);
      }
      return;
    }

    setUsernameInvalid(false);
    setPasswordInvalid(false);

    toast.success(tLogin("success"));

    // ponytail: API auth not wired — hook POST /auth/login here when backend ships
  }

  return (
    <FormCard className="w-full max-w-form shrink-0 bg-background px-2 py-7 lg:rounded-none lg:border-0 lg:px-0 lg:py-0 lg:shadow-none lg:ring-0">
      <FormCardHeader className="items-center text-center lg:items-start lg:text-left">
        <FormCardTitle className="text-2xl font-bold tracking-tight lg:text-3xl">
          {tLogin("title")}
        </FormCardTitle>
        <FormCardDescription className="lg:hidden">
          {tLogin("description")}
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField
            id="login-username"
            labelKey="login.username"
            required
            value={username}
            onChange={setUsername}
            invalid={usernameInvalid}
            onClearInvalid={() => setUsernameInvalid(false)}
          >
            <InputGroup className="rounded-login">
              <InputGroupAddon align="inline-start">
                <User className="opacity-45" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="login-username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameInvalid(false);
                }}
                placeholder={usernamePlaceholder}
                aria-invalid={usernameInvalid ? true : undefined}
              />
            </InputGroup>
          </FormField>

          <FormField
            id="login-password"
            labelKey="login.password.label"
            required
            value={password}
            onChange={setPassword}
            invalid={passwordInvalid}
            onClearInvalid={() => setPasswordInvalid(false)}
          >
            <InputGroup className="rounded-login">
              <InputGroupAddon align="inline-start">
                <Lock className="opacity-45" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordInvalid(false);
                }}
                placeholder={passwordPlaceholder}
                aria-invalid={passwordInvalid ? true : undefined}
              />
            </InputGroup>
          </FormField>

          <Button type="submit" className="mt-3 h-11 w-full font-semibold">
            {tLogin("submit")}
          </Button>
        </form>
      </FormCardContent>
    </FormCard>
  );
}
