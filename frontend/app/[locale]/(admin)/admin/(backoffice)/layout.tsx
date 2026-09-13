import type { ReactNode } from "react";

import { AdminBackofficeShell } from "@/components/organisms/admin-backoffice-shell";

type Props = {
  children: ReactNode;
};

export default function BackofficeLayout({ children }: Props) {
  return <AdminBackofficeShell>{children}</AdminBackofficeShell>;
}
