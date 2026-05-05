/**
 * NU-Operations — Aufträge, Eingangsrechnungen, Sicherheiten-Konto.
 *
 * Erweitert das NU-Modul (0012 Compliance, 0008 Stammdaten) um die
 * operative Auftragsabwicklung Hauptunternehmer ↔ Subunternehmer.
 *
 * State-Machine NU-Auftrag:
 *   offen → laufend → fertig
 *                  ↘ gekuendigt
 *
 * State-Machine NU-Eingangsrechnung:
 *   eingegangen → geprueft → gezahlt
 *                         ↘ strittig
 */
import { pgTable, text, integer, real, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects, subcontractors } from "./projekte";

export const nuAuftraege = pgTable(
  "nu_auftraege",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    nuId: text("nu_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "cascade" }),
    projektId: text("projekt_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    auftragsnr: text("auftragsnr").notNull(),
    /** ISO-Date YYYY-MM-DD. */
    auftragsdatum: text("auftragsdatum").notNull(),
    gewerk: text("gewerk"),
    auftragssummeNettoCents: integer("auftragssumme_netto_cents")
      .notNull()
      .default(0),
    ustSatzPct: real("ust_satz_pct").notNull().default(19),
    vertragstyp: text("vertragstyp", {
      enum: ["vob", "bgb", "werkvertrag"],
    })
      .notNull()
      .default("vob"),
    sicherheitseinbehaltPct: real("sicherheitseinbehalt_pct")
      .notNull()
      .default(0),
    gewaehrleistungseinbehaltPct: real("gewaehrleistungseinbehalt_pct")
      .notNull()
      .default(0),
    vertragsstrafePct: real("vertragsstrafe_pct").notNull().default(0),
    leistungsBeginn: text("leistungs_beginn"),
    leistungsEnde: text("leistungs_ende"),
    status: text("status", {
      enum: ["offen", "laufend", "fertig", "gekuendigt"],
    })
      .notNull()
      .default("offen"),
    /** Wann zuletzt eine Compliance-Warnung versendet wurde — Idempotenz. */
    complianceWarnungVersendetAm: timestamp("compliance_warnung_versendet_am"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_nu_auftraege_workspace").on(t.workspaceId),
    nuIdx: index("idx_nu_auftraege_nu").on(t.workspaceId, t.nuId),
    projektIdx: index("idx_nu_auftraege_projekt").on(t.workspaceId, t.projektId),
    nrUnique: uniqueIndex("idx_nu_auftraege_nr_unique").on(
      t.workspaceId,
      t.auftragsnr
    ),
  })
);

export const nuAuftraegeLv = pgTable(
  "nu_auftraege_lv",
  {
    id: text("id").primaryKey(),
    nuAuftragId: text("nu_auftrag_id")
      .notNull()
      .references(() => nuAuftraege.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    posNr: text("pos_nr").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    menge: real("menge").notNull(),
    einheit: text("einheit").notNull(),
    einzelpreisCents: integer("einzelpreis_cents").notNull(),
    gesamtpreisCents: integer("gesamtpreis_cents").notNull(),
    /** Optional: Verknüpfung zu LV-Position (Modul 0017) für Nachkalkulation. */
    lvPositionId: text("lv_position_id"),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    auftragIdx: index("idx_nu_lv_auftrag").on(t.nuAuftragId),
  })
);

export const nuEingangsrechnungen = pgTable(
  "nu_eingangsrechnungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    nuAuftragId: text("nu_auftrag_id")
      .notNull()
      .references(() => nuAuftraege.id, { onDelete: "cascade" }),
    rechnungsnr: text("rechnungsnr").notNull(),
    /** ISO-Date YYYY-MM-DD. */
    rechnungsdatum: text("rechnungsdatum").notNull(),
    bruttoCents: integer("brutto_cents").notNull(),
    nettoCents: integer("netto_cents").notNull(),
    ustCents: integer("ust_cents").notNull().default(0),
    einbehaltSicherheitCents: integer("einbehalt_sicherheit_cents")
      .notNull()
      .default(0),
    einbehaltGewaehrleistungCents: integer("einbehalt_gewaehrleistung_cents")
      .notNull()
      .default(0),
    einbehaltSkontoCents: integer("einbehalt_skonto_cents")
      .notNull()
      .default(0),
    /** Verknüpfung zu Modul 4.5 (§48 EStG): Bauabzug 15%. */
    bauabzugEinbehaltCents: integer("bauabzug_einbehalt_cents")
      .notNull()
      .default(0),
    ausgezahltCents: integer("ausgezahlt_cents").notNull().default(0),
    zahlungsdatum: text("zahlungsdatum"),
    status: text("status", {
      enum: ["eingegangen", "geprueft", "gezahlt", "strittig"],
    })
      .notNull()
      .default("eingegangen"),
    freigabeDurch: text("freigabe_durch"),
    freigabeAm: timestamp("freigabe_am"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_nu_rechnungen_workspace").on(t.workspaceId),
    auftragIdx: index("idx_nu_rechnungen_auftrag").on(
      t.workspaceId,
      t.nuAuftragId
    ),
    statusIdx: index("idx_nu_rechnungen_status").on(t.workspaceId, t.status),
    nrUnique: uniqueIndex("idx_nu_rechnungen_nr_unique").on(
      t.workspaceId,
      t.nuAuftragId,
      t.rechnungsnr
    ),
  })
);

export const nuSicherheitsKonto = pgTable(
  "nu_sicherheits_konto",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    nuAuftragId: text("nu_auftrag_id")
      .notNull()
      .references(() => nuAuftraege.id, { onDelete: "cascade" }),
    sourceRechnungId: text("source_rechnung_id"),
    art: text("art", { enum: ["vertragserfuellung", "gewaehrleistung"] })
      .notNull(),
    einbehaltenerBetragCents: integer("einbehaltener_betrag_cents").notNull(),
    zinssatzPct: real("zinssatz_pct").default(0),
    /** ISO-Date — wann fällt der Einbehalt zur Rückgabe an. */
    faelligAm: text("faellig_am"),
    freigegebenAm: timestamp("freigegeben_am"),
    freigabeBetragCents: integer("freigabe_betrag_cents").default(0),
    /** ISO-Date — Datum der Buchung (entspricht Rechnungsdatum). */
    buchungDatum: text("buchung_datum").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_nu_konto_workspace").on(t.workspaceId),
    auftragIdx: index("idx_nu_konto_auftrag").on(t.nuAuftragId),
    faelligIdx: index("idx_nu_konto_faellig").on(t.workspaceId, t.faelligAm),
  })
);
