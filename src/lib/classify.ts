export type Urgency = "critical" | "warning" | "info";

export type BautagebuchClassification = {
  trigger: string | null;
  triggerLabel: string | null;
  urgency: Urgency;
  suggestion: string | null;
  /** Wenn der Trigger eine Folgefrist erfordert: Vorlage für die Frist. */
  followUpFrist?: {
    task: string;
    deadlineDaysFromNow: number;
    legalBasis: string;
  };
};

type BautagebuchRule = Omit<BautagebuchClassification, "trigger"> & {
  trigger: string;
  match: RegExp;
};

export const BAUTAGEBUCH_RULES: BautagebuchRule[] = [
  {
    match: /\b(machen sie|setzen sie|stellen sie|ändern|anordnung|anweisung|sagt:|sagte:)\b/i,
    trigger: "anordnung",
    triggerLabel: "Anordnung erkannt",
    urgency: "critical",
    suggestion: "§ 2 Abs. 5 Mehrkosten-Ankündigung VOR Ausführung — sonst Anspruchsverlust.",
    followUpFrist: {
      task: "Mehrkosten-Ankündigung VOR Ausführung versenden",
      deadlineDaysFromNow: 1,
      legalBasis: "§ 2 Abs. 5 VOB/B",
    },
  },
  {
    match: /\b(mangelrüge|mangel-rüge|putz-?rissen?|risse?\s+im|putzschäden|gerügt|nachbesserung)\b/i,
    trigger: "mangelruege",
    triggerLabel: "Eingehende Mangelrüge",
    urgency: "critical",
    suggestion: "Sofort Rüge-Analyse-Modul öffnen — Frist und Berechtigung prüfen.",
    followUpFrist: {
      task: "Mangelrüge prüfen + beantworten",
      deadlineDaysFromNow: 14,
      legalBasis: "§ 13 Abs. 5 VOB/B",
    },
  },
  {
    match: /\b(bedenken|untergrund.*(porös|altanstrich|nicht\s+geeignet|mangel)|altanstrich|porös)\b/i,
    trigger: "bedenken",
    triggerLabel: "Bedenken-Trigger",
    urgency: "critical",
    suggestion: "§ 4 Abs. 3 Bedenkenanmeldung sofort schriftlich — sonst Mit-Haftung.",
    followUpFrist: {
      task: "Bedenkenanmeldung schriftlich versenden",
      deadlineDaysFromNow: 2,
      legalBasis: "§ 4 Abs. 3 VOB/B",
    },
  },
  {
    match: /\b(behinderung|verzöger\w*|fehlt|fehlen|witterung|regen|stillstand|warten\s+auf|nicht\s+geliefert|tga.*pläne?)\b/i,
    trigger: "behinderung",
    triggerLabel: "Mögliche Behinderung",
    urgency: "warning",
    suggestion: "Plan-Anforderung schriftlich · BHA bei Verzug >5 Tagen (§ 6 Abs. 1 VOB/B).",
    followUpFrist: {
      task: "Behinderungsanzeige (BHA) versenden",
      deadlineDaysFromNow: 5,
      legalBasis: "§ 6 Abs. 1 VOB/B",
    },
  },
  {
    match: /\b(zahlung|abschlagsrechnung|schlussrechnung|säumig|mahnung|verzug.*tagen?|rechnung.*offen|geld\s+nicht)\b/i,
    trigger: "zahlung",
    triggerLabel: "Zahlungsverzug",
    urgency: "warning",
    suggestion: "Mahnstufen verfolgen · Verzugszinsen 9 % über Basis · ab 30 Tagen Kündigungsrecht (§ 9 VOB/B).",
    followUpFrist: {
      task: "Mahnstufe verfolgen / Zahlung anmahnen",
      deadlineDaysFromNow: 14,
      legalBasis: "§ 9 VOB/B",
    },
  },
];

export function classifyBautagebuch(text: string): BautagebuchClassification {
  for (const rule of BAUTAGEBUCH_RULES) {
    if (rule.match.test(text)) {
      return {
        trigger: rule.trigger,
        triggerLabel: rule.triggerLabel,
        urgency: rule.urgency,
        suggestion: rule.suggestion,
        followUpFrist: rule.followUpFrist,
      };
    }
  }
  return { trigger: null, triggerLabel: null, urgency: "info", suggestion: null };
}

type CategoryRule = { name: string; match: RegExp };

export const QUERY_CATEGORIES: CategoryRule[] = [
  { name: "Vertragsstrafe", match: /\b(vertragsstrafe|prozent.*strafe|verzug.*strafe|tagessatz)\b/i },
  { name: "Behinderung", match: /\b(behinderung|bha|plan.*fehl|witterung|verzöger|störung)\b/i },
  { name: "Mängel", match: /\b(mangel|mängel|rüge|nachbesserung|nachbesseru|risse?)\b/i },
  { name: "Abnahme", match: /\b(abnahme|annahme|bagatell|teilabnahme|fiktiv\w*\s+abnahme)\b/i },
  { name: "Sicherheiten", match: /\b(sicherheit|bürgschaft|einbehalt|aval)\b/i },
  { name: "Nachträge", match: /\b(nachtrag|mehrkosten|mehrleistung|geänderte?\s+leistung)\b/i },
  { name: "Kündigung", match: /\b(kündigung|außerordentlich\w*|wichtiger\s+grund)\b/i },
  { name: "HOAI", match: /\b(hoai|honorar|leistungsphase)\b/i },
];

export function categorizeQuery(question: string): string {
  for (const c of QUERY_CATEGORIES) {
    if (c.match.test(question)) return c.name;
  }
  return "Allgemein";
}
