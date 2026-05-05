import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import {
  DEFAULT_MATRIX,
  MEMBER_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  can,
  permKey,
} from "@/lib/auth/permissions";
import type {
  MemberRole,
  PermissionAction,
  PermissionResource,
} from "@/db/schema";
import { MatrixEditor } from "./matrix-editor";

export const dynamic = "force-dynamic";

type CellKey = `${MemberRole}:${PermissionResource}:${PermissionAction}`;

export default async function PermissionsMatrixPage() {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const allowed = await can(userId, "permissions", "write");
  if (!allowed) {
    redirect("/workspace/team");
  }

  const rows = await db
    .select({
      role: schema.permissionsMatrix.role,
      resource: schema.permissionsMatrix.resource,
      action: schema.permissionsMatrix.action,
      allowed: schema.permissionsMatrix.allowed,
    })
    .from(schema.permissionsMatrix)
    .where(eq(schema.permissionsMatrix.workspaceId, workspaceId));

  const dbMap = new Map<CellKey, boolean>();
  for (const r of rows) {
    dbMap.set(
      `${r.role as MemberRole}:${r.resource as PermissionResource}:${r.action as PermissionAction}`,
      r.allowed
    );
  }

  const initial: Record<CellKey, boolean> = {} as Record<CellKey, boolean>;
  const defaults: Record<CellKey, boolean> = {} as Record<CellKey, boolean>;

  for (const role of MEMBER_ROLES) {
    for (const resource of PERMISSION_RESOURCES) {
      for (const action of PERMISSION_ACTIONS) {
        const key: CellKey = `${role}:${resource}:${action}`;
        const def = DEFAULT_MATRIX[role].has(permKey(resource, action));
        defaults[key] = def;
        const dbVal = dbMap.get(key);
        initial[key] = dbVal !== undefined ? dbVal : def;
      }
    }
  }

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Workspace · Permissions-Matrix
        </p>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              Rollen × Resourcen
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
              Jede Zelle steuert, ob die Rolle die Resource lesen oder
              schreiben darf. Abweichungen vom Default sind farbig markiert.
              User-Overrides (auf Einzelpersonen) schlagen die Matrix.
            </p>
          </div>
          <Link
            href="/workspace/team"
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 py-2"
          >
            ← zurück zum Team
          </Link>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
        <MatrixEditor initial={initial} defaults={defaults} />
      </section>
    </Container>
  );
}
