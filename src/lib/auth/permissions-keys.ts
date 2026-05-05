/**
 * Pure, browser-safe Permission-Konstanten (Modul 4.8).
 *
 * Bewusst ohne DB-/Session-Imports, damit Client-Komponenten und Tests die
 * Konstanten teilen können. Logik mit DB-Zugriff lebt in `permissions.ts`.
 */
import type { PermissionAction, PermissionResource } from "@/db/schema";

export type PermissionKey = `${PermissionResource}:${PermissionAction}`;

export function permKey(
  resource: PermissionResource,
  action: PermissionAction
): PermissionKey {
  return `${resource}:${action}`;
}

export const PERMISSION_RESOURCES: readonly PermissionResource[] = [
  "team",
  "permissions",
  "projekte",
  "vorgaenge",
  "bautagebuch",
  "maengel",
  "plaene",
  "geraete",
  "stunden",
  "lv",
  "aufmass",
  "ausgangsrechnungen",
  "mahnungen",
  "eingangsrechnungen",
  "nachkalk",
  "datev",
  "finanzen",
];

export const PERMISSION_ACTIONS: readonly PermissionAction[] = ["read", "write"];
