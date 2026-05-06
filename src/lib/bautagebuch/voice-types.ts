/**
 * Strukturierte Doku-Typen für den Bautagebuch-Sprach-Eintrag.
 * Werden client- und serverseitig genutzt — daher in einem separaten File
 * ohne Server-Imports.
 */

export type Anwesender = {
  name: string;
  funktion?: string;
  firma?: string;
  /** HH:mm — optional. */
  von?: string;
  bis?: string;
};

export type Arbeit = {
  gewerk: string;
  bauteil?: string;
  beschreibung: string;
};

export type Lieferung = {
  lieferant: string;
  material: string;
  menge?: number;
  einheit?: string;
  lieferscheinNr?: string;
};

export type Anordnung = {
  erteilerName: string;
  beschreibung: string;
  /** Hinweis: muss vor Ausführung schriftlich gesetzt werden (§ 2 Abs. 5/6 VOB/B). */
  mehrkostenVorbehaltErforderlich: boolean;
  mehrkostenVorbehaltGesetzt: boolean;
};

export type Vorfall = {
  art: "unfall" | "beinahe" | "gefahr";
  beschreibung: string;
  personenschaden: boolean;
  /** DGUV-Meldepflicht > 3 Tage Arbeitsausfall. */
  dguvMeldepflichtig: boolean;
};

export type WitterungParse = {
  condition?: "sonnig" | "bewoelkt" | "regen" | "schnee" | "frost" | "sturm" | "nebel";
  temperatureCelsius?: number;
};

/* ------------------------------------------------------------------ */
/* Projekt-Kontext für KI-gestützte Erkennung                         */
/* ------------------------------------------------------------------ */

export type RecentEntrySnippet = {
  id: string;
  entryDate: string;
  category: string;
  urgency: "info" | "warning" | "critical";
  textSnippet: string;
  authorName: string;
};

export type KnownPerson = {
  name: string;
  funktion?: string;
  firma?: string;
  /** Quelle: aus NU-Stammdaten oder aus früheren BTB-Einträgen extrahiert. */
  source: "subcontractor" | "history";
  /** Wie oft in den letzten 30 Tagen erwähnt? Für Confidence. */
  occurrences: number;
};

export type KnownLieferant = {
  name: string;
  /** Bekannte Lieferschein-Nummern aus den letzten 30 Tagen — Duplikat-Detection. */
  knownLieferscheinNrs: string[];
  occurrences: number;
};

export type OpenAnordnung = {
  entryId: string;
  entryDate: string;
  beschreibung: string;
  vorbehaltGesetzt: boolean;
};

export type OpenBedenken = {
  entryId: string;
  entryDate: string;
  text: string;
};

export type ProjectVoiceContext = {
  projectId: string;
  projectStatus: string | null;
  siteAddress: string | null;
  lat: number | null;
  lon: number | null;
  recentEntries: RecentEntrySnippet[];
  knownPersons: KnownPerson[];
  knownLieferanten: KnownLieferant[];
  openAnordnungen: OpenAnordnung[];
  openBedenken: OpenBedenken[];
  /** Erwartete Gewerke aus Projekt-Status — Plausibilitäts-Check. */
  expectedGewerke: string[];
};

/* ------------------------------------------------------------------ */
/* Erkennungs-Confidence pro Person/Lieferant — vom Parser ergänzt    */
/* ------------------------------------------------------------------ */

export type AnwesenderWithConfidence = Anwesender & {
  /** "known" = Match gegen Projekt-Stamm/Historie, "new" = unbekannt → bestätigen. */
  matchSource?: "subcontractor" | "history" | "new";
};

export type LieferungWithFlags = Lieferung & {
  /** true wenn Lieferschein-Nr in letzten 30 Tagen schon erfasst → Duplikat-Verdacht. */
  duplicateLieferscheinNr?: boolean;
  knownLieferant?: boolean;
};

export type PlausibilityHint = {
  level: "info" | "warning";
  text: string;
};

export type VoiceParseResult = {
  /** Roh-Transkript komplett (nicht modifiziert). */
  transkript: string;
  /** Heuristisch erkannte Struktur. */
  witterung: WitterungParse;
  staffHoursOwn?: number;
  staffHoursSubcontractors?: number;
  anwesende: AnwesenderWithConfidence[];
  arbeiten: Arbeit[];
  lieferungen: LieferungWithFlags[];
  anordnungen: Anordnung[];
  vorfaelle: Vorfall[];
  bedenken: string[]; // Texte mit "Bedenken angemeldet wegen ..."
  behinderungen: string[];
  /** Stichworte, die für die Kategorie-Auswahl genutzt werden. */
  kategorieVorschlag:
    | "allgemein"
    | "anordnung"
    | "behinderung"
    | "mangel"
    | "bedenken"
    | "lieferung"
    | "besichtigung"
    | "personal";
  /** Dringlichkeits-Vorschlag für UI (analog bestehendem `urgency`-Feld). */
  urgencyVorschlag: "info" | "warning" | "critical";
  /** Plausibilitäts-Hinweise aus Projekt-Kontext (z. B. Gewerk passt nicht zu Bauphase). */
  plausibility: PlausibilityHint[];
};
