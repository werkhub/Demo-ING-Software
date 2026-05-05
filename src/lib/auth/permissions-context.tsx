"use client";

/**
 * Client-Hook für UI-Hide-Logik (Modul 4.8).
 *
 * Server-Komponente lädt einmal `getCurrentMemberPermissions()` und reicht
 * das resolved Set an den Provider. Der Hook ist rein read-only — sicherheits-
 * relevante Checks gehören weiterhin in `requirePermission()` der Server-Action.
 * Client-Hide ist Komfort, nicht Schutz.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PermissionAction, PermissionResource } from "@/db/schema";
import { permKey, type PermissionKey } from "./permissions-keys";

type PermissionsContextValue = {
  permissions: ReadonlySet<PermissionKey>;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: readonly string[];
  children: ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(
    () => ({ permissions: new Set(permissions as PermissionKey[]) }),
    [permissions]
  );
  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermission(
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const ctx = useContext(PermissionsContext);
  // Kein Provider gemountet → konservativ: deny.
  if (!ctx) return false;
  return ctx.permissions.has(permKey(resource, action));
}

export function usePermissions(): ReadonlySet<PermissionKey> {
  const ctx = useContext(PermissionsContext);
  return ctx?.permissions ?? new Set();
}
