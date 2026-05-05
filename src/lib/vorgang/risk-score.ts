import type { VorgangCategory, VorgangStatus } from "@/db/schema";
import { daysUntilDeadline } from "@/lib/utils";

/**
 * Pure-Funktion: Risk-Score-Aggregator (0–100) für Vorgänge.
 * Heuristik: Frist-Druck + Kategorie-Schwere + Anzahl Citations + Anzahl Dokumente.
 * Keine DB-Calls, keine Side-Effects → vollständig unit-testbar.
 *
 * Skala:
 *   0    = abgeschlossen / archiviert
 *   1-39 = grün (Routine)
 *   40-69= gelb (Aufmerksamkeit)
 *   70+  = rot (kritisch — z. B. Mängelrüge mit Frist <2 Tage)
 */
export function computeVorgangRiskScore(opts: {
  category: VorgangCategory;
  status: VorgangStatus;
  dueDate: string | null;
  citationCount?: number;
  documentCount?: number;
  /** Optional: Referenz-Datum für deterministische Tests. */
  now?: Date;
}): number {
  if (opts.status === "abgeschlossen" || opts.status === "archiviert") return 0;

  const categoryWeight: Record<VorgangCategory, number> = {
    maengelruege: 35,
    vertragspflicht: 30,
    anlieferung: 15,
    sonstiges: 10,
  };

  let score = categoryWeight[opts.category];

  if (opts.dueDate) {
    const days = daysUntilDeadline(opts.dueDate, opts.now);
    if (days < 0) score += 30;
    else if (days <= 1) score += 25;
    else if (days <= 7) score += 18;
    else if (days <= 14) score += 10;
    else if (days <= 30) score += 4;
  }

  if (opts.status === "wartet_auf_anwalt") score += 12;
  if (opts.status === "in_bearbeitung") score += 4;

  score += Math.min(15, (opts.citationCount ?? 0) * 3);
  score += Math.min(8, (opts.documentCount ?? 0) * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}
