/**
 * Heuristik-Analyse von Ausschreibungs-Unterlagen / Vergabe-URLs.
 *
 * Pure Funktion — keine DB- oder Netzwerk-Zugriffe. Wird sowohl im
 * Server-Action-Pfad (Persistenz in Vorgang) als auch im Client (Live-
 * Vorschau) ausgeführt. Sobald Phase 1 mit Claude-API + RAG auf
 * VOB/A/B + GAEB-Parser anliegt, bleibt diese Heuristik als Fallback.
 *
 * Ziel: aussagekräftige Demo-Auswertung aus Klartext (Aufforderungs-
 * schreiben, BVB/ZVB-Auszug) plus optionalen URL- und Datei-Hinweisen,
 * damit das Frontend etwas Greifbares zeigt.
 */

import {
  detectPlatformFromUrl,
  type TenderPlatform,
} from "./platforms";

export type TenderFactKey =
  | "vergabestelle"
  | "vergabeNummer"
  | "verfahrensart"
  | "leistung"
  | "ort"
  | "auftragswert"
  | "ausfuehrungsbeginn"
  | "ausfuehrungsende";

export type TenderFact = {
  key: TenderFactKey;
  label: string;
  value: string | null;
  /** Quell-Hinweis für die KI-spätere-Validierung (Regex-Match-Snippet o.ä.). */
  source?: string;
};

export type TenderDeadline = {
  /** ISO-Datum YYYY-MM-DD, falls erkennbar; sonst null. */
  isoDate: string | null;
  /** Roher Treffer-Snippet aus dem Text. */
  raw: string;
  kind:
    | "angebotsabgabe"
    | "bieterfrage"
    | "bindefrist"
    | "zuschlagsfrist"
    | "ausfuehrungsbeginn"
    | "ausfuehrungsende"
    | "sonstige";
  label: string;
};

export type EligibilityCriterion = {
  label: string;
  detail: string;
  /** true = im Text als gefordert erkannt. */
  required: boolean;
};

export type AwardCriterion = {
  label: string;
  weightPercent: number | null;
  detail: string;
};

export type TenderRiskFinding = {
  level: "high" | "medium" | "info";
  title: string;
  detail: string;
  basis: string;
  snippet?: string;
};

export type BidRecommendation = {
  /** ja = klares Bieten, pruefen = bedingt, nein = abraten. */
  decision: "ja" | "pruefen" | "nein";
  score: number; // 0-100, höher = attraktiver
  reasons: string[];
  warnings: string[];
};

export type TenderAnalysisInput = {
  /** Plattform-URL oder Ausschreibungs-Detailseite, optional. */
  url?: string | null;
  /** Eingefügter Text aus Aufforderung / BVB / ZVB / LV-Vorbemerkung. */
  text?: string | null;
  /** Datei-Metadaten (nur Name + Größe — kein PDF-Parsing in dieser Phase). */
  files?: readonly { name: string; sizeBytes: number; mimeType?: string }[];
};

export type TenderAnalysisResult = {
  platform: TenderPlatform | null;
  facts: TenderFact[];
  deadlines: TenderDeadline[];
  eligibility: EligibilityCriterion[];
  award: AwardCriterion[];
  risks: TenderRiskFinding[];
  documentTypes: string[];
  bid: BidRecommendation;
  /** Roh-Inhalts-Längen für Status-Anzeige. */
  meta: {
    textChars: number;
    fileCount: number;
    fileBytes: number;
    hasGaeb: boolean;
    hasPlanLikely: boolean;
  };
};

const FACT_LABELS: Record<TenderFactKey, string> = {
  vergabestelle: "Vergabestelle",
  vergabeNummer: "Vergabe-Nummer",
  verfahrensart: "Verfahrensart",
  leistung: "Leistung",
  ort: "Ausführungsort",
  auftragswert: "Geschätzter Auftragswert",
  ausfuehrungsbeginn: "Ausführungsbeginn",
  ausfuehrungsende: "Fertigstellung",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function firstMatch(text: string, re: RegExp): string | null {
  const m = text.match(re);
  if (!m) return null;
  const captured = m[1] ?? m[0];
  return captured.trim().replace(/\s{2,}/g, " ");
}

/** Erkennt deutsches Datum (TT.MM.JJJJ, mit Uhrzeit optional) und gibt ISO + Snippet zurück. */
function parseGermanDate(snippet: string): string | null {
  const m = snippet.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function detectDocTypes(
  text: string,
  files: readonly { name: string }[]
): string[] {
  const found = new Set<string>();
  const hay = text.toLowerCase() + " " + files.map((f) => f.name.toLowerCase()).join(" ");
  const map: Record<string, RegExp> = {
    "Aufforderung zur Angebotsabgabe": /aufforderung\s+zur\s+angebot|formblatt\s*211/i,
    "BVB · Besondere Vertragsbedingungen": /bvb|besondere\s+vertragsbedingungen|formblatt\s*214/i,
    "ZVB · Zusätzliche Vertragsbedingungen": /zvb|zusätzliche\s+vertragsbedingungen|formblatt\s*215/i,
    "TVB · Technische Vertragsbedingungen": /tvb|technische\s+vertragsbedingungen|formblatt\s*216/i,
    "Leistungsverzeichnis (LV)": /\blv\b|leistungsverzeichnis|leistungsbeschreibung/i,
    "GAEB-Datei (DA XML)": /\.x8[3-6]\b|gaeb|d83|d84|d86/i,
    "Eignungs-Eigenerklärung": /eigenerklärung|formblatt\s*124|eee|einheitliche\s+europäische/i,
    "Pläne / Zeichnungen": /\.dwg|\.dxf|\.ifc|grundriss|schnittplan|lageplan/i,
  };
  for (const [label, re] of Object.entries(map)) {
    if (re.test(hay)) found.add(label);
  }
  return Array.from(found);
}

/* ------------------------------------------------------------------ */
/* Hauptanalyse                                                       */
/* ------------------------------------------------------------------ */

export function analyzeTender(input: TenderAnalysisInput): TenderAnalysisResult {
  const text = (input.text ?? "").trim();
  const files = input.files ?? [];
  const platform = input.url ? detectPlatformFromUrl(input.url) : null;

  const fileBytes = files.reduce((s, f) => s + (f.sizeBytes || 0), 0);
  const fileNames = files.map((f) => f.name).join(" ");
  const hasGaeb = /\.x8[3-6]\b|gaeb/i.test(text + " " + fileNames);
  const hasPlanLikely = /\.dwg|\.dxf|\.ifc|plan|grundriss|lageplan/i.test(text + " " + fileNames);

  /* ---------- 1. Eckdaten ---------- */
  const facts: TenderFact[] = [];

  const vergabestelle = firstMatch(
    text,
    /(?:vergabestelle|auftraggeber|öffentliche?r?\s+auftraggeber)\s*[:\-]?\s*([^\n\r]{4,160})/i
  );
  facts.push({
    key: "vergabestelle",
    label: FACT_LABELS.vergabestelle,
    value: vergabestelle,
  });

  const vergabeNr = firstMatch(
    text,
    /(?:vergabe[-\s]?nr\.?|vergabe[-\s]?nummer|verfahrens[-\s]?nr\.?|az\.?)\s*[:\-]?\s*([A-Z0-9][\w./\-]{2,40})/i
  );
  facts.push({
    key: "vergabeNummer",
    label: FACT_LABELS.vergabeNummer,
    value: vergabeNr,
  });

  let verfahrensart: string | null = null;
  if (/offenes\s+verfahren/i.test(text)) verfahrensart = "Offenes Verfahren (EU)";
  else if (/nicht[-\s]offenes\s+verfahren/i.test(text)) verfahrensart = "Nicht offenes Verfahren (EU)";
  else if (/verhandlungs(?:verfahren|vergabe)/i.test(text)) verfahrensart = "Verhandlungsverfahren";
  else if (/öffentliche\s+ausschreibung/i.test(text)) verfahrensart = "Öffentliche Ausschreibung (VOB/A § 3)";
  else if (/beschränkte\s+ausschreibung/i.test(text)) verfahrensart = "Beschränkte Ausschreibung (VOB/A § 3)";
  else if (/freihändige\s+vergabe/i.test(text)) verfahrensart = "Freihändige Vergabe (VOB/A § 3)";
  else if (platform?.scope === "eu") verfahrensart = "EU-Verfahren (Plattform-basiert)";
  facts.push({
    key: "verfahrensart",
    label: FACT_LABELS.verfahrensart,
    value: verfahrensart,
  });

  const leistung = firstMatch(
    text,
    /(?:leistung|gewerk|maßnahme|bauvorhaben|projekt(?:bezeichnung)?)\s*[:\-]\s*([^\n\r]{4,160})/i
  );
  facts.push({ key: "leistung", label: FACT_LABELS.leistung, value: leistung });

  const ort = firstMatch(
    text,
    /(?:ausführungs?ort|baustelle|ort)\s*[:\-]\s*([^\n\r]{2,120})/i
  );
  facts.push({ key: "ort", label: FACT_LABELS.ort, value: ort });

  const wert = firstMatch(
    text,
    /(?:geschätzter?\s+auftragswert|auftragswert|gesch\.?\s+wert)\s*[:\-]?\s*([\d\.\,]+\s*(?:eur|€|tsd\.?|mio\.?))/i
  );
  facts.push({ key: "auftragswert", label: FACT_LABELS.auftragswert, value: wert });

  const beginn = firstMatch(
    text,
    /(?:ausführungs?beginn|baubeginn|leistungsbeginn)\s*[:\-]?\s*([^\n\r]{4,40})/i
  );
  facts.push({ key: "ausfuehrungsbeginn", label: FACT_LABELS.ausfuehrungsbeginn, value: beginn });

  const ende = firstMatch(
    text,
    /(?:fertigstellung|leistungsende|bauende|abnahme)\s*[:\-]?\s*([^\n\r]{4,40})/i
  );
  facts.push({ key: "ausfuehrungsende", label: FACT_LABELS.ausfuehrungsende, value: ende });

  /* ---------- 2. Fristen ---------- */
  const deadlines: TenderDeadline[] = [];

  function pushDeadline(re: RegExp, kind: TenderDeadline["kind"], label: string) {
    const m = text.match(re);
    if (!m) return;
    const snippet = m[0];
    deadlines.push({
      isoDate: parseGermanDate(snippet),
      raw: snippet.replace(/\s+/g, " ").trim().slice(0, 160),
      kind,
      label,
    });
  }

  pushDeadline(
    /(?:angebots?(?:abgabe|frist|öffnung|eröffnung)|submissionstermin)[^\n\r]{0,80}\d{1,2}\.\d{1,2}\.\d{4}[^\n\r]{0,30}/i,
    "angebotsabgabe",
    "Angebotsabgabe"
  );
  pushDeadline(
    /(?:bieterfragen?|fragen\s+(?:der|durch)\s+bieter|nachfragefrist)[^\n\r]{0,80}\d{1,2}\.\d{1,2}\.\d{4}/i,
    "bieterfrage",
    "Frist Bieterfragen"
  );
  pushDeadline(
    /(?:bindefrist|zuschlagsfrist)[^\n\r]{0,80}\d{1,2}\.\d{1,2}\.\d{4}/i,
    "bindefrist",
    "Bindefrist / Zuschlagsfrist"
  );
  pushDeadline(
    /(?:ausführungsbeginn|baubeginn)[^\n\r]{0,40}\d{1,2}\.\d{1,2}\.\d{4}/i,
    "ausfuehrungsbeginn",
    "Ausführungsbeginn"
  );
  pushDeadline(
    /(?:fertigstellung|leistungsende)[^\n\r]{0,40}\d{1,2}\.\d{1,2}\.\d{4}/i,
    "ausfuehrungsende",
    "Fertigstellung"
  );

  /* ---------- 3. Eignungskriterien ---------- */
  const eligibility: EligibilityCriterion[] = [];

  const umsatzMatch = text.match(/(?:mindest)?(?:jahres)?umsatz[^\n\r]{0,80}?([\d\.,]+\s*(?:eur|€|mio\.?))/i);
  eligibility.push({
    label: "Mindestumsatz",
    detail: umsatzMatch
      ? `Gefordert: ${umsatzMatch[1]} (Snippet: „${umsatzMatch[0].slice(0, 80)}…")`
      : "Keine explizite Umsatz-Hürde im Text erkannt.",
    required: !!umsatzMatch,
  });

  const refMatch = text.match(/(\d+)\s*(?:vergleichbare|einschlägige)?\s*referenz/i);
  eligibility.push({
    label: "Referenzprojekte",
    detail: refMatch
      ? `Gefordert: ${refMatch[1]} vergleichbare Referenz(en).`
      : "Anzahl Referenzen nicht klar beziffert — Standardwert (i. d. R. 3) annehmen.",
    required: !!refMatch || /referenz/i.test(text),
  });

  const pq = /präqualifikation|pq[-\s]?vob|pq-?nummer/i.test(text);
  eligibility.push({
    label: "Präqualifikation (PQ-VOB)",
    detail: pq
      ? "PQ-VOB explizit verlangt — alternativ Eigenerklärung mit Einzelnachweisen."
      : "Nicht explizit verlangt; mit Eigenerklärung (Formblatt 124 / EEE) abdeckbar.",
    required: pq,
  });

  const biege = /bieter(gemeinschaft|ge)|arge\b/i.test(text);
  eligibility.push({
    label: "Bietergemeinschaft / ARGE",
    detail: biege
      ? "Bietergemeinschaft thematisiert — Vereinbarung + gesamtschuldnerische Haftung vor Abgabe regeln."
      : "Keine Aussage erkannt — nach VOB/A grundsätzlich zulässig.",
    required: false,
  });

  const tariftreue = /tariftreue|mindestlohn|landesvergabegesetz|tvgg/i.test(text);
  eligibility.push({
    label: "Tariftreue / Mindestlohn",
    detail: tariftreue
      ? "Tariftreue-/Mindestlohnerklärung gefordert — landesrechtlich (z. B. TVgG NRW, Bayer. ATG)."
      : "Keine landesrechtliche Tariftreue-Erklärung erkannt — Plattform-Default beachten.",
    required: tariftreue,
  });

  /* ---------- 4. Zuschlagskriterien ---------- */
  const award: AwardCriterion[] = [];
  const preisMatch = text.match(/(?:zuschlag|wertung)[^\n\r]{0,40}?preis[^\n\r]{0,40}?(\d{1,3})\s*%/i);
  const qualMatch = text.match(/(?:qualität|leistung|konzept)[^\n\r]{0,40}?(\d{1,3})\s*%/i);

  if (preisMatch || qualMatch) {
    if (preisMatch) {
      award.push({
        label: "Preis",
        weightPercent: Number(preisMatch[1]),
        detail: "Aus Wertungsmatrix erkannt.",
      });
    }
    if (qualMatch) {
      award.push({
        label: "Qualität / Konzept",
        weightPercent: Number(qualMatch[1]),
        detail: "Wertungsteil neben Preis — Konzept-Anlagen rechtzeitig vorbereiten.",
      });
    }
  } else {
    award.push({
      label: "Niedrigster Preis",
      weightPercent: 100,
      detail: "Default bei Bauleistungen nach VOB/A § 16 EU Abs. 6 — sofern keine MEAT-Wertungsmatrix angegeben.",
    });
  }

  /* ---------- 5. Risiko-Klauseln ---------- */
  const risks: TenderRiskFinding[] = [];

  const vsMatch = text.match(/vertragsstrafe[^\n\r]{0,200}/i);
  if (vsMatch) {
    const pctMatch = vsMatch[0].match(/(\d+(?:[.,]\d+)?)\s*%/);
    const pct = pctMatch ? Number(pctMatch[1].replace(",", ".")) : null;
    risks.push({
      level: pct !== null && pct > 5 ? "high" : "medium",
      title: pct !== null ? `Vertragsstrafe ${pct} %` : "Vertragsstrafe vorhanden",
      detail:
        pct !== null && pct > 5
          ? "Über 5 % Auftragssumme — nach BGH unwirksam, vor Angebotsabgabe rügen oder Bieterfrage stellen."
          : "Höhe prüfen, max. 5 % der Auftragssumme zulässig (BGH VII ZR 210/01).",
      basis: "§ 11 VOB/B · BGH VII ZR 210/01 · BGH VII ZR 56/15",
      snippet: vsMatch[0].slice(0, 200),
    });
  }

  const sicherMatch = text.match(/(?:vertragserfüllungs|gewährleistungs)[-\s]?(?:bürgschaft|sicherheit)[^\n\r]{0,120}/i);
  if (sicherMatch) {
    risks.push({
      level: "info",
      title: "Sicherheitsleistungen vereinbart",
      detail:
        "VEB üblich 5 % der Auftragssumme, GLB üblich 5 % der Schlussrechnungssumme. Bürgschafts-Linie rechtzeitig prüfen.",
      basis: "§ 17 VOB/B",
      snippet: sicherMatch[0].slice(0, 200),
    });
  }

  if (/anordnung|einseitig|geänderte\s+leistung|zusätzliche\s+leistung/i.test(text)) {
    risks.push({
      level: "info",
      title: "Einseitiges Anordnungsrecht des AG",
      detail:
        "AG kann nach § 1 VOB/B Leistung ändern/anordnen. Mehrkosten-Vorbehalt VOR Ausführung schriftlich (§ 2 Abs. 5/6 VOB/B), sonst Anspruchsverlust (BGH VII ZR 201/18).",
      basis: "§ 1 Abs. 3/4 · § 2 Abs. 5/6 VOB/B",
    });
  }

  if (/funktional(?:e\s+leistungsbeschreibung)?|globalpauschal|detailpauschal|pauschalfest/i.test(text)) {
    risks.push({
      level: "high",
      title: "Pauschalierung / funktionale Leistungsbeschreibung",
      detail:
        "Mengen- und Komplettheits-Risiko liegt beim AN. Vorab Massen prüfen und Annahmen dokumentieren.",
      basis: "§ 7 VOB/A · § 7c VOB/A · BGH VII ZR 102/18",
    });
  }

  if (/gewährleistung[^\n\r]{0,40}(\d+)\s*jahr/i.test(text)) {
    const m = text.match(/gewährleistung[^\n\r]{0,40}(\d+)\s*jahr/i);
    const years = m ? Number(m[1]) : 0;
    if (years > 4) {
      risks.push({
        level: "high",
        title: `Verlängerte Gewährleistung (${years} Jahre)`,
        detail:
          "VOB/B-Standard ist 4 Jahre; Verlängerung erhöht Rückstellungsbedarf und Subunternehmer-Pass-Through-Aufwand.",
        basis: "§ 13 Abs. 4 VOB/B",
      });
    }
  }

  if (hasGaeb) {
    risks.push({
      level: "info",
      title: "GAEB-LV erkannt",
      detail:
        "X83/X84-Datei vorhanden — direkt in Kalkulationssoftware importieren statt PDF abtippen. Spekulationspositionen prüfen.",
      basis: "GAEB DA XML 3.2",
    });
  }

  /* ---------- 6. Bid/No-Bid ---------- */
  let bidScore = 60; // neutraler Ausgangswert
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (deadlines.find((d) => d.kind === "angebotsabgabe")) {
    bidScore += 5;
    reasons.push("Angebotsfrist klar terminiert.");
  } else {
    warnings.push("Angebotsfrist nicht eindeutig erkannt — Plattform manuell prüfen.");
  }

  if (eligibility.find((e) => e.label === "Mindestumsatz" && e.required)) {
    bidScore -= 8;
    warnings.push("Mindestumsatz-Hürde — gegen eigene Bilanz prüfen.");
  }

  if (risks.find((r) => r.level === "high")) {
    bidScore -= 15;
    warnings.push("Mindestens eine Hochrisiko-Klausel im Vertragsentwurf.");
  }
  if (risks.find((r) => r.title.startsWith("Vertragsstrafe"))) {
    bidScore -= 5;
  }

  if (hasGaeb) {
    bidScore += 8;
    reasons.push("GAEB-LV vorhanden → schnelle, fehlerarme Kalkulation möglich.");
  }
  if (hasPlanLikely) {
    bidScore += 4;
    reasons.push("Pläne beigefügt → realistische Massenschätzung möglich.");
  }

  if (platform?.scope === "eu") {
    reasons.push("EU-Verfahren — formale Angriffsmöglichkeiten via Vergabekammer bleiben offen.");
  }
  if (platform?.scope === "kommune" || platform?.scope === "land") {
    reasons.push(`Plattform ${platform.label} bekannt — Bietertool/Signatur vorab testen.`);
  }

  if (text.length < 200 && files.length === 0 && !input.url) {
    bidScore = 0;
    warnings.push("Zu wenig Input für eine belastbare Einschätzung.");
  }

  bidScore = Math.max(0, Math.min(100, bidScore));
  const decision: BidRecommendation["decision"] =
    bidScore >= 65 ? "ja" : bidScore >= 40 ? "pruefen" : "nein";

  return {
    platform,
    facts,
    deadlines,
    eligibility,
    award,
    risks,
    documentTypes: detectDocTypes(text, files),
    bid: {
      decision,
      score: bidScore,
      reasons,
      warnings,
    },
    meta: {
      textChars: text.length,
      fileCount: files.length,
      fileBytes,
      hasGaeb,
      hasPlanLikely,
    },
  };
}

/** Demo-Beispieltext für „Beispiel laden". */
export const SAMPLE_TENDER_TEXT = `Auftraggeber: Stadt Lüdenscheid — Hochbauamt
Vergabe-Nr.: 2026-HB-014
Verfahrensart: Öffentliche Ausschreibung nach VOB/A § 3
Leistung: Dachsanierung Sporthalle Buckesfeld, ca. 1.250 m² inkl. Dämmung WLG 035
Ausführungsort: Sporthalle Buckesfelder Str. 12, 58511 Lüdenscheid
Geschätzter Auftragswert: 480.000 EUR
Ausführungsbeginn: 01.07.2026
Fertigstellung: 30.09.2026

Termine
- Angebotsabgabe bis: 12.06.2026, 11:00 Uhr (elektronisch über DTVP)
- Bieterfragen bis: 02.06.2026, 12:00 Uhr
- Bindefrist bis: 17.07.2026

Eignung
Mindestjahresumsatz im Bereich Bedachung: 1.500.000 EUR
3 vergleichbare Referenzen aus den letzten 5 Jahren.
Präqualifikation nach PQ-VOB oder Eigenerklärung Formblatt 124.
Tariftreue- und Mindestlohnerklärung nach TVgG NRW.

Wertung
Zuschlag auf das Angebot mit dem niedrigsten Preis (VOB/A § 16 EU Abs. 6).

Vertragsbedingungen
- Vertragsstrafe: 0,3 % der Auftragssumme je Werktag, max. 5 %.
- Vertragserfüllungsbürgschaft: 5 % der Auftragssumme.
- Gewährleistungsbürgschaft: 5 % der Schlussrechnungssumme, 5 Jahre Gewährleistung.
- VOB/B in Geltung; Anordnungsrecht des AG nach § 1 VOB/B.
- Funktionale Leistungsbeschreibung für Dachrandanschluss.

Anlagen
- Aufforderung zur Angebotsabgabe (Formblatt 211)
- BVB Formblatt 214 / ZVB Formblatt 215
- LV als GAEB DA XML (LV.X83)
- Lageplan, Dachaufsicht, Detail D-01 (PDF)`;
