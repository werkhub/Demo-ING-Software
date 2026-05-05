/**
 * Feature-Index für den KI-Assistenten.
 *
 * Pro Modul-ID ein Eintrag mit Beschreibung, typischen Anwendungsfällen,
 * Workflow-Hinweisen (Schritt-für-Schritt) und Querverweisen. Bewusst kompakt
 * — die Inhalte werden in Antworten zitiert, sollen also gut lesbar bleiben.
 *
 * Pflege: bei jedem neuen Sidebar-Modul einen Eintrag ergänzen. Module ohne
 * Eintrag fallen auf die Auto-Daten aus modules.ts zurück (Label + Route).
 *
 * Lokalisierung: jedes Textfeld ist `Localized<string>` (de + en). Der Mock-
 * und später der Claude-Provider wählen anhand der aktiven Workspace-/User-
 * Locale.
 */
import type { ModuleId } from "@/lib/modules";

export type Locale = "de" | "en";

export type Localized<T> = Record<Locale, T>;

export type FeatureEntry = {
  id: ModuleId;
  /** Kurzbeschreibung, ein Satz. */
  description: Localized<string>;
  /** Typische Anwendungsfälle — Bullet-Punkte. */
  useCases: Localized<readonly string[]>;
  /**
   * Workflow-Hinweise. Jeder Eintrag besteht aus Titel + nummerierten Schritten.
   * Verwende `→` für Sidebar-/Button-Pfade, z. B. „Sidebar → Tagesgeschäft → Vorgänge".
   */
  workflows: Localized<
    readonly { title: string; steps: readonly string[] }[]
  >;
  /** Verwandte Modul-IDs — der Assistent kann darauf verlinken. */
  relatedModules?: readonly ModuleId[];
};

export const FEATURE_INDEX: Partial<Record<ModuleId, FeatureEntry>> = {
  /* ============== Übersicht ============== */
  dashboard: {
    id: "dashboard",
    description: {
      de: "Zentrale Tagesübersicht mit KPIs zu Vorgängen, Fristen, Projekten und letzten Aktivitäten.",
      en: "Central daily overview with KPIs for cases, deadlines, projects and recent activities.",
    },
    useCases: {
      de: [
        "Morgendlicher Überblick über kritische Themen",
        "Schneller Sprung zu offenen Anfragen oder Vorgängen",
      ],
      en: [
        "Morning overview of critical topics",
        "Quick jump to open queries or cases",
      ],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["vorgaenge", "fristen"],
  },

  /* ============== Tagesgeschäft ============== */
  vorgaenge: {
    id: "vorgaenge",
    description: {
      de: "Posteingang für klärungsbedürftige Sachverhalte — jede Mängelrüge, Anordnung, Risiko-Klausel landet hier mit Risk-Score.",
      en: "Inbox for issues requiring clarification — every defect notice, change order or risk clause lands here with a risk score.",
    },
    useCases: {
      de: [
        "Neuen Vorgang aus Bautagebuch oder Vertrags-Scan anlegen",
        "Risiko priorisieren und an Bauleiter zuweisen",
        "Klärungsstand mit Audit-Log nachverfolgen",
      ],
      en: [
        "Create a new case from the construction log or contract scan",
        "Prioritize risk and assign to a site manager",
        "Track the clarification status via audit log",
      ],
    },
    workflows: {
      de: [
        {
          title: "Neuen Vorgang manuell anlegen",
          steps: [
            "Sidebar → Tagesgeschäft → Vorgänge",
            'Button "Neu" oben rechts klicken',
            "Projekt, Kategorie und Titel eintragen",
            "Speichern — der Vorgang erhält automatisch einen Risk-Score",
          ],
        },
        {
          title: "Vorgang aus Vertrags-Scan erzeugen",
          steps: [
            "Vertrags-Scan öffnen (Werkzeuge → Vertrags-Scan)",
            "Vertrag scannen, High-Risk-Findings prüfen",
            'Bei jedem Finding auf "Vorgang anlegen" klicken',
          ],
        },
      ],
      en: [
        {
          title: "Create a new case manually",
          steps: [
            "Sidebar → Daily Work → Cases",
            'Click "New" in the top right',
            "Enter project, category and title",
            "Save — the case gets an automatic risk score",
          ],
        },
        {
          title: "Generate a case from a contract scan",
          steps: [
            "Open Contract Scan (Tools → Contract Scan)",
            "Scan the contract, review high-risk findings",
            'Click "Create case" on each finding',
          ],
        },
      ],
    },
    relatedModules: ["bautagebuch", "vertrag", "anordnung", "ruege-analyse"],
  },

  fristen: {
    id: "fristen",
    description: {
      de: "Zentrale Fristen-Übersicht mit Dringlichkeitsstufen, Rechtsgrundlage und iCal-Export.",
      en: "Central deadline view with urgency tiers, legal basis and iCal export.",
    },
    useCases: {
      de: [
        "Kritische Fristen heute / diese Woche prüfen",
        "Outlook/Google-Kalender per iCal-Export anbinden",
      ],
      en: [
        "Check critical deadlines today / this week",
        "Sync to Outlook/Google calendar via iCal export",
      ],
    },
    workflows: {
      de: [
        {
          title: "Frist anlegen",
          steps: [
            "Sidebar → Tagesgeschäft → Fristen",
            'Auf "Neue Frist" klicken',
            "Aufgabe, Deadline und ggf. Rechtsgrundlage (z. B. § 13 Abs. 5 VOB/B) eintragen",
            "Speichern — die Urgency wird automatisch berechnet",
          ],
        },
        {
          title: "Fristen in Outlook übernehmen",
          steps: [
            "Sidebar → Fristen",
            'Auf "iCal exportieren" klicken',
            ".ics-Datei in Outlook/Google Calendar importieren",
          ],
        },
      ],
      en: [
        {
          title: "Add a deadline",
          steps: [
            "Sidebar → Daily Work → Deadlines",
            'Click "New deadline"',
            "Enter task, due date and optional legal basis (e.g. § 13 (5) VOB/B)",
            "Save — urgency is computed automatically",
          ],
        },
        {
          title: "Sync deadlines to Outlook",
          steps: [
            "Sidebar → Deadlines",
            'Click "Export iCal"',
            "Import the .ics file into Outlook or Google Calendar",
          ],
        },
      ],
    },
    relatedModules: ["vorgaenge", "anzeigen"],
  },

  anzeigen: {
    id: "anzeigen",
    description: {
      de: "Behinderungsanzeigen (§ 6 VOB/B) und Bedenkenanmeldungen (§ 4 Abs. 3 VOB/B) mit Versand- und Zugangs-Tracking.",
      en: "Obstruction notices (§ 6 VOB/B) and concern notifications (§ 4(3) VOB/B) with sending and acknowledgement tracking.",
    },
    useCases: {
      de: [
        "Behinderungsanzeige rechtssicher versenden",
        "Bedenkenanmeldung gegen Planvorgabe oder bauseits gestellte Stoffe",
      ],
      en: [
        "Send an obstruction notice in a legally compliant way",
        "Raise concerns about specification or owner-supplied materials",
      ],
    },
    workflows: {
      de: [
        {
          title: "Behinderungsanzeige senden",
          steps: [
            "Sidebar → Tagesgeschäft → Anzeigen",
            'Auf "Neue Anzeige" klicken, Typ Behinderung wählen',
            "Projekt, Ursache und Empfänger eintragen",
            "Versenden — Schriftform und Zugangsbestätigung werden mit dokumentiert",
          ],
        },
      ],
      en: [
        {
          title: "Send an obstruction notice",
          steps: [
            "Sidebar → Daily Work → Notices",
            'Click "New notice" → choose type "Obstruction"',
            "Enter project, cause and recipient",
            "Send — written form and acknowledgement are documented automatically",
          ],
        },
      ],
    },
    relatedModules: ["bautagebuch", "fristen", "vorgaenge"],
  },

  bautagebuch: {
    id: "bautagebuch",
    description: {
      de: "Tagesweise Bauablauf-Doku mit Co-Pilot, der rechtlich relevante Trigger (Anordnung, Behinderung, Mangel) automatisch erkennt.",
      en: "Daily site log with a co-pilot that automatically detects legally relevant triggers (orders, obstructions, defects).",
    },
    useCases: {
      de: [
        "Tagesgeschehen mit Wetter, Personalstunden und Geräten erfassen",
        "Auf erkannte Trigger reagieren — z. B. sofort Behinderungsanzeige starten",
      ],
      en: [
        "Record daily progress with weather, staff hours and equipment",
        "React to detected triggers — e.g. start an obstruction notice immediately",
      ],
    },
    workflows: {
      de: [
        {
          title: "Tageseintrag schreiben",
          steps: [
            "Sidebar → Tagesgeschäft → Bautagebuch",
            "Projekt wählen, Datum prüfen",
            "Wetter, Personalstunden, Tagesgeschehen eintragen",
            "Speichern — der Co-Pilot prüft auf Trigger und schlägt nächste Schritte vor",
          ],
        },
      ],
      en: [
        {
          title: "Write a daily entry",
          steps: [
            "Sidebar → Daily Work → Site Log",
            "Pick the project and verify the date",
            "Enter weather, staff hours and the day's events",
            "Save — the co-pilot checks for triggers and suggests next steps",
          ],
        },
      ],
    },
    relatedModules: ["anzeigen", "vorgaenge"],
  },

  /* ============== Projekte ============== */
  projekte: {
    id: "projekte",
    description: {
      de: "Stammdaten aller Bauvorhaben — inklusive HOAI-Honorardaten, Compliance-Status und Vertragsbezug.",
      en: "Master data for all projects — including HOAI fee data, compliance status and contract reference.",
    },
    useCases: {
      de: [
        "Neues Projekt anlegen mit HOAI-Stammdaten",
        "Sicherheiten, Nachträge und kritische Issues pro Projekt sehen",
      ],
      en: [
        "Create a new project with HOAI master data",
        "View securities, change orders and critical issues per project",
      ],
    },
    workflows: {
      de: [
        {
          title: "Projekt anlegen",
          steps: [
            "Sidebar → Projekte",
            'Auf "Neues Projekt" klicken',
            "Identifier, Name, AG und Vertragsdaten eintragen",
            "Speichern — danach HOAI-Daten und Kontakte ergänzen",
          ],
        },
      ],
      en: [
        {
          title: "Create a project",
          steps: [
            "Sidebar → Projects",
            'Click "New project"',
            "Enter identifier, name, client and contract data",
            "Save — then add HOAI data and contacts",
          ],
        },
      ],
    },
    relatedModules: ["hoai-rechner", "vorgaenge"],
  },

  /* ============== Finanzen ============== */
  rechnungen: {
    id: "rechnungen",
    description: {
      de: "Eingangsrechnungen mit Anomalie-Erkennung (Preissprünge, Doppelbuchungen, Vertragsabgleich) und XRechnung-/ZUGFeRD-Validierung.",
      en: "Incoming invoices with anomaly detection (price jumps, duplicates, contract checks) and XRechnung/ZUGFeRD validation.",
    },
    useCases: {
      de: [
        "Subunternehmer-Rechnungen prüfen",
        "XRechnung/ZUGFeRD-XML hochladen und auf Pflichtfelder prüfen",
      ],
      en: [
        "Review subcontractor invoices",
        "Upload XRechnung/ZUGFeRD XML and validate required fields",
      ],
    },
    workflows: {
      de: [
        {
          title: "E-Rechnung importieren",
          steps: [
            "Sidebar → Finanzen → Eingangsrechnungen",
            'Den Eintrag "E-Rechnung-Import" wählen',
            "XRechnung-/ZUGFeRD-Datei hochladen (max. 5 MB)",
            "Bei Pflichtfeld-Fehler wird automatisch ein Klärungs-Vorgang erstellt",
          ],
        },
      ],
      en: [
        {
          title: "Import an e-invoice",
          steps: [
            "Sidebar → Finance → Incoming Invoices",
            'Choose "E-Invoice import"',
            "Upload XRechnung/ZUGFeRD file (max 5 MB)",
            "If required fields are missing, a clarification case is created automatically",
          ],
        },
      ],
    },
    relatedModules: ["ausgangsrechnungen", "datev"],
  },

  ausgangsrechnungen: {
    id: "ausgangsrechnungen",
    description: {
      de: "Abschlags- und Schlussrechnungen über alle Projekte — mit fortlaufender Rechnungsnummer, § 13b-Erkennung und Mahn-Status.",
      en: "Progress and final invoices across projects — with sequential invoice numbers, § 13b detection and dunning status.",
    },
    useCases: {
      de: [
        "HOAI-Honorarrechnung mit LP-Aufsplitt erstellen",
        "Verzug überwachen und Mahnungen rechtzeitig versenden",
      ],
      en: [
        "Create a HOAI fee invoice with phase split",
        "Monitor late payments and send dunning letters on time",
      ],
    },
    workflows: {
      de: [
        {
          title: "Abschlagsrechnung erstellen",
          steps: [
            "Sidebar → Finanzen → Ausgangsrechnungen",
            'Auf "Neue Rechnung" klicken, Typ Abschlag wählen',
            "Projekt, Positionen und USt eintragen",
            "Versenden — XRechnung wird auf Wunsch generiert",
          ],
        },
      ],
      en: [
        {
          title: "Create a progress invoice",
          steps: [
            "Sidebar → Finance → Outgoing Invoices",
            'Click "New invoice" → choose "Progress"',
            "Enter project, line items and VAT",
            "Send — XRechnung is generated on request",
          ],
        },
      ],
    },
    relatedModules: ["rechnungen", "datev"],
  },

  stunden: {
    id: "stunden",
    description: {
      de: "Wochenweise Stundenerfassung pro Mitarbeiter, Projekt und Leistungsphase, mit Lohnlauf-Lock und Plausi-Check >12 h/Tag.",
      en: "Weekly time tracking per employee, project and HOAI phase, with payroll lock and >12 h/day plausibility check.",
    },
    useCases: {
      de: [
        "Stundennachweis als Anlage zur Honorarrechnung",
        "Lohnabrechnung gegen Manipulation absichern (Wochen-Lock)",
      ],
      en: [
        "Provide a timesheet as an attachment to fee invoices",
        "Lock weekly hours against tampering after payroll",
      ],
    },
    workflows: {
      de: [
        {
          title: "Stunden für eine Woche erfassen",
          steps: [
            "Sidebar → Finanzen → Stunden",
            "Mitarbeiter wählen, Kalenderwoche prüfen",
            "Stunden je Tag, Projekt und Leistungsphase eintragen",
            "Speichern — der Plausi-Check warnt bei >12 h/Tag",
          ],
        },
        {
          title: "Woche nach Lohnlauf sperren",
          steps: [
            "Sidebar → Stunden",
            'Woche aufrufen, dann auf "Sperren" klicken',
            "Datum + Notiz eintragen — die Woche ist danach unveränderbar",
          ],
        },
      ],
      en: [
        {
          title: "Record hours for a week",
          steps: [
            "Sidebar → Finance → Hours",
            "Pick employee, verify the calendar week",
            "Enter hours per day, project and HOAI phase",
            "Save — the plausibility check warns above 12 h/day",
          ],
        },
        {
          title: "Lock a week after payroll",
          steps: [
            "Sidebar → Hours",
            'Open the week → click "Lock"',
            "Enter date and a note — the week becomes immutable",
          ],
        },
      ],
    },
    relatedModules: ["ausgangsrechnungen", "datev"],
  },

  datev: {
    id: "datev",
    description: {
      de: "Buchungsstapel-Export im DATEV-EXTF-Format für den Steuerberater.",
      en: "Posting batch export in DATEV-EXTF format for the tax advisor.",
    },
    useCases: {
      de: [
        "Monatliche Buchhaltungs-Übergabe ohne Doppelerfassung",
      ],
      en: [
        "Monthly accounting handover without double entry",
      ],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["rechnungen", "ausgangsrechnungen"],
  },

  liquiditaet: {
    id: "liquiditaet",
    description: {
      de: "Cashflow-Forecast aus offenen Ausgangsrechnungen, NU-Eingangsrechnungen und Lohn — mit Frühwarnung bei Saldo ≤ 0.",
      en: "Cash flow forecast from open invoices, subcontractor bills and payroll — with an early warning at balance ≤ 0.",
    },
    useCases: {
      de: ["14-Tage-Vorschau bei langlaufenden HOAI-Verträgen"],
      en: ["14-day outlook for long-running HOAI contracts"],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["ausgangsrechnungen", "rechnungen"],
  },

  finanzen: {
    id: "finanzen",
    description: {
      de: "Hub-Übersicht über Eingangs-, Ausgangsrechnungen, DATEV und Liquidität.",
      en: "Hub overview of incoming/outgoing invoices, DATEV and liquidity.",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["rechnungen", "ausgangsrechnungen", "datev", "liquiditaet"],
  },

  "erechnung-import": {
    id: "erechnung-import",
    description: {
      de: "Upload-Maske für XRechnung-/ZUGFeRD-XML mit automatischer Pflichtfeldprüfung.",
      en: "Upload form for XRechnung/ZUGFeRD XML with automatic required-field validation.",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["rechnungen"],
  },

  /* ============== Dokumentation ============== */
  vorlagen: {
    id: "vorlagen",
    description: {
      de: "Wiederkehrende Schriftstücke (Verträge, Aushänge, Anschreiben) mit projekt-spezifischer Vorbelegung.",
      en: "Reusable documents (contracts, notices, letters) pre-filled with project data.",
    },
    useCases: {
      de: [
        "Mahnungs- oder Bedenkenanmeldungs-Anschreiben generieren",
      ],
      en: [
        "Generate dunning letters or concern notifications",
      ],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["anzeigen", "ausgangsrechnungen"],
  },

  beweis: {
    id: "beweis",
    description: {
      de: "Foto-/Notiz-Beweissicherung mit anlassbezogenen Checklisten (vor Verputzen, nach Wassereintritt).",
      en: "Photo and note evidence preservation with situational checklists (before plastering, after water ingress).",
    },
    useCases: {
      de: ["Versicherung gegen spätere Mangelvorwürfe (LP 8)"],
      en: ["Insurance against later defect claims (HOAI phase 8)"],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["bautagebuch"],
  },

  /* ============== Werkzeuge ============== */
  "recht-assistent": {
    id: "recht-assistent",
    description: {
      de: "KI-gestützte Rechtsfrage-Analyse mit Norm- und BGH-Bezug, perspektiviert nach Workspace-Rolle.",
      en: "AI-powered legal Q&A with norm and BGH case-law reference, framed by workspace role.",
    },
    useCases: {
      de: [
        "Erste Einschätzung zu Mängelrüge, Anordnung oder Honorarstreit",
      ],
      en: [
        "Initial assessment of defect notices, change orders or fee disputes",
      ],
    },
    workflows: {
      de: [
        {
          title: "Anfrage stellen",
          steps: [
            "Sidebar → Werkzeuge → Recht-Assistent",
            "Frage formulieren, ggf. Projekt-Kontext setzen",
            "Antwort + Quellen prüfen — RDG-Hinweis beachten",
          ],
        },
      ],
      en: [
        {
          title: "Ask a legal question",
          steps: [
            "Sidebar → Tools → Legal Assistant",
            "Phrase the question, optionally set project context",
            "Review answer and sources — note the RDG disclaimer",
          ],
        },
      ],
    },
    relatedModules: ["gesetze", "urteile", "ruege-analyse"],
  },

  vertrag: {
    id: "vertrag",
    description: {
      de: "Vertragstext-Scan auf Risiko-Klauseln (Pönale, Sicherheitseinbehalte, AGB-Konflikte) — High-Risk-Findings erzeugen Vorgänge.",
      en: "Contract scan for risk clauses (penalties, retentions, T&C conflicts) — high-risk findings spawn cases.",
    },
    useCases: {
      de: ["Vertrag vor Unterschrift prüfen", "AGB-Falle vermeiden"],
      en: ["Review contract before signing", "Avoid T&C traps"],
    },
    workflows: {
      de: [
        {
          title: "Vertrag scannen",
          steps: [
            "Sidebar → Werkzeuge → Vertrags-Scan",
            "Vertragstext einfügen oder hochladen",
            'Findings durchgehen — bei High-Risk "Vorgang anlegen"',
          ],
        },
      ],
      en: [
        {
          title: "Scan a contract",
          steps: [
            "Sidebar → Tools → Contract Scan",
            "Paste or upload the contract text",
            'Review findings — for high-risk items click "Create case"',
          ],
        },
      ],
    },
    relatedModules: ["vorgaenge", "ruege-analyse"],
  },

  "ruege-analyse": {
    id: "ruege-analyse",
    description: {
      de: "Heuristische Prüfung eingehender Mängelrügen auf formelle Wirksamkeit (Frist, Konkretisierung, Schriftform).",
      en: "Heuristic check of incoming defect notices for formal validity (deadline, specificity, written form).",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["vorgaenge", "recht-assistent"],
  },

  anordnung: {
    id: "anordnung",
    description: {
      de: "Klassifikation eingehender AG-Kommunikation als § 1 Abs. 3 (Leistungsänderung) oder § 1 Abs. 4 VOB/B (zusätzliche Leistung).",
      en: "Classification of incoming client communication as § 1(3) (change order) or § 1(4) VOB/B (additional work).",
    },
    useCases: {
      de: [
        "Verdeckte Anordnung erkennen, bevor Mehrkosten verloren gehen",
      ],
      en: [
        "Detect hidden orders before extra costs are lost",
      ],
    },
    workflows: {
      de: [
        {
          title: "Anordnung prüfen",
          steps: [
            "Sidebar → Werkzeuge → Anordnungs-Check",
            "AG-Kommunikation (E-Mail, WhatsApp, Brief) einfügen",
            "Score und Empfehlung prüfen — bei verdeckter Anordnung Mehrkosten ankündigen",
          ],
        },
      ],
      en: [
        {
          title: "Check an order",
          steps: [
            "Sidebar → Tools → Order Check",
            "Paste the client communication (email, WhatsApp, letter)",
            "Review score and recommendation — for hidden orders announce extra costs",
          ],
        },
      ],
    },
    relatedModules: ["vorgaenge", "anzeigen"],
  },

  "hoai-rechner": {
    id: "hoai-rechner",
    description: {
      de: "HOAI-2021-Honorarberechnung mit linearer Interpolation für §§ 35, 43, 47, 51, 56.",
      en: "HOAI 2021 fee calculation with linear interpolation for §§ 35, 43, 47, 51, 56.",
    },
    useCases: {
      de: [
        "Honorarangebot vor Vertragsabschluss kalkulieren",
        "LP-Aufsplitt für Schlussrechnung ableiten",
      ],
      en: [
        "Calculate a fee proposal before contract signing",
        "Derive a phase split for the final invoice",
      ],
    },
    workflows: {
      de: [
        {
          title: "Honorar berechnen",
          steps: [
            "Sidebar → Werkzeuge → HOAI-Rechner",
            "Leistungsbild, Honorarzone, anrechenbare Kosten eintragen",
            "Beauftragte Leistungsphasen anhaken",
            "Ergebnis ablesen oder ans Projekt übertragen",
          ],
        },
      ],
      en: [
        {
          title: "Calculate a fee",
          steps: [
            "Sidebar → Tools → HOAI Calculator",
            "Pick service profile, fee zone and chargeable costs",
            "Tick the commissioned service phases",
            "Read off the result or apply it to the project",
          ],
        },
      ],
    },
    relatedModules: ["projekte", "ausgangsrechnungen"],
  },

  analysen: {
    id: "analysen",
    description: {
      de: "Hub für die KI-/Heuristik-Werkzeuge: Vertrags-Scan, Rüge-Analyse, Anordnungs-Check.",
      en: "Hub for AI/heuristic tools: Contract Scan, Defect-Notice Analysis, Order Check.",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["vertrag", "ruege-analyse", "anordnung"],
  },

  /* ============== Wissen ============== */
  gesetze: {
    id: "gesetze",
    description: {
      de: "Durchsuchbare Datenbank zentraler Bauvorschriften (BGB §§ 631–650v, HOAI 2021, VOB/A/B/C).",
      en: "Searchable database of central construction laws (BGB §§ 631–650v, HOAI 2021, VOB/A/B/C).",
    },
    useCases: {
      de: ["Paragraphen-Volltext in Sekunden ohne Browser-Tab"],
      en: ["Full-text paragraph lookup in seconds without a browser tab"],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["urteile", "recht-assistent"],
  },

  urteile: {
    id: "urteile",
    description: {
      de: "Indizierte BGH-Rechtsprechung der Bau-relevanten Senate (VII. ZR, V. ZR).",
      en: "Indexed BGH case law from the construction-relevant senates (VII. ZR, V. ZR).",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["gesetze", "recht-assistent"],
  },

  /* ============== Verwaltung ============== */
  workspace: {
    id: "workspace",
    description: {
      de: "Workspace-Konfiguration: Mitglieder, Rolle, Fachprofil (Disziplinen + Auftraggeber-Schwerpunkt), VOB-Lizenz, Geschäftsdaten.",
      en: "Workspace configuration: members, role, professional profile (disciplines + client focus), VOB license, business data.",
    },
    useCases: {
      de: [
        "Mitglieder einladen oder Rollen ändern",
        "Fachprofil wechseln (Hochbau / Tiefbau / Generalplanung …)",
      ],
      en: [
        "Invite members or change roles",
        "Switch the professional profile (building / civil / general planning …)",
      ],
    },
    workflows: {
      de: [
        {
          title: "Fachprofil ändern",
          steps: [
            "Sidebar → Verwaltung → Workspace",
            'Sektion "Fachprofil" — Subprofil wählen oder Disziplinen einzeln einstellen',
            "Speichern — die Sidebar passt sich automatisch an",
          ],
        },
      ],
      en: [
        {
          title: "Change the professional profile",
          steps: [
            "Sidebar → Settings → Workspace",
            'Section "Professional profile" — pick a subprofile or set disciplines individually',
            "Save — the sidebar adapts automatically",
          ],
        },
      ],
    },
    relatedModules: ["lizenz"],
  },

  nu: {
    id: "nu",
    description: {
      de: "NU-Pass-Through: Subunternehmer-Akte mit Compliance (Freistellung, SOKA, Mindestlohn) und Pass-Through der AG-Pflichten.",
      en: "Subcontractor pass-through: NU file with compliance (release certificates, SOKA-BAU, minimum wage) and pass-through of client obligations.",
    },
    useCases: {
      de: [
        "Compliance-Status aller NU im Blick behalten",
        "Bauabzugsteuer-Einbehalt automatisch erkennen",
      ],
      en: [
        "Keep an eye on compliance status of all subcontractors",
        "Detect mandatory construction withholding tax automatically",
      ],
    },
    workflows: { de: [], en: [] },
    relatedModules: ["projekte"],
  },

  hinschg: {
    id: "hinschg",
    description: {
      de: "Hinweisgebersystem nach §§ 12 ff. HinSchG (Pflicht ab 50 MA) — Meldungen, Fristen-Tracking, anonyme Eingaben.",
      en: "Whistleblower system per §§ 12 ff. HinSchG (mandatory from 50 employees) — reports, deadline tracking, anonymous submissions.",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["workspace"],
  },

  lizenz: {
    id: "lizenz",
    description: {
      de: "Lizenz-Center: Workspace-Tier, Nutzer-Lizenzen, Plattform-Lizenzen (DIN Media, juris) und Audit-Logs.",
      en: "License center: workspace tier, user licenses, platform licenses (DIN Media, juris) and audit logs.",
    },
    useCases: { de: [], en: [] },
    workflows: { de: [], en: [] },
    relatedModules: ["workspace"],
  },
};
