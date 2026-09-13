import { routing } from "@/i18n/routing";

import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return <LoginForm />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
