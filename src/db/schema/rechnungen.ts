/**
 * UC5 — Eingangsrechnungs-Anomalie-POC. Drei Tabellen: Rechnung selbst,
 * Positionen, persistierte Anomalie-Befunde.
 */
import { pgTable, text, integer, real, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces, users } from "./core";
import { projects, subcontractors } from "./projekte";

export const rechnungen = pgTable(
  "rechnungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /**
     * Optionale Verknüpfung zum Nachunternehmer. Steuert die Bauabzug-Logik:
     * Eingangsrechnungen mit subcontractorId aktivieren den 15 %-Einbehalts-
     * Workflow nach § 48 EStG, wenn keine gültige Freistellungsbescheinigung
     * vorliegt.
     */
    subcontractorId: text("subcontractor_id").references(() => subcontractors.id, {
      onDelete: "set null",
    }),
    supplierName: text("supplier_name").notNull(),
    /** ISO YYYY-MM-DD. */
    invoiceDate: text("invoice_date"),
    dueDate: text("due_date"),
    totalNet: real("total_net"),
    totalGross: real("total_gross"),
    currency: text("currency").notNull().default("EUR"),
    status: text("status", {
      enum: ["eingegangen", "geprueft", "freigegeben", "abgelehnt"],
    })
      .notNull()
      .default("eingegangen"),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at")
      .notNull()
      .$defaultFn(() => new Date()),
    /** Repo-relativer Pfad unter storage/. */
    sourceFilePath: text("source_file_path"),
    /** 0–100, höher = mehr Anomalie-Verdacht. */
    anomalyScore: integer("anomaly_score").notNull().default(0),
    anomalyCount: integer("anomaly_count").notNull().default(0),
    /**
     * Bauabzug-Einbehalt in Cent. null = kein Bauabzug (z. B. NU mit
     * gültiger Freistellungsbescheinigung oder Nicht-NU-Rechnung). 0+ =
     * Einbehalt errechnet (15 % der Bruttosumme bei NU ohne Freistellung).
     */
    bauabzugEinbehaltCents: integer("bauabzug_einbehalt_cents"),
    /** Datum der Anmeldung beim Finanzamt (YYYY-MM-DD). */
    bauabzugAnFinanzamtAbgefuehrtAm: text(
      "bauabzug_an_finanzamt_abgefuehrt_am"
    ),
    /* ---- E-Rechnung-Eingang (Modul 4.6) ---- */
    xmlFilename: text("xml_filename"),
    xmlFormat: text("xml_format"),
    xmlValidationStatus: text("xml_validation_status").default(
      "nicht_validiert"
    ),
    xmlValidationErrorsJson: text("xml_validation_errors_json"),
    xmlExtractedJson: text("xml_extracted_json"),
    bg25LieferantName: text("bg_25_lieferant_name"),
    bg25LieferantUstId: text("bg_25_lieferant_ust_id"),
    bt2Rechnungsdatum: text("bt_2_rechnungsdatum"),
    bt5Waehrung: text("bt_5_waehrung").default("EUR"),
  },
  (t) => ({
    workspaceIdx: index("idx_rechnungen_workspace").on(t.workspaceId),
    workspaceProjectIdx: index("idx_rechnungen_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceStatusIdx: index("idx_rechnungen_workspace_status").on(
      t.workspaceId,
      t.status
    ),
    workspaceSubcontractorIdx: index(
      "idx_rechnungen_workspace_subcontractor"
    ).on(t.workspaceId, t.subcontractorId),
    bauabzugOffenIdx: index("idx_rechnungen_bauabzug_offen").on(
      t.workspaceId,
      t.bauabzugAnFinanzamtAbgefuehrtAm
    ),
  })
);

export const rechnungPositionen = pgTable(
  "rechnung_positionen",
  {
    id: text("id").primaryKey(),
    rechnungId: text("rechnung_id")
      .notNull()
      .references(() => rechnungen.id, { onDelete: "cascade" }),
    positionIndex: integer("position_index").notNull(),
    lvPosition: text("lv_position"),
    description: text("description").notNull(),
    quantity: real("quantity").notNull().default(0),
    unit: text("unit"),
    unitPrice: real("unit_price").notNull().default(0),
    totalPrice: real("total_price").notNull().default(0),
    /** JSON-Array: [{kind, severity, description}] für die Anomalie-Engine. */
    anomalyFlags: text("anomaly_flags").notNull().default("[]"),
  },
  (t) => ({
    rechnungIdx: index("idx_rechnung_positionen_rechnung").on(t.rechnungId),
    rechnungPosUnq: uniqueIndex("unq_rechnung_positionen_rechnung_index").on(
      t.rechnungId,
      t.positionIndex
    ),
  })
);

export const rechnungAnomalien = pgTable(
  "rechnung_anomalien",
  {
    id: text("id").primaryKey(),
    rechnungId: text("rechnung_id")
      .notNull()
      .references(() => rechnungen.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "price_jump",
        "not_in_contract",
        "duplicate",
        "math_error",
        "format_warning",
      ],
    }).notNull(),
    severity: text("severity", { enum: ["info", "warning", "critical"] })
      .notNull()
      .default("warning"),
    description: text("description").notNull(),
    /** JSON-Detail zum Befund (z. B. {positionIndex, expected, actual}). */
    payloadJson: text("payload_json").notNull().default("{}"),
    resolved: boolean("resolved")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    rechnungIdx: index("idx_rechnung_anomalien_rechnung").on(t.rechnungId),
  })
);
