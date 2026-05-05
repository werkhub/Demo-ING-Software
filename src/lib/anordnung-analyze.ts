/**
 * Stateless Anordnungs-Check: prüft eingehende AG-Kommunikation auf
 * Anordnungs-Charakter (§ 1 Abs. 3 / § 2 Abs. 5 VOB/B).
 *
 * Kein DB-Speicher — reines Analyse-Werkzeug. Kann später optional in queries
 * gespeichert werden.
 */

export type AnordnungLevel = "ja" | "wahrscheinlich" | "fraglich" | "nein";

export type AnordnungCheck = {
  label: string;
  detected: boolean;
  weight: number; // wie stark spricht das für eine Anordnung
  basis?: string;
};

export type AnordnungAnalysis = {
  level: AnordnungLevel;
  score: number; // 0–100
  checks: AnordnungCheck[];
  isMehrleistung: boolean;
  isGeaendert: boolean;
  recommendations: { title: string; detail: string; deadline_days: number }[];
  risks: string[];
};

const ORDER_PHRASES = [
  /\b(machen sie|setzen sie|stellen sie|tauschen sie|liefern sie|legen sie|bauen sie|bringen sie)\b/i,
  /\b(bitte (?:machen|setzen|stellen|tauschen|liefern|bauen|legen|montieren))\b/i,
  /\b(wir (?:wünschen|erwarten|verlangen|fordern) (?:dass|von ihnen))\b/i,
  /\b(ich (?:möchte|wünsche|verlange))\b/i,
  /\b(ändern sie|ergänzen sie|umstellen|umbauen)\b/i,
];

const CHANGE_PHRASES = [
  /\b(statt|anstatt|stattdessen|umgestalt\w*|umplanu\w*|abweichend|abänder\w*|abweichung|austausch\w*)\b/i,
  /\b(geänderte\s+(?:planung|ausführung|leistung)|abweichende\s+leistung)\b/i,
];

const ADDITIONAL_PHRASES = [
  /\b(zusätzlich|noch (?:eine|ein)|extra|außerdem|darüber hinaus)\b/i,
  /\b(mehr-?leistung|mehr arbeit|mehr aufwand)\b/i,
  /\b(eine weitere|ein weiteres|noch (?:eine|ein|einen))\b/i,
];

const URGENCY_PHRASES = [
  /\b(sofort|unverzüglich|umgehend|heute|bis morgen|bis nächste woche)\b/i,
];

const POLITE_REQUEST_PHRASES = [
  /\b(nur als (?:vorschlag|anregung|idee))\b/i,
  /\b(falls möglich|wenn möglich|gerne|wäre nett|könnten sie eventuell)\b/i,
];

function check(label: string, re: RegExp, text: string, weight: number, basis?: string): AnordnungCheck {
  return { label, detected: re.test(text), weight, basis };
}

function checkAny(label: string, regs: RegExp[], text: string, weight: number, basis?: string): AnordnungCheck {
  return {
    label,
    detected: regs.some((re) => re.test(text)),
    weight,
    basis,
  };
}

export function analyzeAnordnung(text: string): AnordnungAnalysis {
  const t = text.trim();

  const checks: AnordnungCheck[] = [
    checkAny(
      "Imperativ / Aufforderung erkennbar",
      ORDER_PHRASES,
      t,
      30,
      "BGH VII ZR 201/18 (Anordnungs-Charakter)"
    ),
    checkAny(
      "Geänderte Leistung beschrieben",
      CHANGE_PHRASES,
      t,
      25,
      "§ 2 Abs. 5 VOB/B"
    ),
    checkAny(
      "Zusätzliche Leistung beschrieben",
      ADDITIONAL_PHRASES,
      t,
      25,
      "§ 2 Abs. 6 VOB/B"
    ),
    checkAny(
      "Dringlichkeits-Sprache (Frist gesetzt)",
      URGENCY_PHRASES,
      t,
      10,
      undefined
    ),
    checkAny(
      "Höfliche Anregung (KEIN Anordnungs-Charakter)",
      POLITE_REQUEST_PHRASES,
      t,
      -25,
      "BGH VII ZR 201/18"
    ),
  ];

  const detectedScore = checks
    .filter((c) => c.detected)
    .reduce((s, c) => s + c.weight, 0);

  const score = Math.max(0, Math.min(100, detectedScore));

  let level: AnordnungLevel;
  if (score >= 60) level = "ja";
  else if (score >= 40) level = "wahrscheinlich";
  else if (score >= 20) level = "fraglich";
  else level = "nein";

  const isGeaendert = checks.find((c) => c.label.startsWith("Geänderte"))?.detected ?? false;
  const isMehrleistung = checks.find((c) => c.label.startsWith("Zusätzliche"))?.detected ?? false;

  const recommendations: AnordnungAnalysis["recommendations"] = [];
  const risks: string[] = [];

  if (level === "ja" || level === "wahrscheinlich") {
    if (isMehrleistung || isGeaendert) {
      recommendations.push({
        title: "Mehrkosten-Ankündigung VOR Ausführung versenden",
        detail:
          "§ 2 Abs. 5 VOB/B verlangt Ankündigung der Mehrkosten dem Grunde nach VOR Ausführung. Bei Versäumnis Anspruchsverlust (BGH VII ZR 201/18).",
        deadline_days: 1,
      });
    }
    recommendations.push({
      title: "Anordnung schriftlich bestätigen lassen",
      detail:
        "AG zur schriftlichen Bestätigung auffordern (E-Mail genügt). Mündliche Anordnungen haben Beweisprobleme.",
      deadline_days: 2,
    });
    recommendations.push({
      title: "Bautagebuch-Eintrag mit Anordnungstext",
      detail:
        "Wortlaut, Datum, Uhrzeit und beteiligte Personen tagesgenau dokumentieren.",
      deadline_days: 1,
    });
    if (isGeaendert) {
      recommendations.push({
        title: "Bedenken prüfen (§ 4 Abs. 3 VOB/B)",
        detail:
          "Falls die geänderte Leistung technische/qualitative Bedenken auslöst — Bedenken VOR Ausführung schriftlich anmelden.",
        deadline_days: 2,
      });
    }
    if (isMehrleistung || isGeaendert) {
      recommendations.push({
        title: "Nachtragsangebot kalkulieren",
        detail:
          "Detailliertes Nachtragsangebot binnen 14 Werktagen einreichen, Urkalkulation als Basis halten.",
        deadline_days: 14,
      });
    }
  } else if (level === "fraglich") {
    recommendations.push({
      title: "Klärung herbeiführen",
      detail:
        "Schriftlich nachfragen, ob es sich um eine verbindliche Anordnung oder eine Anregung handelt. Erst nach Klärung handeln.",
      deadline_days: 2,
    });
  }

  if (POLITE_REQUEST_PHRASES.some((re) => re.test(t))) {
    risks.push(
      'Vorsicht: Höfliche Formulierungen wie „falls möglich" sprechen gegen Anordnungs-Charakter. Klärung vor Ausführung.'
    );
  }
  if (level === "ja" && !checks[3].detected) {
    risks.push(
      "Keine Frist gesetzt — Mehrkosten-Ankündigung sollte trotzdem unverzüglich erfolgen, BEVOR Ausführung beginnt."
    );
  }
  if (URGENCY_PHRASES.some((re) => re.test(t)) && level !== "ja") {
    risks.push(
      "Dringlichkeitssprache erkannt, aber Anordnungs-Charakter unklar. Risiko: Druck-Aufbau ohne klaren Auftrag."
    );
  }

  return {
    level,
    score,
    checks,
    isGeaendert,
    isMehrleistung,
    recommendations,
    risks,
  };
}
