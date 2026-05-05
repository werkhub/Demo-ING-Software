/**
 * Workspace + User-Kerntabellen. Beide sind Voraussetzung für jede
 * andere Domain-Tabelle (Foreign-Key-Wurzel) und liegen daher zusammen.
 */
import { pgTable, text, integer, index , boolean, timestamp } from "drizzle-orm/pg-core";
import { CLIENT_FOCUS, DISCIPLINE_SUBPROFILES } from "./types";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier", { enum: ["solo", "team", "business", "enterprise"] })
    .notNull()
    .default("team"),
  /**
   * Workspace-Typ — bestimmt UI-Fokus, Modul-Sichtbarkeit, Member-Rollen-Set,
   * Vorlagen und die Perspektive des Recht-Assistenten.
   *
   *   bauunternehmer  — VOB/B-Welt (Bauunternehmen, GU, NU, Handwerk)
   *                     Module: LV, Aufmaß, Sicherheiten, §13b/§48, NU-Pass
   *   bauherr         — AG-Sicht (Bauherr, Investor, öffentlicher AG)
   *                     Module: Mängelrüge, Vergabe, Anordnung
   *   ingenieurbuero  — HOAI-Welt (Architekt, Bauingenieur, TGA, Tragwerk,
   *                     Bauleitung, Projektsteuerung)
   *                     Module: HOAI-Rechner, LP-Tracking, Plan-Index
   *
   * Vorher waren Rolle (an/ag/ps/bl) und Branche (bau/ingenieurbuero) zwei
   * Felder — sind aber redundant. PS/BL sind Sub-Aspekte des Ingenieurbüros
   * und werden über users.member_role abgebildet.
   */
  workspaceRole: text("workspace_role", {
    enum: ["bauunternehmer", "bauherr", "ingenieurbuero"],
  })
    .notNull()
    .default("bauunternehmer"),
  /**
   * Fachdisziplinen (orthogonal zu workspaceRole) — JSON-Array von
   * Discipline-Werten. Default `[]` (keine Disziplin gewählt) → Sidebar
   * zeigt nur disziplin-unabhängige Module. Steuert HOAI-Rechner-Tabs,
   * Vorlagen, Recht-Assistent-Perspektive und priorisierte Bibliothek.
   *
   * Auch für bauunternehmer-Workspaces nutzbar (Hochbau-BU vs. Tiefbau-BU).
   */
  disciplinesJson: text("disciplines_json").notNull().default("[]"),
  /**
   * Onboarding-Preset, das `disciplinesJson` initial befüllt hat. Reine
   * Nachvollzieh-Information — manuelle Disziplin-Änderungen setzen den
   * Wert auf "custom".
   */
  disciplineSubprofile: text("discipline_subprofile", {
    enum: DISCIPLINE_SUBPROFILES,
  })
    .notNull()
    .default("custom"),
  /**
   * Auftraggeber-Schwerpunkt. Steuert Sichtbarkeit von Vergabe-, Förder-
   * projekt- und Honorarprüfungs-Modulen.
   */
  clientFocus: text("client_focus", { enum: CLIENT_FOCUS })
    .notNull()
    .default("gemischt"),
  /**
   * Bürogröße (MA) — optional, weil `tier` bereits Lizenzstufen abdeckt.
   * Wenn gesetzt: triggert HinSchG-Vorschlag (≥ 50) und potenzielle
   * Mehrstandort-Module. NULL = unbekannt → keine größenbezogenen Filter
   * werden angewendet (kein heimliches Verstecken).
   */
  companySize: integer("company_size"),
  vobLicenseStatus: text("vob_license_status").notNull().default("active"),
  vobValidUntil: text("vob_valid_until"),
  /**
   * Aktive VOB-Lizenz für Volltext-Anzeige.
   * "none" = keine Lizenz, App zeigt Paraphrase + Deep-Links (Tier 0).
   * "din_media" / "juris" / "beck_online" = Plattform-Lizenz (Tier 1+),
   *   App zeigt Volltext aus legalChunks.licensedContent.
   */
  vobLicenseProvider: text("vob_license_provider", {
    enum: ["none", "din_media", "juris", "beck_online"],
  })
    .notNull()
    .default("none"),
  /**
   * Bevorzugter externer Anbieter für Volltext-Verweise (Tier 0).
   * "all" = alle drei Buttons gleichberechtigt zeigen.
   */
  vobPreferredExternalProvider: text("vob_preferred_external_provider", {
    enum: ["all", "juris", "din_media", "beck_online"],
  })
    .notNull()
    .default("all"),
  /** HinSchG-Modul aktiv? Pflicht ab 50 MA — daher Opt-in pro Workspace. */
  hinschgEnabled: boolean("hinschg_enabled")
    .notNull()
    .default(false),
  /** E-Mail der Meldestellen-Beauftragten — Mailto-Hinweis bei neuer Meldung. */
  hinschgOfficeContactEmail: text("hinschg_office_contact_email"),
  /* ---- Geschäfts-Stammdaten (für Ausgangsrechnungen / XRechnung) ---- */
  /** IBAN (Pflicht für XRechnung-Zahlungsangaben). */
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  /** Steuernummer (§ 14 IV Nr. 2 UStG). */
  taxId: text("tax_id"),
  /** USt-IdNr. (alternativ bei innergem. Lieferung). */
  vatId: text("vat_id"),
  /** Geschäftsanschrift — wird in XRechnung als Seller-Address eingebettet. */
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  /**
   * Workspace ist selbst Bauunternehmer-AG i. S. v. § 48 EStG.
   * Schaltet die Bauabzugsteuer-Workflows scharf (Einbehalt 15 % bei
   * NU-Eingangsrechnungen ohne Freistellungsbescheinigung).
   */
  bauabzugPflichtig: boolean("bauabzug_pflichtig")
    .notNull()
    .default(false),
  /* ---- DATEV-Export (Modul 4.4) ---- */
  datevBeraterNr: integer("datev_berater_nr"),
  datevMandantNr: integer("datev_mandant_nr"),
  datevKontenrahmen: text("datev_kontenrahmen", {
    enum: ["skr03", "skr04"],
  }).default("skr03"),
  datevKundenSammelkonto: integer("datev_kunden_sammelkonto").default(10001),
  datevLieferantenSammelkonto:
    integer("datev_lieferanten_sammelkonto").default(70001),
  /** JSON-Map mit Konten-Override pro DatevKontoKey. */
  datevKontenMappingJson: text("datev_konten_mapping_json"),
  /** Wirtschaftsjahr-Beginn als MMDD (Default 0101 = 1. Januar). */
  datevWjStartMmdd: text("datev_wj_start_mmdd").default("0101"),
  /**
   * Workspace-Default-Locale (next-intl). Fallback für User ohne eigene
   * preferredLocale. NULL = global default ("de").
   * Werte: "de" | "en" — siehe routing.ts.
   */
  defaultLocale: text("default_locale", { enum: ["de", "en"] }),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role", { enum: ["admin", "user", "viewer", "guest"] })
      .notNull()
      .default("user"),
    roleLabel: text("role_label"),
    /**
     * Domain-Rolle (Modul 4.8) — feiner als users.role, steuert Permissions.
     * Auflösung in src/lib/auth/permissions.ts (Override → Matrix → Default).
     */
    memberRole: text("member_role", {
      enum: [
        "gf",
        "kalkulator",
        "polier",
        "buchhaltung",
        "ingenieur",
        "bauleiter",
        "verwaltung",
        "zeichner",
        "viewer",
        "admin",
      ],
    })
      .notNull()
      .default("kalkulator"),
    /**
     * JSON-Array `[{resource, action, allowed}]` — User-spezifischer Override,
     * schlägt die permissions_matrix. Null = keine Overrides.
     */
    permissionsOverrideJson: text("permissions_override_json"),
    status: text("status", { enum: ["active", "leaving", "inactive"] })
      .notNull()
      .default("active"),
    hasLicense: boolean("has_license").notNull().default(true),
    /**
     * UI-Sprachpräferenz (next-intl). Null = Browser-Sprache / Default.
     * Werte: "de" | "en" — siehe routing.ts.
     */
    preferredLocale: text("preferred_locale", { enum: ["de", "en"] }),
    joinedAt: timestamp("joined_at")
      .notNull()
      .$defaultFn(() => new Date()),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => ({
    workspaceIdx: index("idx_users_workspace").on(t.workspaceId),
  })
);
