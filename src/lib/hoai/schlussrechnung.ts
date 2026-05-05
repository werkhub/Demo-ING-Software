/**
 * HOAI-Schlussrechnung — Aufschlüsselung pro Leistungsphase.
 *
 * Pure Logik: berechnet aus
 *   - Soll-Honorar je LP (HOAI-Calculator)
 *   - bisher abgerechneten Beträgen (aus früheren AR-Positionen mit lpReferenz)
 * den Stand "jetzt zur Abrechnung" pro LP.
 *
 * Beispiel:
 *   LP1 (Soll 2.000 €) — bisher 100% (= 2.000 €) — jetzt 0
 *   LP2 (Soll 7.000 €) — bisher 100% (= 7.000 €) — jetzt 0
 *   ...
 *   LP8 (Soll 32.000 €) — bisher 80% (= 25.600 €) — jetzt 6.400 €  → restliche 20%
 *   LP9 (Soll 2.000 €) — bisher 0% — jetzt 2.000 €
 */
import type { Leistungsphase } from "./types";

export type HoaiBreakdownRow = {
  lp: Leistungsphase;
  /** Vollständiges Soll-Honorar dieser LP nach HOAI-Calculator. */
  sollCents: number;
  /** Bereits in früheren ARs abgerechneter Anteil. */
  vorherCents: number;
  /** Anteil, der mit dieser AR abgerechnet werden soll (Soll - Vorher). */
  jetztCents: number;
  /** Bisheriger Fortschritt 0..1 (vor dieser AR). */
  vorherPct: number;
  /** Fortschritt nach dieser AR 0..1. */
  jetztPct: number;
};

export type HoaiBreakdown = {
  rows: HoaiBreakdownRow[];
  sollSummeCents: number;
  vorherSummeCents: number;
  jetztSummeCents: number;
};

/**
 * Berechnet die LP-Aufschlüsselung für eine Schlussrechnung.
 *
 * @param sollPerLp Soll-Honorar pro LP (aus calculate(...).result.lpAufsplittCents)
 * @param vorherPerLp Bisher abgerechnete Beträge pro LP (aus früheren AR-Positionen)
 *
 * Liefert pro LP einen Eintrag mit Soll, Vorher, Jetzt. Falls vorherCents
 * den sollCents übersteigt (sollte nicht passieren, aber defensiv): jetzt = 0.
 */
export function buildHoaiBreakdown(
  sollPerLp: Partial<Record<Leistungsphase, number>>,
  vorherPerLp: Partial<Record<Leistungsphase, number>>
): HoaiBreakdown {
  const lps = Object.keys(sollPerLp)
    .map((k) => Number(k) as Leistungsphase)
    .sort((a, b) => a - b);

  const rows: HoaiBreakdownRow[] = lps.map((lp) => {
    const sollCents = sollPerLp[lp] ?? 0;
    const vorherCents = Math.max(0, vorherPerLp[lp] ?? 0);
    const jetztCents = Math.max(0, sollCents - vorherCents);
    const vorherPct = sollCents > 0 ? vorherCents / sollCents : 0;
    const jetztPct = sollCents > 0 ? (vorherCents + jetztCents) / sollCents : 0;
    return {
      lp,
      sollCents,
      vorherCents,
      jetztCents,
      vorherPct,
      jetztPct,
    };
  });

  return {
    rows,
    sollSummeCents: rows.reduce((s, r) => s + r.sollCents, 0),
    vorherSummeCents: rows.reduce((s, r) => s + r.vorherCents, 0),
    jetztSummeCents: rows.reduce((s, r) => s + r.jetztCents, 0),
  };
}
