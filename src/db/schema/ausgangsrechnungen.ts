/**
 * Ausgangsrechnungen — Abschlags- und Schlussrechnung.
 *
 *   § 16 VOB/B    — Zahlung (Abschlag, Schluss, Sicherheitseinbehalt, Skonto)
 *   § 14 VOB/B    — Schlussrechnung
 *   § 632a BGB    — Abschlagszahlungen
 *   § 650g BGB    — Schlussrechnung BGB-Werkvertrag
 *   § 14 UStG     — Pflichtangaben einer Rechnung
 *
 * Rechnungsnummern sind workspace-weit fortlaufend, eindeutig, unveränderbar
 * (Steuerrecht). Format: AR-YYYY-NNNN.
 */
import { pgTable, text, integer, real, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";
import { projects } from "./projekte";
import { lv, lvItems } from "./lv";
import { aufmass, aufmassZeilen } from "./aufmass";

export const ausgangsrechnungen = pgTable(
  "ausgangsrechnungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Optional: LV-Bezug (kann null sein bei Rechnungen ohne LV). */
    lvId: text("lv_id").references(() => lv.id, { onDelete: "set null" }),
    /** Optional: Aufmaß-Quelle (kann null sein bei manueller Rechnung). */
    aufmassId: text("aufmass_id").references(() => aufmass.id, {
      onDelete: "set null",
    }),
    /** Workspace-weit eindeutige fortlaufende Rechnungsnummer (AR-YYYY-NNNN). */
    number: text("number").notNull(),
    kind: text("kind", { enum: ["abschlag", "schluss"] }).notNull(),
    /** 1, 2, 3 ... bei Abschlag; null bei Schluss. */
    abschlagNo: integer("abschlag_no"),
    invoiceDate: text("invoice_date").notNull(),
    serviceStart: text("service_start"),
    serviceEnd: text("service_end"),
    dueDate: text("due_date"),
    /** Skonto-Konditionen: z. B. 2 % bei Zahlung in 10 Tagen. */
    skontoPercent: real("skonto_percent"),
    skontoDays: integer("skonto_days"),
    vatPercent: real("vat_percent").notNull().default(19),
    /* ---- Snapshots Stammdaten (§ 14 UStG) ---- */
    partyAg: text("party_ag"),
    partyAgAddress: text("party_ag_address"),
    partyAn: text("party_an"),
    partyAnAddress: text("party_an_address"),
    /** Steuernummer (§ 14 IV Nr. 2 UStG). */
    partyAnTaxId: text("party_an_tax_id"),
    /** USt-IdNr. (alternativ bei innergem. Lieferung). */
    partyAnVatId: text("party_an_vat_id"),
    /**
     * USt-IdNr. des Empfängers — Pflicht bei Reverse-Charge zur Identifikation
     * des Steuerschuldners (§ 14a IV UStG).
     */
    recipientVatId: text("recipient_vat_id"),
    /**
     * Empfänger ist selbst Bauunternehmer i. S. v. § 13b UStG (zweite RC-
     * Voraussetzung neben Bauleistung). Vom User explizit zu setzen.
     */
    recipientIsBauunternehmer: boolean("recipient_is_bauunternehmer")
      .notNull()
      .default(false),
    /**
     * Reverse-Charge-Modus: kein USt-Ausweis, Pflichthinweis "Steuer-
     * schuldnerschaft des Leistungsempfängers" (§ 13b UStG, § 14a V UStG).
     */
    reverseCharge: boolean("reverse_charge")
      .notNull()
      .default(false),
    /** Begründung für RC-Aktivierung — Klartext, in der Rechnung sichtbar. */
    reverseChargeGrund: text("reverse_charge_grund"),
    subjectLine: text("subject_line"),
    /* ---- Beträge ---- */
    /** Summe aller vorherigen Abschlagsrechnungen (manuell oder berechnet). */
    previousAbschlaegeNet: real("previous_abschlaege_net")
      .notNull()
      .default(0),
    /** Sicherheitseinbehalt in Prozent — Snapshot von projects.securityRetentionPercent. */
    securityRetentionPercent: real("security_retention_percent"),
    securityRetentionAmount: real("security_retention_amount")
      .notNull()
      .default(0),
    /** Summe der Positionen (vor Abzug Voraus + Sicherheit). */
    totalPositionsNet: real("total_positions_net").notNull().default(0),
    /** Auszuzahlender Betrag netto (nach Abzug Voraus + Sicherheit). */
    payoutNet: real("payout_net").notNull().default(0),
    payoutVat: real("payout_vat").notNull().default(0),
    payoutGross: real("payout_gross").notNull().default(0),
    status: text("status", {
      enum: [
        "entwurf",
        "versendet",
        "teilweise_bezahlt",
        "bezahlt",
        "mahnung_1",
        "mahnung_2",
        "mahnung_3",
        "gerichtlich",
      ],
    })
      .notNull()
      .default("entwurf"),
    sentAt: timestamp("sent_at"),
    paidAt: timestamp("paid_at"),
    paidAmount: real("paid_amount"),
    /** § 16 III S. 6 VOB/B Schlusszahlungs-Vorbehalt-Text (bei Bestreitung). */
    schlusszahlungsVorbehalt: text("schlusszahlungs_vorbehalt"),
    pdfPath: text("pdf_path"),
    /** Käufer-Referenz — bei öffentlichen AG: Leitweg-ID (BT-10). */
    buyerReference: text("buyer_reference"),
    /** Bestellnummer des AG (BT-13). */
    purchaseOrderRef: text("purchase_order_ref"),
    xrechnungXmlPath: text("xrechnung_xml_path"),
    xrechnungGeneratedAt: timestamp("xrechnung_generated_at"),
    /** Profile-URN — Standard: XRechnung 3.0. */
    xrechnungProfile: text("xrechnung_profile")
      .notNull()
      .default(
        "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0"
      ),
    /* ---- ZUGFeRD-Export (PDF/A-3 mit eingebetteter XML) ---- */
    zugferdPdfPath: text("zugferd_pdf_path"),
    zugferdGeneratedAt: timestamp("zugferd_generated_at"),
    /** ZUGFeRD-Profile — Standard: XRECHNUNG. */
    zugferdProfile: text("zugferd_profile").notNull().default("XRECHNUNG"),
    /** HOAI-Schlussrechnung: Snapshot der LP-Aufschlüsselung als JSON-Array
     *  [{ lp, sollCents, vorherCents, jetztCents }]. Wird beim Erzeugen einer
     *  HOAI-Schlussrechnung gespeichert (Bestandteil der Rechnungs-Doku). */
    hoaiBreakdownJson: text("hoai_breakdown_json"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    numberUnq: uniqueIndex("unq_ar_workspace_number").on(
      t.workspaceId,
      t.number
    ),
    workspaceProjectIdx: index("idx_ar_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    workspaceStatusIdx: index("idx_ar_workspace_status").on(
      t.workspaceId,
      t.status
    ),
  })
);

export const ausgangsrechnungPositionen = pgTable(
  "ausgangsrechnung_positionen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ausgangsrechnungId: text("ausgangsrechnung_id")
      .notNull()
      .references(() => ausgangsrechnungen.id, { onDelete: "cascade" }),
    /** Optional: Bezug zu LV-Position (für Re-Identifikation). */
    lvItemId: text("lv_item_id").references(() => lvItems.id, {
      onDelete: "set null",
    }),
    /** Optional: Bezug zu Aufmaß-Zeile (für Snapshot-Pfad). */
    aufmassZeileId: text("aufmass_zeile_id").references(
      () => aufmassZeilen.id,
      { onDelete: "set null" }
    ),
    oz: text("oz"),
    description: text("description").notNull(),
    quantity: real("quantity"),
    unit: text("unit"),
    unitPrice: real("unit_price"),
    totalPrice: real("total_price"),
    vatPercent: real("vat_percent").notNull().default(19),
    sortIndex: integer("sort_index").notNull().default(0),
    /** HOAI: Position bezieht sich auf Leistungsphase 1-9 (optional). */
    lpReferenz: integer("lp_referenz"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceArIdx: index("idx_ar_pos_workspace_ar").on(
      t.workspaceId,
      t.ausgangsrechnungId
    ),
    arSortIdx: index("idx_ar_pos_ar_sort").on(
      t.ausgangsrechnungId,
      t.sortIndex
    ),
    lpIdx: index("idx_ar_pos_lp").on(t.ausgangsrechnungId, t.lpReferenz),
  })
);

/**
 * Mahnungen pro Ausgangsrechnung. Level 1/2/3 + ggf. „gerichtlich" als
 * separater Status auf der AR (kein Mahnungs-Datensatz).
 *
 *   § 286 BGB    — Verzug
 *   § 288 BGB    — Verzugszinsen 9 % über Basiszinssatz (B2B)
 *   § 16 III VOB/B — 8 % über Basiszinssatz bei Bauwerkverträgen
 */
export const ausgangsrechnungMahnungen = pgTable(
  "ausgangsrechnung_mahnungen",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ausgangsrechnungId: text("ausgangsrechnung_id")
      .notNull()
      .references(() => ausgangsrechnungen.id, { onDelete: "cascade" }),
    /** 1, 2, 3. */
    level: integer("level").notNull(),
    issuedAt: text("issued_at").notNull(),
    /** Neue Zahlungs-Frist (typisch +7/+10/+14 Tage). */
    dueDate: text("due_date").notNull(),
    /** Mahngebühr — gesetzliche Höchstgrenzen ~5/10/15 EUR. */
    mahngebuehr: real("mahngebuehr").notNull().default(0),
    /** Berechnete Verzugszinsen in EUR (Stichtag = issuedAt). */
    verzugszinsen: real("verzugszinsen").notNull().default(0),
    /** Zinssatz-Snapshot — zur späteren Reproduzierbarkeit. */
    zinsSatzPercent: real("zins_satz_percent").notNull().default(8),
    /** Basisbetrag der Verzinsung (typisch payoutGross). */
    zinsBasisBetrag: real("zins_basis_betrag").notNull().default(0),
    /** Anzahl Verzugstage am Stichtag der Mahnung. */
    zinsTage: integer("zins_tage").notNull().default(0),
    /** Generierter Mahn-Text — vom User editierbar vor Versand. */
    bodyText: text("body_text"),
    sentAt: timestamp("sent_at"),
    pdfPath: text("pdf_path"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceArIdx: index("idx_mahnungen_workspace_ar").on(
      t.workspaceId,
      t.ausgangsrechnungId
    ),
    workspaceIssuedIdx: index("idx_mahnungen_workspace_issued").on(
      t.workspaceId,
      t.issuedAt
    ),
  })
);

/**
 * Counter für die fortlaufende Rechnungsnummer pro Workspace + Jahr.
 * Wird von generateInvoiceNumber transactional inkrementiert.
 */
export const ausgangsrechnungCounter = pgTable(
  "ausgangsrechnung_counter",
  {
    id: text("id").primaryKey(), // workspaceId:year, z. B. "ws_xxx:2026"
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    nextNumber: integer("next_number").notNull().default(1),
  },
  (t) => ({
    workspaceYearUnq: uniqueIndex("unq_ar_counter_workspace_year").on(
      t.workspaceId,
      t.year
    ),
  })
);
