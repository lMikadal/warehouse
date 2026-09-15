"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AuthUser } from "@/lib/auth-cookies";

const AdminBackofficeActorContext = createContext<AuthUser | null>(null);

export function AdminBackofficeActorProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  return (
    <AdminBackofficeActorContext.Provider value={user}>
      {children}
    </AdminBackofficeActorContext.Provider>
  );
}

export function useAdminBackofficeActor(): AuthUser {
  const ctx = useContext(AdminBackofficeActorContext);
  if (!ctx) {
    throw new Error("useAdminBackofficeActor requires AdminBackofficeActorProvider");
  }
  return ctx;
}
