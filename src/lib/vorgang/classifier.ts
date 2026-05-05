import type { VorgangCategory } from "@/db/schema";

export type ClassificationResult = {
  category: VorgangCategory;
  confidence: number;
  matchedTerms: string[];
};

/**
 * Pure-Funktion: regelbasierter Klassifikator für Eingangsdokumente.
 * Erkennt die häufigsten 4 Fälle aus dem Bauvertrags-Alltag anhand von
 * Schlagwörtern. Keine DB- oder Netzwerk-Calls — vollständig deterministisch.
 *
 * KI-Replacement folgt in einem späteren Sprint, ohne diese Schnittstelle
 * zu brechen.
 */
export function classifyEingang(input: {
  fileName: string;
  text?: string | null;
}): ClassificationResult {
  const haystack = `${input.fileName} ${input.text ?? ""}`.toLowerCase();

  const rules: Array<{
    category: VorgangCategory;
    terms: RegExp[];
    weight: number;
  }> = [
    {
      category: "maengelruege",
      terms: [
        /m[äa]ngel/,
        /m[äa]ngelr[üu]ge/,
        /nachbesserung/,
        /m[äa]ngelanzeige/,
        /defect/,
        /defekt/,
        /risse?/,
      ],
      weight: 1,
    },
    {
      category: "anlieferung",
      terms: [
        /lieferschein/,
        /anlieferung/,
        /materialprüfung/,
        /materialpr[üu]fung/,
        /bedenken/,
        /bedenkenanzeige/,
        /vorleistung/,
      ],
      weight: 1,
    },
    {
      category: "vertragspflicht",
      terms: [
        /vertrag/,
        /anordnung/,
        /aufforderung/,
        /pönale/,
        /poenale/,
        /vertragsstrafe/,
        /nachtrag/,
        /behinderung/,
        /bha/,
      ],
      weight: 1,
    },
  ];

  let best: { category: VorgangCategory; score: number; terms: string[] } = {
    category: "sonstiges",
    score: 0,
    terms: [],
  };

  for (const rule of rules) {
    const matched: string[] = [];
    for (const term of rule.terms) {
      const m = haystack.match(term);
      if (m) matched.push(m[0]);
    }
    const score = matched.length * rule.weight;
    if (score > best.score) best = { category: rule.category, score, terms: matched };
  }

  // Confidence: 0.55 für 1 Treffer, 0.7 für 2, 0.85 ab 3.
  const confidence = best.score === 0 ? 0 : Math.min(0.85, 0.4 + best.score * 0.15);
  return { category: best.category, confidence, matchedTerms: best.terms };
}
