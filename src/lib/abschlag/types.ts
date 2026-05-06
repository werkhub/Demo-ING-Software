/**
 * Typen für die Abschlagsrechnungs-Prüfung — werden client- und serverseitig
 * verwendet, deshalb in einem separaten File ohne Server-Imports.
 */

export type AbschlagPosition = {
  /** Ordnungszahl, z. B. "01.020.030" oder "1.4.7". */
  oz: string;
  beschreibung: string;
  /** Mengen-Einheit (m, m², m³, Stk, t, …). */
  einheit: string;
  /** Vom Lieferanten in dieser Rechnung angesetzte Menge. */
  menge: number;
  /** Vom Lieferanten angesetzter Einheitspreis netto EUR. */
  einheitspreis: number;
  /** Optional: Snapshot aus dem LV — Sollwerte zum Vergleich. */
  lvEinheitspreis?: number | null;
  lvMengeMax?: number | null;
  /** Optional: gemessene Menge aus Aufmaß-Modul. */
  aufmassMengeIst?: number | null;
};

export type AbschlagInput = {
  /** Header-Daten */
  rechnungsNr: string;
  rechnungsdatum: string; // YYYY-MM-DD
  rechnungseingangsdatum: string; // YYYY-MM-DD
  lieferant: string;
  abschlagNr: number;

  /** Vertragliche Eckdaten */
  auftragssummeNetto: number;
  vertragsstrafeOffenEur?: number | null;

  /** Steuerliche Klassifizierung */
  istBauleistungNu: boolean; // §13b UStG Reverse-Charge?
  ustSatz: number; // 19 oder 0
  freistellungsbescheinigungVorhanden: boolean; // §48 EStG

  /** Positionen */
  positionen: AbschlagPosition[];

  /** Bereits gezahlte Abschläge (kumulativ, brutto) */
  bisherGezahltBrutto: number;

  /** Konditionen */
  sicherheitseinbehaltVebProzent: number; // 0-10, üblich 5
  sicherheitseinbehaltGlbProzent: number; // 0-10, üblich 5 — bei Schluss; bei Abschlag oft 0
  skontoFristTage?: number | null;
  skontoProzent?: number | null;
};

export type CheckCategory =
  | "lv_match"
  | "aufmass"
  | "kumulativ"
  | "sicherheit"
  | "skonto"
  | "ust"
  | "bauabzug"
  | "frist"
  | "form"
  | "vertragsstrafe";

export type CheckFinding = {
  level: "high" | "medium" | "info";
  category: CheckCategory;
  /** OZ der betroffenen Position (falls positionsspezifisch). */
  oz?: string;
  title: string;
  detail: string;
  /** § / Norm-Verweis. */
  basis: string;
  /** Empfohlene Kürzung in EUR netto (falls beziffert). */
  kuerzungNettoEur?: number;
};

export type PositionStatus = {
  oz: string;
  status: "ok" | "warn" | "err";
  notes: string[];
};

export type AbschlagCheckResult = {
  /** Pro-Position-Status (gleich lang wie input.positionen). */
  positions: PositionStatus[];
  /** Alle Befunde — sortiert: high → medium → info. */
  findings: CheckFinding[];

  /** Rechnerische Summen aus Positionen × Einheitspreis. */
  rechnerischeNettosumme: number;
  rechnerischeBruttosumme: number;
  /** Vom Lieferanten in der Rechnung ausgewiesene Brutto-Summe (= Eingang). */
  rechnungBrutto: number;

  /** Zahlbarmachungs-Berechnung */
  empfohleneKuerzungNetto: number;
  empfohleneKuerzungBrutto: number;
  sicherheitseinbehaltEur: number;
  bauabzugsEinbehaltEur: number;
  /** Bereits gezahlt (kumulativ). */
  bereitsGezahltBrutto: number;
  /** Empfohlene Auszahlung jetzt (brutto). */
  empfohleneZahlungBrutto: number;

  /** Skonto-Frist (YYYY-MM-DD), falls anwendbar. */
  skontoMoeglichBis: string | null;
  skontoBetragEur: number | null;

  /** Gesamt-Empfehlung. */
  decision: "freigeben" | "kuerzen" | "ablehnen";
  /** 0-100, höher = sauberer. */
  score: number;

  /** Markdown-Anschreiben an Lieferant — Korrektur oder Freigabe. */
  letterDraftMarkdown: string;
};
