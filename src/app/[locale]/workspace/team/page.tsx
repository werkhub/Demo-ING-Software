import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import {
  can,
  parseOverrides,
} from "@/lib/auth/permissions";
import { MEMBER_ROLE_META } from "@/lib/auth/member-role-meta";
import { RoleSelect } from "./role-select";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const canRead = await can(userId, "team", "read");
  if (!canRead) {
    redirect("/workspace");
  }
  const canWrite = await can(userId, "team", "write");
  const canEditMatrix = await can(userId, "permissions", "write");

  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.workspaceId, workspaceId))
    .orderBy(asc(schema.users.name));

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Workspace · Team
        </p>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
              Rollen &amp; Permissions
            </h1>
            <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
              Domain-Rolle pro User legt fest, welche Module schreibend
              zugänglich sind. Permissions-Matrix (Geschäftsleitung) erlaubt
              Feintuning auf Resource-Action-Ebene.
            </p>
          </div>
          {canEditMatrix ? (
            <Link
              href="/workspace/team/permissions"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Permissions-Matrix bearbeiten <span aria-hidden>→</span>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-16">
        {users.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            Keine User im Workspace.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {users.map((u) => {
              const overrides = parseOverrides(u.permissionsOverrideJson);
              const initials = u.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("");
              return (
                <li key={u.id} className="py-5 flex items-center gap-5">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] grid place-items-center text-xs font-mono font-semibold text-[color:var(--color-fg-muted)] shrink-0">
                    {initials || "·"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-[color:var(--color-fg-muted)] mt-1 truncate">
                      {u.email}
                      {u.roleLabel ? ` · ${u.roleLabel}` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
                      {MEMBER_ROLE_META[u.memberRole].tagline}
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                    {overrides.length > 0 ? (
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-1.5 py-0.5"
                        title={overrides
                          .map(
                            (o) =>
                              `${o.resource}:${o.action} = ${o.allowed ? "allow" : "deny"}`
                          )
                          .join("\n")}
                      >
                        {overrides.length} Override
                        {overrides.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      Auth: {u.role}
                    </span>
                  </div>
                  <div className="shrink-0 w-44">
                    {canWrite ? (
                      <RoleSelect
                        userId={u.id}
                        currentRole={u.memberRole}
                        disabled={u.id === userId}
                      />
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        {MEMBER_ROLE_META[u.memberRole].label}
                      </span>
                    )}
                    {canWrite && u.id === userId ? (
                      <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
                        Eigene Rolle nicht änderbar.
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-fg-muted)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Hinweis
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Die Domain-Rolle wirkt sofort auf Sidebar und Server-Actions.
            Auth-Rolle (admin/user/viewer/guest) bleibt unverändert — sie steuert
            Login und Lizenz, nicht Domain-Permissions.
          </p>
        </div>
      </section>
    </Container>
  );
}
