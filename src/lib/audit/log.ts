// Bewusst kein "server-only" — wird auch aus Cron-CLI (tsx) und in Tests
// (Vitest, in-memory DB) aufgerufen. Schutz gegen Client-Bundling läuft
// über transitive DB-Imports (better-sqlite3 = Node-only).
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import type { AuditAction, AuditEntityType } from "@/db/schema";

/**
 * Liste aller auditierten Entity-Types — synchron mit
 *   - drizzle/0038_audit_log_dsgvo.sql (CHECK-Constraint)
 *   - src/db/schema/audit.ts (enum)
 * Beim Hinzufügen einer neuen Entity ALLE drei Stellen pflegen.
 */
export const AUDITED_ENTITY_TYPES: readonly AuditEntityType[] = [
  "vorgang",
  "project",
  "ausgangsrechnung",
  "subcontractor",
  "stunde",
  "mangel",
  "abnahme",
  "security",
] as const;

export type AuditContext = {
  userId: string | null;
  ipAddr: string | null;
  userAgent: string | null;
};

/**
 * Liest Request-Metadaten (User-ID/IP/UA) für den Audit-Eintrag.
 *
 * Funktioniert nur im Server-Action-/Route-Context, in dem `next/headers`
 * verfügbar ist. Aus Cron-/Test-Kontext gerufen, gibt die Funktion ein
 * leeres Context-Objekt zurück — der Audit-Eintrag wird trotzdem
 * geschrieben, aber ohne IP/UA.
 *
 * userId muss vom Caller mitgegeben werden, weil session-Auflösung
 * im Cron-Kontext nicht greift.
 */
export async function getAuditContext(
  userId: string | null
): Promise<AuditContext> {
  let ipAddr: string | null = null;
  let userAgent: string | null = null;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    // x-forwarded-for kann eine Komma-Liste sein — erstes Element ist
    // der ursprüngliche Client (vor Reverse-Proxies).
    const xff = h.get("x-forwarded-for");
    ipAddr =
      (xff ? xff.split(",")[0]?.trim() : null) ||
      h.get("x-real-ip") ||
      null;
    userAgent = h.get("user-agent");
  } catch {
    // Cron / Tests: keine Header-Quelle.
  }
  return { userId, ipAddr, userAgent };
}

/**
 * Vergleicht zwei Snapshots und gibt die Liste der Felder zurück, deren
 * Wert sich geändert hat. Datums-Objekte werden über getTime() verglichen,
 * Objekte/Arrays über JSON.stringify (stabil, aber order-sensitiv —
 * bewusste Trade-off, da Drizzle-Reads keine Reihenfolge umsortieren).
 */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): string[] {
  if (!before && !after) return [];
  if (!before) return Object.keys(after ?? {});
  if (!after) return Object.keys(before ?? {});
  const keys = new Set<string>([
    ...Object.keys(before),
    ...Object.keys(after),
  ]);
  const changed: string[] = [];
  for (const k of keys) {
    const a = (before as Record<string, unknown>)[k];
    const b = (after as Record<string, unknown>)[k];
    if (a === b) continue;
    if (a instanceof Date && b instanceof Date) {
      if (a.getTime() === b.getTime()) continue;
      changed.push(k);
      continue;
    }
    if (
      (a === null || a === undefined) &&
      (b === null || b === undefined)
    ) {
      continue;
    }
    if (typeof a === "object" || typeof b === "object") {
      try {
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
      } catch {
        // Zyklen o. ä. — als geändert behandeln.
      }
    }
    changed.push(k);
  }
  return changed;
}

/**
 * JSON-Serialisierung für Snapshots. Date → ISO-String. null bleibt null.
 * Reicht für unsere Drizzle-Row-Shapes (keine Funktionen, keine Zyklen).
 */
function serializeSnapshot(
  snapshot: Record<string, unknown> | null | undefined
): string | null {
  if (!snapshot) return null;
  return JSON.stringify(snapshot, (_, v) => {
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

export type LogChangeOpts = {
  workspaceId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: Exclude<AuditAction, "read_sensitive">;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ctx?: AuditContext | null;
  reason?: string | null;
};

/**
 * Schreibt einen create/update/delete-Audit-Eintrag.
 *
 * Diff: für `update` werden nur die geänderten Feldnamen in
 * `fields_changed_json` gespeichert; before/after halten die vollen
 * Snapshots, damit Detail-Restore möglich bleibt.
 *
 * Schreibt auch dann, wenn fields_changed leer ist — das fängt
 * Edge-Cases (z. B. Re-Save ohne Änderung) und hält den Audit-Trail
 * vollständig.
 */
export async function logChange(opts: LogChangeOpts): Promise<void> {
  const fieldsChanged =
    opts.action === "update"
      ? diffFields(opts.before, opts.after)
      : null;

  await db.insert(schema.auditLog).values({
    id: genId("al"),
    workspaceId: opts.workspaceId,
    entityType: opts.entityType,
    entityId: opts.entityId,
    action: opts.action,
    userId: opts.ctx?.userId ?? null,
    ipAddr: opts.ctx?.ipAddr ?? null,
    userAgent: opts.ctx?.userAgent ?? null,
    beforeJson:
      opts.action === "create" ? null : serializeSnapshot(opts.before),
    afterJson:
      opts.action === "delete" ? null : serializeSnapshot(opts.after),
    fieldsChangedJson: fieldsChanged
      ? JSON.stringify(fieldsChanged)
      : null,
    reason: opts.reason ?? null,
  });
}

export type LogReadOpts = {
  workspaceId: string;
  entityType: AuditEntityType;
  entityId: string;
  ctx?: AuditContext | null;
  reason?: string | null;
};

/**
 * Schreibt einen read_sensitive-Audit-Eintrag.
 *
 * Aufrufer muss vorher prüfen, ob die Entity tatsächlich sensitiv ist
 * (vorgaenge.hinschg=true bzw. projects.vertraulich=true) — der Helper
 * selbst prüft das nicht (kein zusätzlicher DB-Read pro Page-Load).
 */
export async function logRead(opts: LogReadOpts): Promise<void> {
  await db.insert(schema.auditLog).values({
    id: genId("al"),
    workspaceId: opts.workspaceId,
    entityType: opts.entityType,
    entityId: opts.entityId,
    action: "read_sensitive",
    userId: opts.ctx?.userId ?? null,
    ipAddr: opts.ctx?.ipAddr ?? null,
    userAgent: opts.ctx?.userAgent ?? null,
    beforeJson: null,
    afterJson: null,
    fieldsChangedJson: null,
    reason: opts.reason ?? null,
  });
}
