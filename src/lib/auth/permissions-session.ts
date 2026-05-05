/**
 * Session-Wrapper für Permissions (Modul 4.8).
 *
 * Getrennt von permissions.ts, damit Tests und Cron-CLI die DB-Logik laden
 * können, ohne den next-auth-Stack zu ziehen. Server Actions importieren
 * von hier, NICHT direkt aus permissions.ts.
 */
import "server-only";
import { getCurrentUserId } from "@/lib/session";
import {
  PermissionDeniedError,
  can,
  getUserPermissionSet,
  type PermissionKey,
} from "./permissions";
import type { PermissionAction, PermissionResource } from "@/db/schema";

export async function getCurrentMemberPermissions(): Promise<Set<PermissionKey>> {
  try {
    const userId = await getCurrentUserId();
    return await getUserPermissionSet(userId);
  } catch {
    return new Set();
  }
}

export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction
): Promise<void> {
  const userId = await getCurrentUserId();
  const ok = await can(userId, resource, action);
  if (!ok) throw new PermissionDeniedError(resource, action);
}
