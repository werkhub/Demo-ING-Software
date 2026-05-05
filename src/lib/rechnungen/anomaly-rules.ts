import type {
  AnomalieSeverity,
  RechnungAnomalieKind,
  RechnungPosition,
} from "@/db/schema";

export type AnomalyFinding = {
  kind: RechnungAnomalieKind;
  severity: AnomalieSeverity;
  description: string;
  payload: Record<string, unknown>;
  /** Index der betroffenen Position in der Rechnung — null bei dokumentweiten Befunden. */
  positionIndex: number | null;
};

/**
 * Pure-Funktion: Mathematik-Check je Position.
 * Erkennt Abweichungen zwischen `quantity * unitPrice` und `totalPrice`.
 * Vergleich findet in Cents (Integer-Arithmetik) statt, um Floating-Point-Drift
 * bei Werten wie 3 × 33,33 € zu vermeiden. Toleranz: 1 Cent.
 */
export function findMathErrors(
  positions: Pick<
    RechnungPosition,
    "positionIndex" | "quantity" | "unitPrice" | "totalPrice"
  >[]
): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  for (const p of positions) {
    const expectedCents = Math.round(p.quantity * p.unitPrice * 100);
    const actualCents = Math.round(p.totalPrice * 100);
    if (Math.abs(expectedCents - actualCents) > 1) {
      const expected = expectedCents / 100;
      const actual = actualCents / 100;
      findings.push({
        kind: "math_error",
        severity: "critical",
        description: `Position ${p.positionIndex + 1}: ${p.quantity} × ${p.unitPrice.toFixed(2)} € ergibt ${expected.toFixed(2)} € — ausgewiesen ${actual.toFixed(2)} €.`,
        payload: { expected, actual, positionIndex: p.positionIndex },
        positionIndex: p.positionIndex,
      });
    }
  }
  return findings;
}

/**
 * Pure-Funktion: Preis-Sprung-Check gegen Vorrechnungs-Historie.
 * Vergleicht je LV-Position den aktuellen Einheitspreis mit dem Mittelwert
 * vorhergehender Rechnungen. Trigger: >15 % Abweichung.
 *   warning  bei Δ ∈ (15 %, 40 %]
 *   critical bei Δ > 40 %
 *
 * @param current     Positionen der zu prüfenden Rechnung
 * @param historic    flache Liste aller Vorrechnungs-Positionen (gleicher Workspace, gleiche LV-Pos.)
 */
export function findPriceJumps(
  current: Pick<RechnungPosition, "positionIndex" | "lvPosition" | "unitPrice">[],
  historic: Pick<RechnungPosition, "lvPosition" | "unitPrice">[]
): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  const byLv = new Map<string, number[]>();
  for (const p of historic) {
    if (!p.lvPosition || p.unitPrice <= 0) continue;
    if (!byLv.has(p.lvPosition)) byLv.set(p.lvPosition, []);
    byLv.get(p.lvPosition)!.push(p.unitPrice);
  }
  for (const p of current) {
    if (!p.lvPosition || p.unitPrice <= 0) continue;
    const history = byLv.get(p.lvPosition);
    if (!history || history.length === 0) continue;
    const avg = history.reduce((s, x) => s + x, 0) / history.length;
    const delta = (p.unitPrice - avg) / avg;
    if (delta > 0.15) {
      findings.push({
        kind: "price_jump",
        severity: delta > 0.4 ? "critical" : "warning",
        description: `LV-Position ${p.lvPosition}: Einheitspreis ${p.unitPrice.toFixed(2)} € liegt ${Math.round(delta * 100)} % über dem Vorrechnungs-Mittel (${avg.toFixed(2)} €).`,
        payload: {
          lvPosition: p.lvPosition,
          currentPrice: p.unitPrice,
          avgPrevious: avg,
          deltaPercent: Math.round(delta * 100),
        },
        positionIndex: p.positionIndex,
      });
    }
  }
  return findings;
}

/**
 * Pure-Funktion: Hauptvertrag-Lookup.
 * Markiert LV-Positionen, die im Hauptvertrags-Text nicht vorkommen — Indiz
 * für Nachtragspflicht oder unautorisierte Mehrleistung.
 *
 * @param positions       aktuelle Rechnungspositionen
 * @param contractText    Volltext des Hauptvertrags (oder null/leer, wenn keiner verfügbar)
 */
export function findPositionsNotInContract(
  positions: Pick<RechnungPosition, "positionIndex" | "lvPosition">[],
  contractText: string | null | undefined
): AnomalyFinding[] {
  if (!contractText) return [];
  const haystack = contractText.toLowerCase();
  const findings: AnomalyFinding[] = [];
  for (const p of positions) {
    if (!p.lvPosition) continue;
    const needle = p.lvPosition.toLowerCase();
    if (!haystack.includes(needle)) {
      findings.push({
        kind: "not_in_contract",
        severity: "warning",
        description: `LV-Position ${p.lvPosition} im Hauptvertrag nicht gefunden — möglicherweise Nachtragspflicht.`,
        payload: { lvPosition: p.lvPosition },
        positionIndex: p.positionIndex,
      });
    }
  }
  return findings;
}
