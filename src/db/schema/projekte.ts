/**
 * Projekt-Domain: das Kernobjekt + alles, was direkt am Projekt hängt.
 * Verträge, Nachunternehmer, Nachträge und Beteiligten-Kontakte.
 */
import { pgTable, text, integer, real, index, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./core";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    identifier: text("identifier").notNull(),
    name: text("name").notNull(),
    ag: text("ag").notNull(),
    value: real("value").notNull(),
    /**
     * Lebenszyklus-Status. "Geplant" = Vergabe/vor Ausführung,
     * "Bauphase" = aktive Ausführung, "Abnahme" = laufender Übergang,
     * "Gewährleistung" = nach Abnahme, "Abgeschlossen" = Vertrag beendet.
     */
    status: text("status", {
      enum: ["Geplant", "Bauphase", "Abnahme", "Gewährleistung", "Abgeschlossen"],
    })
      .notNull()
      .default("Bauphase"),
    progress: real("progress").notNull().default(0),
    /** Vertragsgrundlage — bestimmt anwendbares Recht (BGB vs. VOB). */
    contractType: text("contract_type", {
      enum: ["bgb_werkvertrag", "vob_vertrag", "verbraucherbauvertrag"],
    }),
    /** Vertragsdatum / Auftragserteilung — Stichtag für Verzug, Mahnung. */
    contractDate: text("contract_date"),
    /** Geplante Fertigstellung — Vergleich gegen Tatsächlichkeit. */
    plannedCompletion: text("planned_completion"),
    /** Tatsächliche Abnahme — Beginn der Gewährleistungsfrist. */
    abnahmeDate: text("abnahme_date"),
    /** Ende Gewährleistungsfrist (typ. abnahmeDate + 5 J. BGB / 4 J. VOB). */
    warrantyEnd: text("warranty_end"),
    /** Standort der Baustelle. */
    siteAddress: text("site_address"),
    /** Geo-Koordinaten der Baustelle — Voraussetzung für Wetter-API-Abruf. */
    lat: real("lat"),
    lon: real("lon"),
    /** Vertragsstrafe vereinbart? (relevant für AGB-Höchstgrenze 5 %) */
    penaltyClauseAgreed: boolean("penalty_clause_agreed")
      .notNull()
      .default(false),
    /**
     * Projekt ist Bauleistung i. S. v. § 13b II Nr. 4 UStG / § 48 EStG.
     * Default true (LexBau-Domäne). Opt-out für Beratungs-/Gutachterprojekte,
     * die nicht reverse-charge-pflichtig sind und keinen Bauabzug auslösen.
     */
    isBauleistung: boolean("is_bauleistung")
      .notNull()
      .default(true),
    /** Sicherheitseinbehalt in Prozent (typ. 5 % nach § 17 VOB/B). */
    securityRetentionPercent: real("security_retention_percent"),
    /**
     * Vertrauliches Projekt — Detail-Read wird im audit_log als
     * `read_sensitive` protokolliert. Default false; manuell vom
     * Workspace-Admin zu setzen (z. B. NDA-Projekt, sensitive AG-Daten).
     */
    vertraulich: boolean("vertraulich")
      .notNull()
      .default(false),
    /* ---- HOAI (Pivot Ingenieurbüro, Migration 0046) ---- */
    /**
     * Leistungsbild: gebaeude | ingenieurbau | tragwerk | tga | verkehr
     *
     *   gebaeude     — § 34 + Anlage 10 (Gebäudeplanung, Innenräume)
     *   ingenieurbau — § 43/44 + Anlage 12 (Brücken, Wasser, Stützmauern, Tunnel)
     *   tragwerk     — § 51 + Anlage 14 (Tragwerksplanung)
     *   tga          — § 55 + Anlage 15 (Technische Ausrüstung, Gewerke 1-8)
     *   verkehr      — § 47/48 + Anlage 13 (Straße, Schiene, Flug)
     */
    hoaiLeistungsbild: text("hoai_leistungsbild", {
      enum: ["gebaeude", "ingenieurbau", "tragwerk", "tga", "verkehr"],
    }),
    /** Cache der zugehörigen HOAI-Paragraphen-Bezeichnung (z.B. "§ 35 HOAI"). */
    hoaiParagraph: text("hoai_paragraph"),
    /** Honorarzone I-V */
    hoaiHonorarzone: text("hoai_honorarzone", {
      enum: ["I", "II", "III", "IV", "V"],
    }),
    /** min | mittel | max */
    hoaiSatz: text("hoai_satz", { enum: ["min", "mittel", "max"] }).default(
      "mittel"
    ),
    hoaiAnrechenbareKostenCents: integer("hoai_anrechenbare_kosten_cents"),
    /** JSON-Array Leistungsphasen, z.B. "[1,2,3,5,8]" */
    hoaiBeauftragteLpsJson: text("hoai_beauftragte_lps_json"),
    /** Umbau-/Modernisierungs-Zuschlag in % (0..80). § 6 II Nr. 5 HOAI. */
    hoaiUmbauZuschlagPct: real("hoai_umbau_zuschlag_pct"),
    /** Nebenkosten-Pauschale in % (typisch 5-8). */
    hoaiNebenkostenPct: real("hoai_nebenkosten_pct"),
    /** Cache: berechnete Honorarsumme netto. */
    hoaiHonorarsummeNettoCents: integer("hoai_honorarsumme_netto_cents"),
    hoaiBerechnetAm: timestamp("hoai_berechnet_am"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceIdx: index("idx_projects_workspace").on(t.workspaceId),
    identifierUnq: uniqueIndex("unq_projects_workspace_identifier").on(
      t.workspaceId,
      t.identifier
    ),
  })
);

export const contracts = pgTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", {
      enum: ["hauptvertrag", "nachtragsvertrag", "buergschaft", "vereinbarung"],
    })
      .notNull()
      .default("hauptvertrag"),
    contractText: text("contract_text").notNull(),
    signedAt: text("signed_at"),
    partyAg: text("party_ag"),
    partyAn: text("party_an"),
    /** 0–100, höher = mehr Risiko gefunden. */
    riskScore: integer("risk_score"),
    /** JSON-Array von Findings: [{level, title, basis, snippet?}] */
    riskFindings: text("risk_findings"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_contracts_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
  })
);

export const subcontractors = pgTable(
  "subcontractors",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    organization: text("organization"),
    gewerk: text("gewerk").notNull(),
    contractValue: real("contract_value"),
    contractType: text("contract_type", {
      enum: ["bgb_werkvertrag", "vob_vertrag"],
    }),
    passThroughStatus: text("pass_through_status", {
      enum: ["nicht_geprueft", "klausel_vorhanden", "klausel_fehlend", "konfliktig"],
    })
      .notNull()
      .default("nicht_geprueft"),
    /** Ausländischer NU → schaltet A1-Bescheinigungs-Pflicht (VO 883/2004). */
    isForeign: boolean("is_foreign")
      .notNull()
      .default(false),
    /**
     * Soll für diesen NU die Compliance-Prüfung greifen? Default true.
     * Opt-out für Sonderfälle (Architekt/Sachverständiger als „NU" geführt).
     */
    requiresCompliance: boolean("requires_compliance")
      .notNull()
      .default(true),
    /**
     * Zahlungsfreigabe gesperrt? Wird auto bei kritischer Compliance-Lücke
     * (Pflicht-Bescheinigung fehlt/abgelaufen) gesetzt — manuell überschreibbar.
     */
    paymentReleaseBlocked: boolean("payment_release_blocked")
      .notNull()
      .default(false),
    /**
     * NU ist Unternehmer i. S. v. § 13b UStG. Steuert die Reverse-Charge-
     * Erkennung, wenn der NU als AG einer Ausgangsrechnung auftritt
     * (GU-Modus). Default true — Standard-Fall im Bauwesen.
     */
    bauUnternehmer: boolean("bau_unternehmer")
      .notNull()
      .default(true),
    /** USt-IdNr. NU — Pflicht für RC-Erkennung als AG. */
    ustId: text("ust_id"),
    /**
     * Freistellungsbescheinigungs-Nummer (§ 48b EStG). Denormalisiert für
     * schnelle Anzeige. Quelle der Wahrheit: subcontractor_certificates
     * mit kind=freistellung_48b. Konsistenz pflegen die NU-Form-Aktionen.
     */
    freistellungsbescheinigungNr: text("freistellungsbescheinigung_nr"),
    /** Ablaufdatum der aktuellsten Freistellungsbescheinigung (YYYY-MM-DD). */
    freistellungsbescheinigungGueltigBis: text(
      "freistellungsbescheinigung_gueltig_bis"
    ),
    riskNotes: text("risk_notes"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_subcontractors_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    passThroughIdx: index("idx_subcontractors_pass_through").on(
      t.workspaceId,
      t.passThroughStatus
    ),
  })
);

/**
 * Compliance-Bescheinigungen pro Nachunternehmer.
 *
 * Pflichten ergeben sich aus § 48b EStG (Freistellung), § 14 AEntG / § 13 MiLoG
 * (Mindestlohn-Generalunternehmer-Haftung), § 28e SGB IV (Krankenkasse),
 * § 150 SGB VII (BG), TV Sozialkasse Bau und VO (EG) 883/2004 (A1).
 *
 * `validUntil` ist Pflicht — auf dieser Basis laufen Reminder + Auto-Vorgang.
 * Mehrere Bescheinigungen gleicher Art sind erlaubt (Historie); aktuell ist
 * jeweils die jüngste (issuedAt DESC, dann createdAt DESC).
 */
export const subcontractorCertificates = pgTable(
  "subcontractor_certificates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    subcontractorId: text("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "freistellung_48b",
        "unbedenklich_finanzamt",
        "soka_bau",
        "unbedenklich_kk",
        "bg_bau",
        "mindestlohn",
        "a1_entsendung",
        "gewerbeanmeldung",
        "haftpflicht",
      ],
    }).notNull(),
    /** Aussteller, z. B. „Finanzamt München", „AOK Bayern", „BG BAU". */
    issuer: text("issuer"),
    /** Ausstellungsdatum YYYY-MM-DD, optional. */
    issuedAt: text("issued_at"),
    /** Gültig bis YYYY-MM-DD — Pflicht. Treibt Reminder + Auto-Vorgang. */
    validUntil: text("valid_until").notNull(),
    /** Storage-Pfad zur PDF (optional — Eigenerklärung kann ohne Datei gültig sein). */
    documentPath: text("document_path"),
    documentFilename: text("document_filename"),
    status: text("status", {
      enum: ["gueltig", "abgelaufen", "fehlt", "angefordert"],
    })
      .notNull()
      .default("gueltig"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceSubIdx: index("idx_certs_workspace_subcontractor").on(
      t.workspaceId,
      t.subcontractorId
    ),
    validUntilIdx: index("idx_certs_valid_until").on(
      t.workspaceId,
      t.validUntil
    ),
  })
);

/**
 * Nachtrags-Verfolgung pro Projekt. Ersetzt das alte abgeleitete openIssues-Feld
 * mit echten Daten (Status, Volumen, Begründung).
 */
export const nachtraege = pgTable(
  "nachtraege",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Volumen netto in € — kann 0 sein bei rein qualitativen Nachträgen. */
    value: real("value").notNull().default(0),
    legalBasis: text("legal_basis"),
    status: text("status", {
      enum: ["entwurf", "angekuendigt", "eingereicht", "anerkannt", "abgelehnt", "geschlossen"],
    })
      .notNull()
      .default("entwurf"),
    /** Wer hat ausgelöst — AG-Anordnung, Bedarf, Mängel-Folge etc. */
    trigger: text("trigger", {
      enum: ["anordnung_ag", "bauseits_geaendert", "mengenmehrung", "behinderung", "sonstiges"],
    }),
    announcedAt: text("announced_at"),
    submittedAt: text("submitted_at"),
    decidedAt: text("decided_at"),
    /** Optional: Verknüpfung zum auslösenden Bautagebuch-Eintrag. */
    sourceBautagebuchEntryId: text("source_bautagebuch_entry_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_nachtraege_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    statusIdx: index("idx_nachtraege_status").on(t.workspaceId, t.status),
  })
);

/**
 * Sicherheiten-Tracker pro Projekt.
 *
 * Bürgschaften (Vertragserfüllung, Mängelansprüche, Vorauszahlung,
 * Bauhandwerker) und Bareinbehalte mit Rückgabefristen.
 *
 * `direction` unterscheidet drei Akteurs-Konstellationen:
 *   provided_to_ag    — wir (AN) stellen, AG erhält [Standardfall AN-Sicht]
 *   received_from_ag  — AG stellt, wir erhalten [Bauhandwerkersicherung § 650f BGB]
 *   provided_by_nu    — NU stellt, wir (AN als GU) erhalten [GU-Modus, Phase 2]
 *
 * `releaseTrigger` leitet `validUntil` ab, wenn nicht explizit gesetzt:
 *   bei_abnahme              → projects.abnahmeDate
 *   bei_gewaehrleistungsende → projects.warrantyEnd
 *   manuell                  → expliziter validUntil-Wert ist Pflicht
 */
export const securities = pgTable(
  "securities",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Optional bei direction=provided_by_nu — sonst null. */
    subcontractorId: text("subcontractor_id").references(
      () => subcontractors.id,
      { onDelete: "set null" }
    ),
    kind: text("kind", {
      enum: [
        "vertragserfuellung",
        "maengelanspruch",
        "vorauszahlung",
        "bareinbehalt",
        "bauhandwerker",
      ],
    }).notNull(),
    direction: text("direction", {
      enum: ["provided_to_ag", "received_from_ag", "provided_by_nu"],
    })
      .notNull()
      .default("provided_to_ag"),
    /** Bürge — Bank, Versicherung, oder „Bareinbehalt durch AG". */
    provider: text("provider"),
    /** Bürgschafts-/Aktenzeichen. */
    referenceNumber: text("reference_number"),
    /** Betrag in Major-Currency-Units (€). */
    amount: real("amount").notNull(),
    /** Optional: Prozent vom Vertragsvolumen — nur Anzeige-/Plausi-Wert. */
    percentOfContract: real("percent_of_contract"),
    currency: text("currency").notNull().default("EUR"),
    issuedAt: text("issued_at"),
    validFrom: text("valid_from"),
    /**
     * Geltungsende — bei releaseTrigger != manuell wird dieses Feld vom
     * Caller mit dem abgeleiteten Datum aus dem Projekt gefüllt; bei
     * fehlendem Projekt-Datum bleibt es null und der State ist „wartet".
     */
    validUntil: text("valid_until"),
    releaseTrigger: text("release_trigger", {
      enum: ["bei_abnahme", "bei_gewaehrleistungsende", "manuell"],
    })
      .notNull()
      .default("manuell"),
    status: text("status", {
      enum: ["aktiv", "rueckgabe_angefordert", "freigegeben", "verfallen"],
    })
      .notNull()
      .default("aktiv"),
    /** Ist-Rückgabedatum — gesetzt bei status=freigegeben. */
    releasedAt: text("released_at"),
    documentPath: text("document_path"),
    documentFilename: text("document_filename"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_securities_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
    validUntilIdx: index("idx_securities_valid_until").on(
      t.workspaceId,
      t.validUntil
    ),
    statusIdx: index("idx_securities_status").on(t.workspaceId, t.status),
  })
);

/**
 * Kontakte pro Projekt — AG-Ansprechpartner, Architekt, NU, etc.
 * Wichtig für Rüge-Adressaten, Korrespondenz-Empfänger, Haftungsfragen.
 */
export const projectContacts = pgTable(
  "project_contacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: [
        "ag_vertreter",
        "architekt",
        "fachplaner",
        "bauleiter_ag",
        "nachunternehmer",
        "sachverstaendiger",
        "anwalt",
        "sonstiges",
      ],
    }).notNull(),
    name: text("name").notNull(),
    organization: text("organization"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    workspaceProjectIdx: index("idx_contacts_workspace_project").on(
      t.workspaceId,
      t.projectId
    ),
  })
);
