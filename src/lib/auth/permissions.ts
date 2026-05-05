/**
 * Permissions-Auflösung — Modul 4.8 (Multi-User-Rollen).
 *
 * Lookup-Reihenfolge:
 *   1. users.permissionsOverrideJson — User-spezifische Sonderrechte
 *   2. permissionsMatrix-Eintrag (workspace, role, resource, action)
 *   3. DEFAULT_MATRIX (in-Code Fallback, Single Source of Truth + Pre-Seed)
 *
 * Bewusst KEIN `import "server-only"` — die Datei wird in Tests verwendet
 * und der Cron könnte Permissions künftig benötigen. Session-Imports sind
 * isoliert in requirePermission/getCurrentMemberPermissions.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type {
  MemberRole,
  PermissionAction,
  PermissionOverride,
  PermissionResource,
  User,
} from "@/db/schema";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  permKey,
  type PermissionKey,
} from "./permissions-keys";

export {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  permKey,
  type PermissionKey,
} from "./permissions-keys";

export const MEMBER_ROLES: readonly MemberRole[] = [
  "gf",
  "kalkulator",
  "polier",
  "buchhaltung",
  "ingenieur",
  "bauleiter",
  "verwaltung",
  "zeichner",
  "viewer",
  "admin",
];

const ALL_KEYS: ReadonlySet<PermissionKey> = (() => {
  const s = new Set<PermissionKey>();
  for (const r of PERMISSION_RESOURCES) {
    for (const a of PERMISSION_ACTIONS) s.add(permKey(r, a));
  }
  return s;
})();

function allowSet(
  spec: Partial<Record<PermissionResource, readonly PermissionAction[]>>
): ReadonlySet<PermissionKey> {
  const s = new Set<PermissionKey>();
  for (const [res, actions] of Object.entries(spec)) {
    if (!actions) continue;
    for (const a of actions) s.add(permKey(res as PermissionResource, a));
  }
  return s;
}

/**
 * Default-Matrix. Muss in Sync mit dem Pre-Seed in
 * drizzle/0039_member_roles.sql bleiben — der Test
 * `permissions-matrix-vollstaendigkeit` prüft das.
 */
export const DEFAULT_MATRIX: Record<MemberRole, ReadonlySet<PermissionKey>> = {
  gf: ALL_KEYS,
  admin: ALL_KEYS,
  kalkulator: allowSet({
    lv: ["read", "write"],
    aufmass: ["read", "write"],
    vorgaenge: ["read", "write"],
    projekte: ["read"],
    ausgangsrechnungen: ["read"],
    nachkalk: ["read"],
    bautagebuch: ["read"],
    maengel: ["read"],
    plaene: ["read"],
  }),
  polier: allowSet({
    bautagebuch: ["read", "write"],
    stunden: ["read", "write"],
    geraete: ["read", "write"],
    plaene: ["read", "write"],
    maengel: ["read", "write"],
    projekte: ["read"],
    vorgaenge: ["read"],
    lv: ["read"],
    aufmass: ["read"],
  }),
  buchhaltung: allowSet({
    ausgangsrechnungen: ["read", "write"],
    mahnungen: ["read", "write"],
    eingangsrechnungen: ["read", "write"],
    datev: ["read", "write"],
    finanzen: ["read", "write"],
    projekte: ["read"],
    lv: ["read"],
    vorgaenge: ["read"],
    aufmass: ["read"],
    bautagebuch: ["read"],
    nachkalk: ["read"],
  }),
  viewer: allowSet({
    projekte: ["read"],
    vorgaenge: ["read"],
    bautagebuch: ["read"],
    maengel: ["read"],
    plaene: ["read"],
    geraete: ["read"],
    stunden: ["read"],
    lv: ["read"],
    aufmass: ["read"],
    ausgangsrechnungen: ["read"],
    eingangsrechnungen: ["read"],
    mahnungen: ["read"],
    nachkalk: ["read"],
    finanzen: ["read"],
    datev: ["read"],
  }),
  /* ============== Ingenieurbüro-spezifische Rollen ============== */
  ingenieur: allowSet({
    projekte: ["read", "write"],
    vorgaenge: ["read", "write"],
    bautagebuch: ["read", "write"],
    maengel: ["read", "write"],
    plaene: ["read", "write"],
    stunden: ["read", "write"],
    lv: ["read", "write"],
    aufmass: ["read"],
    ausgangsrechnungen: ["read"],
    nachkalk: ["read"],
  }),
  bauleiter: allowSet({
    projekte: ["read"],
    vorgaenge: ["read", "write"],
    bautagebuch: ["read", "write"],
    maengel: ["read", "write"],
    aufmass: ["read", "write"],
    stunden: ["read", "write"],
    plaene: ["read", "write"],
    lv: ["read"],
  }),
  verwaltung: allowSet({
    projekte: ["read"],
    vorgaenge: ["read"],
    ausgangsrechnungen: ["read", "write"],
    mahnungen: ["read", "write"],
    eingangsrechnungen: ["read", "write"],
    datev: ["read", "write"],
    finanzen: ["read", "write"],
    stunden: ["read"],
  }),
  zeichner: allowSet({
    projekte: ["read"],
    bautagebuch: ["read"],
    plaene: ["read", "write"],
    stunden: ["read", "write"],
    lv: ["read"],
    aufmass: ["read"],
  }),
};

export function parseOverrides(json: string | null | undefined): PermissionOverride[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is PermissionOverride =>
        o &&
        typeof o === "object" &&
        typeof o.resource === "string" &&
        typeof o.action === "string" &&
        typeof o.allowed === "boolean"
    );
  } catch {
    return [];
  }
}

export function serializeOverrides(overrides: PermissionOverride[]): string | null {
  return overrides.length === 0 ? null : JSON.stringify(overrides);
}

/**
 * Pure Resolver — testbar ohne DB. Erwartet eine Map mit den Matrix-Zeilen,
 * die der Aufrufer per loadWorkspaceMatrix() vorlädt.
 */
export function resolvePermission(
  user: Pick<User, "memberRole" | "permissionsOverrideJson">,
  resource: PermissionResource,
  action: PermissionAction,
  matrix: ReadonlyMap<PermissionKey, boolean>
): boolean {
  const overrides = parseOverrides(user.permissionsOverrideJson);
  for (const o of overrides) {
    if (o.resource === resource && o.action === action) return o.allowed;
  }
  const key = permKey(resource, action);
  const m = matrix.get(key);
  if (m !== undefined) return m;
  return DEFAULT_MATRIX[user.memberRole].has(key);
}

export async function loadWorkspaceMatrix(
  workspaceId: string,
  role: MemberRole
): Promise<Map<PermissionKey, boolean>> {
  const rows = await db
    .select({
      resource: schema.permissionsMatrix.resource,
      action: schema.permissionsMatrix.action,
      allowed: schema.permissionsMatrix.allowed,
    })
    .from(schema.permissionsMatrix)
    .where(
      and(
        eq(schema.permissionsMatrix.workspaceId, workspaceId),
        eq(schema.permissionsMatrix.role, role)
      )
    );
  const m = new Map<PermissionKey, boolean>();
  for (const r of rows) {
    m.set(
      permKey(r.resource as PermissionResource, r.action as PermissionAction),
      r.allowed
    );
  }
  return m;
}

export async function can(
  userId: string,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return false;
  const matrix = await loadWorkspaceMatrix(user.workspaceId, user.memberRole);
  return resolvePermission(user, resource, action, matrix);
}

export async function getUserPermissionSet(
  userId: string
): Promise<Set<PermissionKey>> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return new Set();
  const matrix = await loadWorkspaceMatrix(user.workspaceId, user.memberRole);
  const set = new Set<PermissionKey>();
  for (const r of PERMISSION_RESOURCES) {
    for (const a of PERMISSION_ACTIONS) {
      if (resolvePermission(user, r, a, matrix)) set.add(permKey(r, a));
    }
  }
  return set;
}

export class PermissionDeniedError extends Error {
  constructor(
    public readonly resource: PermissionResource,
    public readonly action: PermissionAction
  ) {
    super(`Keine Berechtigung: ${resource}:${action}`);
    this.name = "PermissionDeniedError";
  }
}

// Session-abhängige Wrapper (requirePermission, getCurrentMemberPermissions)
// liegen in `permissions-session.ts`, damit Tests und Cron permissions.ts
// importieren können, ohne next-auth/Session-Stack zu laden.
