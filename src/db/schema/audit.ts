/**
 * Modul 4.7 — Voll-Audit-Log über alle DSGVO/Compliance-relevanten Tabellen.
 *
 * Jede Server-Action ruft `logChange` (für create/update/delete) bzw.
 * `logRead` (für read_sensitive). Kein DB-Trigger — ist drizzle-fremd und
 * für Diff-Snapshots schwer maintainbar.
 *
 * `before_json` / `after_json` sind serialisierte Snapshots (oder null bei
 * create / delete). `fields_changed_json` wird parallel als JSON-Array
 * geschrieben, damit Filter „welcher Feldname wurde geändert" ohne
 * JSON-Extract auf der App-Seite möglich sind.
 *
 * Sensitive-Reads werden nur bei HinSchG-Vorgang (`vorgaenge.hinschg=true`)
 * oder vertraulichem Projekt (`projects.vertraulich=true`) geschrieben —
 * das normale Listing erzeugt keine Audit-Spam-Last.
 */
import { pgTable, text, integer, index, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type", {
      enum: [
        "vorgang",
        "project",
        "ausgangsrechnung",
        "subcontractor",
        "stunde",
        "mangel",
        "abnahme",
        "security",
      ],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action", {
      enum: ["create", "update", "delete", "read_sensitive"],
    }).notNull(),
    /** Auslöser; null bei Cron / System-Anonymisierung. */
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipAddr: text("ip_addr"),
    userAgent: text("user_agent"),
    /** Snapshot vor der Mutation; null bei create / read_sensitive. */
    beforeJson: text("before_json"),
    /** Snapshot nach der Mutation; null bei delete / read_sensitive. */
    afterJson: text("after_json"),
    /** JSON-Array mit geänderten Feldnamen; null bei create / delete / read_sensitive. */
    fieldsChangedJson: text("fields_changed_json"),
    /** Optionale Begründung — Pflicht-Feld für DSGVO-Lösch-/Anonymisierungs-Aktionen. */
    reason: text("reason"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    entityIdx: index("idx_audit_log_entity").on(
      t.entityType,
      t.entityId,
      t.createdAt
    ),
    userIdx: index("idx_audit_log_user").on(t.userId, t.createdAt),
    workspaceIdx: index("idx_audit_log_workspace_created").on(
      t.workspaceId,
      t.createdAt
    ),
  })
);

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type AuditEntityType = AuditLog["entityType"];
export type AuditAction = AuditLog["action"];
