"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  buildPermissionIndex,
  resourceActions,
  type ResourceActions,
} from "@/lib/admin-permissions";
import type { AuthUser } from "@/lib/auth-cookies";

type BackofficeContextValue = {
  user: AuthUser;
  permissionCodes: Set<string>;
};

const AdminBackofficeContext = createContext<BackofficeContextValue | null>(
  null
);

export function AdminBackofficeActorProvider({
  user,
  permissionCodes,
  children,
}: {
  user: AuthUser;
  permissionCodes: string[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      user,
      permissionCodes: buildPermissionIndex(permissionCodes),
    }),
    [user, permissionCodes]
  );
  return (
    <AdminBackofficeContext.Provider value={value}>
      {children}
    </AdminBackofficeContext.Provider>
  );
}

function useBackofficeContext(): BackofficeContextValue {
  const ctx = useContext(AdminBackofficeContext);
  if (!ctx) {
    throw new Error(
      "Admin backoffice hooks require AdminBackofficeActorProvider"
    );
  }
  return ctx;
}

export function useAdminBackofficeActor(): AuthUser {
  return useBackofficeContext().user;
}

export function useResourcePermissions(
  module: string,
  type: string
): ResourceActions {
  const { user, permissionCodes } = useBackofficeContext();
  return useMemo(
    () => resourceActions(permissionCodes, user.type, module, type),
    [permissionCodes, user.type, module, type]
  );
}
