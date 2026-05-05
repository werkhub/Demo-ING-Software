/**
 * Regelbasierter Risiko-Scan für Bauvertragstexte.
 * Sucht typische Klauseln, die zu Streit führen oder unwirksam sind.
 *
 * Kein Volltext-Speichern erforderlich — die Findings sind eigenständig.
 */

export type FindingLevel = "high" | "medium" | "info";

export type Finding = {
  level: FindingLevel;
  title: string;
  description: string;
  basis: string;
  /** Treffer im Text (gekürzt) für Belegbarkeit. */
  snippet?: string;
};

const PATTERNS: Array<{
  level: FindingLevel;
  match: RegExp;
  title: string;
  description: string;
  basis: string;
  snippet?: (m: RegExpMatchArray) => string;
}> = [
  {
    level: "high",
    match: /vertragsstrafe[^\.]{0,300}?(\d{1,2}(?:[.,]\d+)?)\s*%[^\.]{0,200}?(?:auftragssumme|nettoauftragswert)/i,
    title: "Vertragsstrafe-Höchstgrenze prüfen",
    description:
      "Vertragsstrafe in AGB-Klauseln über 5 % der Auftragssumme ist nach BGH unwirksam. Nicht reduzierbar (BGH VII ZR 210/01) — die ganze Klausel fällt weg, wenn überschritten. Bitte exakte Höhe prüfen.",
    basis: "BGH VII ZR 210/01 · § 307 BGB",
  },
  {
    level: "high",
    match: /vertragsstrafe[^\.]{0,300}?(\d+(?:[.,]\d+)?)\s*%[^\.]{0,200}?(?:tag|werktag)/i,
    title: "Vertragsstrafe-Tagessatz prüfen",
    description:
      "Tagessatz über 0,3 % der Auftragssumme je Werktag macht die Klausel insgesamt unwirksam (BGH VII ZR 141/03), auch wenn Höchstgrenze eingehalten wird.",
    basis: "BGH VII ZR 141/03",
  },
  {
    level: "high",
    match: /(zahlung|fälligkeit)[^\.]{0,200}?(\d{2,3})\s*tag(en)?/i,
    title: "Zahlungsfrist über 30 Tage?",
    description:
      "Zahlungsziele über 30 Tage in AGB sind kritisch. Nach § 271a BGB sind über 60 Tage unwirksam, soweit unangemessen.",
    basis: "§ 271a BGB",
  },
  {
    level: "medium",
    match: /sicherheitseinbehalt[^\.]{0,200}?(\d{1,2}(?:[.,]\d+)?)\s*%/i,
    title: "Sicherheitseinbehalt-Höhe prüfen",
    description:
      "Sicherheitseinbehalt ab 10 % ist in AGB regelmäßig unangemessen. Üblich + akzeptiert: 5 % nach § 17 VOB/B. Ablöse durch Bürgschaft muss möglich sein (BGH VII ZR 56/06).",
    basis: "§ 17 VOB/B · BGH VII ZR 56/06",
  },
  {
    level: "high",
    match: /(?:angekündigt|vorbehalten)[^\.]{0,150}?bei\s+der\s+abnahme/i,
    title: "Vertragsstrafe-Vorbehalt-Pflicht erkannt",
    description:
      "Klausel verlangt expliziten Vorbehalt bei Abnahme. Ohne diesen Vorbehalt entfällt der Anspruch — bei Abnahme zwingend ins Protokoll (BGH VII ZR 210/01).",
    basis: "§ 11 Abs. 4 VOB/B · BGH VII ZR 210/01",
  },
  {
    level: "medium",
    match: /skonto[^\.]{0,200}?(\d+(?:[.,]\d+)?)\s*%/i,
    title: "Skonto-Klausel",
    description:
      "Skonto in AGB nur wirksam, wenn klar definierte Frist + Höhe. Bei zu kurzer Skonto-Frist (< 14 Tage) oder Verknüpfung mit unklaren Bedingungen unwirksam.",
    basis: "§ 307 BGB",
  },
  {
    level: "medium",
    match: /förmlich(e|er)\s+abnahme[^\.]{0,200}?(?:verzicht|entfäll|nicht\s+erforderlich)/i,
    title: "Verzicht auf förmliche Abnahme?",
    description:
      "Verzicht auf förmliche Abnahme begünstigt fiktive Abnahme nach Inbenutzungnahme — riskant für AN, da Beweislast früher umkehrt. Nur mit Bedacht akzeptieren.",
    basis: "§ 12 Abs. 5 VOB/B",
  },
  {
    level: "high",
    match: /(?:vob\/b\s+findet\s+keine\s+anwendung|abweichend\s+von\s+vob)/i,
    title: "VOB/B-Abweichungen erkannt",
    description:
      'Vertrag enthält Abweichungen oder Ausschluss der VOB/B. Wenn die VOB/B nicht „als Ganzes" einbezogen ist, unterliegen alle Klauseln der vollen AGB-Inhaltskontrolle (§§ 307 ff. BGB) — das öffnet weitreichende Unwirksamkeit.',
    basis: "§ 307 BGB · BGH VII ZR 71/03",
  },
  {
    level: "info",
    match: /verbraucher\w*/i,
    title: "Verbraucher-Bezug erkannt",
    description:
      "Bei Verbraucherbauvertrag (§ 650i BGB) gelten erweiterte Schutzrechte: 14-tägiges Widerrufsrecht, Baubeschreibung, Höchstgrenzen für Abschlagszahlungen.",
    basis: "§§ 650i ff. BGB",
  },
  {
    level: "info",
    match: /gerichtsstand[^\.]{0,200}?\b([a-zäöü]+)\b/i,
    title: "Gerichtsstand-Klausel",
    description:
      "Gerichtsstand-Vereinbarungen sind nur zwischen Kaufleuten frei vereinbar (§ 38 ZPO). Mit Verbrauchern unwirksam.",
    basis: "§ 38 ZPO",
  },
];

function snippetAround(match: RegExpMatchArray, text: string, len = 100): string {
  if (match.index === undefined) return match[0];
  const start = Math.max(0, match.index - 30);
  const end = Math.min(text.length, match.index + match[0].length + len);
  let s = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "… " + s;
  if (end < text.length) s = s + " …";
  return s;
}

export type ContractRiskAnalysis = {
  score: number; // 0–100
  findings: Finding[];
  charactersScanned: number;
};

export function scanContract(text: string): ContractRiskAnalysis {
  const findings: Finding[] = [];

  for (const p of PATTERNS) {
    const m = text.match(p.match);
    if (m) {
      findings.push({
        level: p.level,
        title: p.title,
        description: p.description,
        basis: p.basis,
        snippet: snippetAround(m, text),
      });
    }
  }

  const score = findings.reduce(
    (s, f) => s + (f.level === "high" ? 25 : f.level === "medium" ? 12 : 4),
    0
  );

  return {
    score: Math.min(100, score),
    findings,
    charactersScanned: text.length,
  };
}
