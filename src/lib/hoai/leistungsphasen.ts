/**
 * HOAI 2021 — Anteile der Leistungsphasen pro Leistungsbild.
 *
 * Werte als Dezimalbruch (0.00 = 0%, 1.00 = 100%). Summe je Leistungsbild = 1.0
 * (außer Tragwerksplanung, die nur LP1-6 kennt — dort Summe ebenfalls 1.0).
 *
 * Quellen:
 *   § 34 Abs. 3 HOAI       — Gebäudeplanung
 *   § 43 Abs. 1 HOAI       — Ingenieurbauwerke
 *   § 47 Abs. 1 HOAI       — Verkehrsanlagen (LP4 = 8 % statt 5 %)
 *   § 51 Abs. 1 HOAI       — Tragwerksplanung (nur LP1-6)
 *   § 55 Abs. 2 HOAI       — Technische Ausrüstung (TGA)
 */
import type {
  Leistungsbild,
  Leistungsphase,
  LpAnteile,
} from "./types";

/** § 34 Abs. 3 HOAI — Gebäudeplanung. */
const ANTEILE_GEBAEUDE: LpAnteile = {
  1: 0.02, // Grundlagenermittlung
  2: 0.07, // Vorplanung
  3: 0.15, // Entwurfsplanung
  4: 0.03, // Genehmigungsplanung
  5: 0.25, // Ausführungsplanung
  6: 0.1, // Vorbereitung der Vergabe
  7: 0.04, // Mitwirkung bei der Vergabe
  8: 0.32, // Objektüberwachung / Bauüberwachung
  9: 0.02, // Objektbetreuung
};

/** § 43 Abs. 1 HOAI — Ingenieurbauwerke. */
const ANTEILE_INGENIEURBAU: LpAnteile = {
  1: 0.02,
  2: 0.2,
  3: 0.25,
  4: 0.05,
  5: 0.15,
  6: 0.13,
  7: 0.04,
  8: 0.15,
  9: 0.01,
};

/** § 47 Abs. 1 HOAI — Verkehrsanlagen. */
const ANTEILE_VERKEHR: LpAnteile = {
  1: 0.02,
  2: 0.2,
  3: 0.25,
  4: 0.08,
  5: 0.15,
  6: 0.1,
  7: 0.04,
  8: 0.15,
  9: 0.01,
};

/** § 51 Abs. 1 HOAI — Tragwerksplanung. Endet mit LP6 (kein LP7-9). */
const ANTEILE_TRAGWERK: LpAnteile = {
  1: 0.03,
  2: 0.1,
  3: 0.15,
  4: 0.3,
  5: 0.4,
  6: 0.02,
  // LP7-9 nicht vorgesehen
};

/** § 55 Abs. 2 HOAI — Technische Ausrüstung. */
const ANTEILE_TGA: LpAnteile = {
  1: 0.02,
  2: 0.09,
  3: 0.17,
  4: 0.02,
  5: 0.22,
  6: 0.07,
  7: 0.05,
  8: 0.35,
  9: 0.01,
};

export const LP_ANTEILE: Record<Leistungsbild, LpAnteile> = {
  gebaeude: ANTEILE_GEBAEUDE,
  ingenieurbau: ANTEILE_INGENIEURBAU,
  tragwerk: ANTEILE_TRAGWERK,
  tga: ANTEILE_TGA,
  verkehr: ANTEILE_VERKEHR,
};

/** LP-Bezeichnungen für UI. */
export const LP_LABEL: Record<Leistungsphase, string> = {
  1: "LP 1 — Grundlagenermittlung",
  2: "LP 2 — Vorplanung",
  3: "LP 3 — Entwurfsplanung",
  4: "LP 4 — Genehmigungsplanung",
  5: "LP 5 — Ausführungsplanung",
  6: "LP 6 — Vorbereitung der Vergabe",
  7: "LP 7 — Mitwirkung bei der Vergabe",
  8: "LP 8 — Objektüberwachung / Bauleitung",
  9: "LP 9 — Objektbetreuung",
};

/** LP-Kurzform für Tabellen-Header etc. */
export const LP_LABEL_SHORT: Record<Leistungsphase, string> = {
  1: "LP1",
  2: "LP2",
  3: "LP3",
  4: "LP4",
  5: "LP5",
  6: "LP6",
  7: "LP7",
  8: "LP8",
  9: "LP9",
};

/**
 * Liefert die LP-Anteile für ein Leistungsbild.
 * Ungültige LPs (z.B. LP7 bei Tragwerk) sind nicht im Result.
 */
export function getLpAnteile(leistungsbild: Leistungsbild): LpAnteile {
  return LP_ANTEILE[leistungsbild];
}

/** Prüft, ob eine LP für ein Leistungsbild gültig ist. */
export function isLpValid(
  leistungsbild: Leistungsbild,
  lp: Leistungsphase
): boolean {
  return LP_ANTEILE[leistungsbild][lp] !== undefined;
}

/** Liefert alle gültigen LPs eines Leistungsbilds (sortiert). */
export function getValidLps(leistungsbild: Leistungsbild): Leistungsphase[] {
  const anteile = LP_ANTEILE[leistungsbild];
  return (Object.keys(anteile) as unknown as Leistungsphase[])
    .map((k) => Number(k) as Leistungsphase)
    .sort((a, b) => a - b);
}

/** Summe der LP-Anteile für eine Liste von LPs. */
export function lpAnteileSumme(
  leistungsbild: Leistungsbild,
  lps: Leistungsphase[]
): number {
  const anteile = LP_ANTEILE[leistungsbild];
  return lps.reduce((sum, lp) => sum + (anteile[lp] ?? 0), 0);
}
