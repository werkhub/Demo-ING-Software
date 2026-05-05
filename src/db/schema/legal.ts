/**
 * Workspace-übergreifende Inhalte: Gesetzestexte, Urteile, Lizenzen.
 * Die einzige Domain ohne workspaceId — diese Daten sind global verfügbar
 * (BGB/HOAI sind amtliche Werke, VOB-Paraphrasen frei lizenziert).
 */
import { pgTable, text, integer, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces, users } from "./core";

export const legalChunks = pgTable(
  "legal_chunks",
  {
    id: text("id").primaryKey(),
    source: text("source", {
      enum: ["bgb", "hoai", "vob_a", "vob_b", "vob_c"],
    }).notNull(),
    slug: text("slug").notNull(),
    ref: text("ref").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    /**
     * Frei nutzbarer Inhalt (Paraphrase bei VOB, Volltext bei BGB/HOAI).
     * Wird IMMER angezeigt, wenn keine Lizenz aktiv ist.
     */
    content: text("content").notNull(),
    /**
     * Lizenzpflichtiger Volltext (z. B. VOB-Volltext nach DIN-Media-Lizenz).
     * Nur befüllt + sichtbar, wenn Workspace eine passende Lizenz hat.
     */
    licensedContent: text("licensed_content"),
    licensedSourceId: text("licensed_source_id"),
    orderIdx: integer("order_idx").notNull(),
  },
  (t) => ({
    sourceIdx: index("idx_legal_chunks_source").on(t.source),
    sourceSlugUnq: uniqueIndex("unq_legal_chunks_source_slug").on(t.source, t.slug),
  })
);

/**
 * Plattform-Lizenzen für lizenzpflichtige Inhalte.
 * Heute leer; wird befüllt, sobald ein DIN-Media-Vertrag o. Ä. abgeschlossen ist.
 */
export const licensedSources = pgTable("licensed_sources", {
  id: text("id").primaryKey(),
  provider: text("provider", { enum: ["din_media", "juris", "beck_online"] }).notNull(),
  product: text("product").notNull(),
  validFrom: text("valid_from"),
  validUntil: text("valid_until"),
  status: text("status", { enum: ["active", "expired", "draft"] })
    .notNull()
    .default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Audit-Log pro Volltext-Aufruf (Compliance-Anforderung typischer DIN-Verträge).
 * Aktiviert sich automatisch, sobald ein Workspace eine Lizenz hat.
 */
export const licensedAccessLog = pgTable(
  "licensed_access_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    chunkId: text("chunk_id").notNull(),
    licensedSourceId: text("licensed_source_id"),
    viewedAt: timestamp("viewed_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceViewedIdx: index("idx_licensed_access_workspace_viewed").on(
      t.workspaceId,
      sql`${t.viewedAt} DESC`
    ),
  })
);

/**
 * Gerichtsentscheidungen aus dem ECLI-Index der BMJ.
 * Quelle: rechtsprechung-im-internet.de (offizieller DG_JUSTICE_CRAWLER-Endpoint)
 *
 * Speichert nur Metadaten + Titel. Volltexte sind auf der Quell-URL einsehbar
 * (sourceUrl). Leitsätze und Tenor sind als amtliches Werk gemeinfrei (§ 5 UrhG);
 * eine Volltext-Übernahme würde aber separate rechtliche Prüfung pro Verlag erfordern.
 */
export const caseDecisions = pgTable(
  "case_decisions",
  {
    id: text("id").primaryKey(),
    ecli: text("ecli").notNull().unique(),
    court: text("court").notNull(),
    courtKind: text("court_kind", {
      enum: ["BGH", "BVerfG", "BAG", "BFH", "BSG", "BVerwG", "OLG", "OVG", "LG", "AG", "andere"],
    }).notNull(),
    senate: text("senate"),
    az: text("az").notNull(),
    date: text("date").notNull(),
    decisionType: text("decision_type"),
    title: text("title").notNull(),
    sourceUrl: text("source_url").notNull(),
    fetchedAt: timestamp("fetched_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    courtKindDateIdx: index("idx_cases_court_date").on(
      t.courtKind,
      sql`${t.date} DESC`
    ),
    senateIdx: index("idx_cases_senate").on(t.senate),
    azIdx: index("idx_cases_az").on(t.az),
  })
);

export const LEGAL_SOURCE_META: Record<
  "bgb" | "hoai" | "vob_a" | "vob_b" | "vob_c",
  { title: string; subtitle: string; status: "frei" | "lizenziert"; basis: string }
> = {
  bgb: {
    title: "BGB §§ 631–650v",
    subtitle: "Werkvertrag und Bauvertragsrecht",
    status: "frei",
    basis: "Bundesgesetz · amtliches Werk · § 5 UrhG · gesetze-im-internet.de",
  },
  hoai: {
    title: "HOAI 2021",
    subtitle: "Honorarordnung für Architekten und Ingenieure",
    status: "frei",
    basis: "Bundesrechtsverordnung · amtliches Werk · § 5 UrhG",
  },
  vob_a: {
    title: "VOB/A",
    subtitle:
      "Allgemeine Bestimmungen für die Vergabe von Bauleistungen — Abschnitte 1 (national), 2 (EU) und 3 (Sektoren)",
    status: "lizenziert",
    basis: "DIN 1960 · DIN Media · paraphrasierte Zusammenfassungen (Volltext via Pro-Lizenz)",
  },
  vob_b: {
    title: "VOB/B",
    subtitle: "Allgemeine Vertragsbedingungen für die Ausführung von Bauleistungen",
    status: "lizenziert",
    basis: "DIN 1961 · DIN Media · paraphrasierte Zusammenfassungen (Volltext via Pro-Lizenz)",
  },
  vob_c: {
    title: "VOB/C",
    subtitle:
      "Allgemeine Technische Vertragsbedingungen für Bauleistungen — DIN 18299 + ATV DIN 18300–18459",
    status: "lizenziert",
    basis: "DIN-Normenreihe · DIN Media · paraphrasierte Zusammenfassungen (Volltext via Pro-Lizenz)",
  },
};
