/**
 * UC1 — "Vorgang" als zentrale Akte. Bündelt End-to-End-Workflow vom eingehenden
 * Dokument bis zum versendeten E-Mail-Entwurf inkl. Analyse-Steps, Citations,
 * Drafts, Audit-Log und generischer Cross-Domain-Verlinkung.
 */
import { pgTable, text, integer, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces, users } from "./core";
import { projects } from "./projekte";

export const vorgaenge = pgTable(
  "vorgaenge",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    /**
     * Kategorie steuert Vorlagen, Quick-Action-Vorschläge und KI-Prompt.
     *   maengelruege   = eingehende Rüge / abzuwehrende oder zu erteilende Rüge
     *   anlieferung    = Lieferschein / Bedenkenanzeige zur Vorleistung
     *   vertragspflicht= Vertragsbruch, Pönalen, Anordnung-Bezug
     *   sonstiges      = generischer Vorgang (Default vor Klassifikation)
     */
    category: text("category", {
      enum: ["maengelruege", "anlieferung", "vertragspflicht", "sonstiges"],
    })
      .notNull()
      .default("sonstiges"),
    status: text("status", {
      enum: [
        "offen",
        "in_bearbeitung",
        "wartet_auf_anwalt",
        "abgeschlossen",
        "archiviert",
      ],
    })
      .notNull()
      .default("offen"),
    /** 0–100 — aggregiert aus Frist-Druck, Kategorie-Schwere, Anzahl Cites. */
    riskScore: integer("risk_score").notNull().default(0),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedTo: text("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    /** ISO YYYY-MM-DD — interne Bearbeitungs-/Antwortfrist (≠ rechtliche Frist). */
    dueDate: text("due_date"),
    /**
     * Vorgang ist HinSchG-bezogen (Hinweisgeberschutz, § 11 HinSchG).
     * Schaltet Sensitive-Read-Logging im Detail-View und reduziert
     * sichtbare Felder im Listing für Nicht-Compliance-User. Default false.
     */
    hinschg: boolean("hinschg")
      .notNull()
      .default(false),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_vorgaenge_workspace").on(t.workspaceId),
    workspaceProjectIdx: index("idx_vorgaenge_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceStatusIdx: index("idx_vorgaenge_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceCategoryIdx: index("idx_vorgaenge_workspace_category").on(
      t.workspaceId,
      t.category
    ),
    workspaceCreatedIdx: index("idx_vorgaenge_workspace_created").on(
      t.workspaceId,
      sql`${t.createdAt} DESC`
    ),
  })
);

export const vorgangDocuments = pgTable(
  "vorgang_documents",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    /** Repo-relativer Pfad unter storage/ (kein S3 im POC, siehe Prompt G). */
    storagePath: text("storage_path").notNull(),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at")
      .notNull()
      .$defaultFn(() => new Date()),
    /** Plaintext nach OCR/Extraktion — befüllt erst, wenn KI-Pipeline angeschlossen wird. */
    ocrText: text("ocr_text"),
  },
  (t) => ({
    vorgangIdx: index("idx_vorgang_documents_vorgang").on(t.vorgangId),
  })
);

export const vorgangAnalysisSteps = pgTable(
  "vorgang_analysis_steps",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    /** 0-basierter Index für Reihenfolge im Empfehlungs-Flow. */
    stepIndex: integer("step_index").notNull(),
    kind: text("kind", {
      enum: ["klassifikation", "recherche", "empfehlung"],
    }).notNull(),
    /** JSON-serialisiertes Step-Payload (Modell-Antwort, Tool-Outputs, …). */
    payloadJson: text("payload_json").notNull().default("{}"),
    /** JSON-Array von Citation-Refs ([{kind, ref, snippet}]). */
    citations: text("citations").notNull().default("[]"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    vorgangIdx: index("idx_vorgang_steps_vorgang").on(t.vorgangId),
    vorgangStepIdx: uniqueIndex("unq_vorgang_steps_vorgang_step").on(
      t.vorgangId,
      t.stepIndex
    ),
  })
);

export const vorgangCitations = pgTable(
  "vorgang_citations",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind", {
      enum: ["bgb", "hoai", "vob", "urteil", "intern"],
    }).notNull(),
    /** Z. B. "§ 13 Abs. 5 VOB/B" oder ECLI bzw. interner Vorgang-Slug. */
    sourceRef: text("source_ref").notNull(),
    sourceText: text("source_text"),
    /** Optionaler Cursor-Position-Hinweis im Eingangsdokument. */
    positionInDoc: integer("position_in_doc"),
  },
  (t) => ({
    vorgangIdx: index("idx_vorgang_citations_vorgang").on(t.vorgangId),
  })
);

export const vorgangDrafts = pgTable(
  "vorgang_drafts",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["email", "brief"] })
      .notNull()
      .default("email"),
    recipientEmail: text("recipient_email"),
    subject: text("subject").notNull().default(""),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    status: text("status", { enum: ["entwurf", "gesendet", "verworfen"] })
      .notNull()
      .default("entwurf"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    vorgangIdx: index("idx_vorgang_drafts_vorgang").on(t.vorgangId),
  })
);

export const vorgangAuditLog = pgTable(
  "vorgang_audit_log",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Kurz-Aktion ("created", "status_changed", "draft_sent", …). */
    action: text("action").notNull(),
    /** JSON mit Diff/Payload für die jeweilige Aktion. */
    payloadJson: text("payload_json").notNull().default("{}"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    vorgangCreatedIdx: index("idx_vorgang_audit_vorgang_created").on(
      t.vorgangId,
      sql`${t.createdAt} DESC`
    ),
  })
);

export const vorgangLinks = pgTable(
  "vorgang_links",
  {
    id: text("id").primaryKey(),
    vorgangId: text("vorgang_id")
      .notNull()
      .references(() => vorgaenge.id, { onDelete: "cascade" }),
    targetKind: text("target_kind", {
      enum: ["project", "contract", "bautagebuch", "frist", "vorgang", "rechnung"],
    }).notNull(),
    /** Generische Ziel-ID — Auflösung erfolgt anwendungsseitig. */
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    vorgangIdx: index("idx_vorgang_links_vorgang").on(t.vorgangId),
    targetIdx: index("idx_vorgang_links_target").on(t.targetKind, t.targetId),
    uniqueLinkIdx: uniqueIndex("unq_vorgang_link").on(
      t.vorgangId,
      t.targetKind,
      t.targetId
    ),
  })
);
