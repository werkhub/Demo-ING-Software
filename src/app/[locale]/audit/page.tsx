import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { AUDITED_ENTITY_TYPES } from "@/lib/audit/log";
import type {
  AuditAction,
  AuditEntityType,
  AuditLog,
  User,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Anlegen",
  update: "Ändern",
  delete: "Löschen",
  read_sensitive: "Sensitiver Zugriff",
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  vorgang: "Vorgang",
  project: "Projekt",
  ausgangsrechnung: "Ausgangsrechnung",
  subcontractor: "Nachunternehmer",
  stunde: "Stunden",
  mangel: "Abnahme-Mangel",
  abnahme: "Abnahme",
  security: "Sicherheit",
};

function fmtDateTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Search = {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  action?: string;
  from?: string;
  to?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const [me] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!me || me.role !== "admin") {
    redirect("/");
  }

  const conds = [eq(schema.auditLog.workspaceId, workspaceId)];
  if (
    sp.entity_type &&
    AUDITED_ENTITY_TYPES.includes(sp.entity_type as AuditEntityType)
  ) {
    conds.push(
      eq(schema.auditLog.entityType, sp.entity_type as AuditEntityType)
    );
  }
  if (sp.entity_id) {
    conds.push(eq(schema.auditLog.entityId, sp.entity_id));
  }
  if (sp.user_id) {
    conds.push(eq(schema.auditLog.userId, sp.user_id));
  }
  if (
    sp.action &&
    (["create", "update", "delete", "read_sensitive"] as const).includes(
      sp.action as AuditAction
    )
  ) {
    conds.push(eq(schema.auditLog.action, sp.action as AuditAction));
  }
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) {
    conds.push(gte(schema.auditLog.createdAt, new Date(`${sp.from}T00:00:00Z`)));
  }
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) {
    conds.push(lte(schema.auditLog.createdAt, new Date(`${sp.to}T23:59:59Z`)));
  }

  const rows: AuditLog[] = await db
    .select()
    .from(schema.auditLog)
    .where(and(...conds))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(500);

  const users: User[] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.workspaceId, workspaceId));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <Container>
      <header className="pt-8 pb-6">
        <h1 className="text-2xl font-medium">Audit-Log</h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)] mt-1">
          Alle Mutationen an auditierten Entit&auml;ten + sensitive Lese-Zugriffe.
          Maximal 500 Treffer.
        </p>
      </header>

      <form
        method="get"
        className="grid gap-3 md:grid-cols-6 items-end pb-6 border-b border-[color:var(--color-border)]"
      >
        <label className="text-sm flex flex-col gap-1">
          <span>Entit&auml;t</span>
          <select
            name="entity_type"
            defaultValue={sp.entity_type ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          >
            <option value="">Alle</option>
            {AUDITED_ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>
                {ENTITY_LABEL[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Entity-ID</span>
          <input
            name="entity_id"
            defaultValue={sp.entity_id ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>User</span>
          <select
            name="user_id"
            defaultValue={sp.user_id ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          >
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Aktion</span>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          >
            <option value="">Alle</option>
            <option value="create">Anlegen</option>
            <option value="update">&Auml;ndern</option>
            <option value="delete">L&ouml;schen</option>
            <option value="read_sensitive">Sensitiver Zugriff</option>
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Von</span>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span>Bis</span>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1 rounded"
          />
        </label>
        <div className="md:col-span-6 flex gap-2">
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--color-foreground)] text-[color:var(--color-background)]"
          >
            Filtern
          </button>
          <Link
            href="/audit"
            className="px-3 py-1.5 text-sm rounded border border-[color:var(--color-border)]"
          >
            Zur&uuml;cksetzen
          </Link>
        </div>
      </form>

      <section className="py-6">
        {rows.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            Keine Eintr&auml;ge im gew&auml;hlten Zeitraum.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {rows.map((r) => {
              const fields = r.fieldsChangedJson
                ? (JSON.parse(r.fieldsChangedJson) as string[])
                : [];
              const u = r.userId ? userMap.get(r.userId) : null;
              return (
                <li key={r.id} className="py-3 grid gap-1 md:grid-cols-[180px_1fr] text-sm">
                  <div className="text-[color:var(--color-muted-foreground)]">
                    {fmtDateTime(r.createdAt)}
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 items-baseline">
                      <strong>{ACTION_LABEL[r.action]}</strong>
                      <span className="text-[color:var(--color-muted-foreground)]">
                        {ENTITY_LABEL[r.entityType]}
                      </span>
                      <code className="text-xs bg-[color:var(--color-muted)] px-1 rounded">
                        {r.entityId}
                      </code>
                      <span className="text-[color:var(--color-muted-foreground)]">
                        {u ? u.name : r.userId ? r.userId : "System/Cron"}
                      </span>
                      {r.ipAddr ? (
                        <span className="text-xs text-[color:var(--color-muted-foreground)]">
                          IP: {r.ipAddr}
                        </span>
                      ) : null}
                    </div>
                    {fields.length > 0 ? (
                      <div className="text-xs text-[color:var(--color-muted-foreground)] mt-1">
                        Ge&auml;nderte Felder: {fields.join(", ")}
                      </div>
                    ) : null}
                    {r.reason ? (
                      <div className="text-xs italic mt-1">
                        Begr&uuml;ndung: {r.reason}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
