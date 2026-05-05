/**
 * HOAI 2021 — Typdefinitionen für Honorartafeln und Leistungsbilder.
 *
 * Fünf Hauptleistungsbilder, die wir abbilden:
 *   gebaeude        — § 34 + Anlage 10 (Gebäudeplanung, Innenräume)
 *   ingenieurbau    — § 43 + Anlage 12 (Brücken, Stützmauern, Wasser, Tunnel) · Honorartafel § 44
 *   tragwerk        — § 51 + Anlage 14 (Tragwerksplanung)
 *   tga             — § 55 + Anlage 15 (Technische Ausrüstung, Gewerke 1-8)
 *   verkehr         — § 47 + Anlage 13 (Straßen-, Schienen-, Flugverkehr) · Honorartafel § 48
 *
 * Freianlagen (§ 39 + Anl. 11) folgt nach Pilot-Feedback.
 */

export type Leistungsbild =
  | "gebaeude"
  | "ingenieurbau"
  | "tragwerk"
  | "tga"
  | "verkehr";

export type Honorarzone = "I" | "II" | "III" | "IV" | "V";

/**
 * Eine Stützstelle der HOAI-Tafel.
 * - kostenCents: anrechenbare Kosten in Cents
 * - zoneI..zoneV: jeweils {min, max} Honorar in Cents (für die Gesamtleistung = 100% LP)
 *
 * Zwischen Stützstellen wird linear interpoliert.
 */
export type Stuetzstelle = {
  kostenCents: number;
  zoneI: { minCents: number; maxCents: number };
  zoneII: { minCents: number; maxCents: number };
  zoneIII: { minCents: number; maxCents: number };
  zoneIV: { minCents: number; maxCents: number };
  zoneV: { minCents: number; maxCents: number };
};

export type Honorartafel = {
  leistungsbild: Leistungsbild;
  paragraph: string;
  anlage: string;
  /** Kosten-Min/Max der Tafel — außerhalb gilt die Tafel nicht. */
  kostenBereichMinCents: number;
  kostenBereichMaxCents: number;
  stuetzstellen: Stuetzstelle[];
};

/**
 * Leistungsphase 1..9. Tragwerksplanung kennt nur LP1-6.
 */
export type Leistungsphase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Anteil je LP am Gesamthonorar (Summe = 1.0). Quelle: HOAI 2021 § 34, § 47, § 51, § 55.
 */
export type LpAnteile = Partial<Record<Leistungsphase, number>>;

/**
 * Honorarwahl innerhalb der Zone — Mindest, Mittel oder Höchstsatz.
 * Mittelwert = (min + max) / 2.
 */
export type Honorarsatz = "min" | "mittel" | "max";

/**
 * Eingabe für die Honorarberechnung.
 */
export type HoaiInput = {
  leistungsbild: Leistungsbild;
  zone: Honorarzone;
  satz: Honorarsatz;
  /** Anrechenbare Kosten netto in Cents. */
  anrechenbareKostenCents: number;
  /**
   * Beauftragte Leistungsphasen. Wenn nicht beauftragt: nicht im Object.
   * Bei Tragwerksplanung max. LP6.
   */
  beauftragteLps: Leistungsphase[];
  /**
   * Optional: Umbau-/Modernisierungs-Zuschlag in Prozentpunkten (0..80).
   * § 6 Abs. 2 Nr. 5 HOAI — wird auf das Grundhonorar aufgeschlagen.
   */
  umbauZuschlagPct?: number;
  /**
   * Optional: Nebenkostenpauschale in Prozent des Grundhonorars (typisch 5-8%).
   */
  nebenkostenPauschalePct?: number;
};

export type HoaiResult = {
  /** Vollhonorar = Honorar bei 100% LP-Beauftragung (für Referenz). */
  vollhonorarCents: number;
  /** Grundhonorar = Vollhonorar × Σ(LP-Anteile beauftragter LPs). */
  grundhonorarCents: number;
  /** Umbau-Zuschlag absolut in Cents. */
  umbauZuschlagCents: number;
  /** Nebenkosten absolut in Cents. */
  nebenkostenCents: number;
  /** Endsumme netto = Grundhonorar + Umbauzuschlag + Nebenkosten. */
  honorarsummeNettoCents: number;
  /** LP-Aufsplitt: pro beauftragter LP der absolute Anteil in Cents (vom Grundhonorar). */
  lpAufsplittCents: Partial<Record<Leistungsphase, number>>;
  /**
   * Für die UI: welcher %-Anteil der LPs ist insgesamt beauftragt (z.B. 0.78 = 78%).
   */
  beauftragterLpAnteil: number;
  /** Verwendete Stützstellen-Indizes (Debug). */
  debug: {
    untereSchwelleCents: number;
    obereSchwelleCents: number;
    interpolationsfaktor: number;
  };
};

/**
 * Fehlertypen für Eingabe-Validierung.
 */
export type HoaiError =
  | { kind: "kosten_unter_min"; minCents: number; gotCents: number }
  | { kind: "kosten_ueber_max"; maxCents: number; gotCents: number }
  | { kind: "ungueltige_lp"; lp: number; leistungsbild: Leistungsbild }
  | { kind: "keine_lps_beauftragt" };
