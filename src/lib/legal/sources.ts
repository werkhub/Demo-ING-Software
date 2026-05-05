export type CourtSource = {
  azCanonical: string;
  court: string;
  date: string;
  topic: string;
  citation: string;
  basis: string;
  url?: string;
};

export const COURT_SOURCE_BASIS = {
  free:
    "Amtliches Werk · § 5 UrhG · Leitsätze und Tenor sind gemeinfrei. Lange Auszüge nur paraphrasiert.",
  licensed:
    "Lizenziert über juris/beck-online · Volltext nur für autorisierte Nutzer · Anzeige reduziert auf Leitsatz und Az.",
} as const;

export const COURT_SOURCES: CourtSource[] = [
  {
    azCanonical: "BGH VII ZR 13/16",
    court: "Bundesgerichtshof",
    date: "2017-04-25",
    topic: "Angemessene Frist zur Mängelbeseitigung",
    citation: "BGH, Urt. v. 25.04.2017 — VII ZR 13/16",
    basis: COURT_SOURCE_BASIS.free,
    url: "https://www.bundesgerichtshof.de/",
  },
  {
    azCanonical: "BGH VII ZR 11/08",
    court: "Bundesgerichtshof",
    date: "2009-09-24",
    topic: "Form der Behinderungsanzeige nach VOB/B",
    citation: "BGH, Urt. v. 24.09.2009 — VII ZR 11/08",
    basis: COURT_SOURCE_BASIS.free,
    url: "https://www.bundesgerichtshof.de/",
  },
];

export function findCourtSource(az: string): CourtSource | undefined {
  return COURT_SOURCES.find((s) => s.azCanonical === az);
}
