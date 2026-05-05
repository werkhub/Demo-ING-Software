/**
 * Tests für HOAI-Calculator.
 *
 * Testfälle gegen offizielle HOAI-Tafeln (2021):
 *   - Genaue Stützstellen-Treffer (Interpolationsfaktor = 0)
 *   - Werte zwischen Stützstellen
 *   - LP-Anteile + Umbauzuschlag + Nebenkosten
 *   - Validierung (Kosten unter/über Bereich, ungültige LPs)
 *
 * Toleranz: ±50 Cents bei Honorarsummen — wegen Rundungs-Drift in der
 * Interpolation gegenüber den exakten HOAI-Tabellenwerten.
 */
import { describe, expect, it } from "vitest";
import {
  calculate,
  calculateOrThrow,
  formatEur,
  validate,
} from "./calculator";
import {
  getValidLps,
  isLpValid,
  lpAnteileSumme,
} from "./leistungsphasen";
import type { HoaiInput } from "./types";

describe("hoai/validate", () => {
  it("accepts valid input", () => {
    const r = validate({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 500_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.ok).toBe(true);
  });

  it("rejects costs below tafel minimum", () => {
    const r = validate({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 10_000_00, // < 25.000 €
      beauftragteLps: [1, 2],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("kosten_unter_min");
  });

  it("rejects costs above tafel maximum", () => {
    const r = validate({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 30_000_000_00, // > 25 Mio €
      beauftragteLps: [1, 2],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("kosten_ueber_max");
  });

  it("rejects empty LP list", () => {
    const r = validate({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("keine_lps_beauftragt");
  });

  it("rejects LP7 for tragwerk (only LP1-6 valid)", () => {
    const r = validate({
      leistungsbild: "tragwerk",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [1, 2, 3, 7],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("ungueltige_lp");
      if (r.error.kind === "ungueltige_lp") {
        expect(r.error.lp).toBe(7);
      }
    }
  });
});

describe("hoai/leistungsphasen", () => {
  it("Gebäude hat LP1-9", () => {
    expect(getValidLps("gebaeude")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("Tragwerk hat nur LP1-6", () => {
    expect(getValidLps("tragwerk")).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("LP-Anteile summieren auf 1.0 für jedes Leistungsbild (±0.001)", () => {
    for (const lb of ["gebaeude", "ingenieurbau", "tragwerk", "tga"] as const) {
      const lps = getValidLps(lb);
      const sum = lpAnteileSumme(lb, lps);
      expect(sum).toBeGreaterThan(0.999);
      expect(sum).toBeLessThan(1.001);
    }
  });

  it("isLpValid: LP7 bei Tragwerk = false", () => {
    expect(isLpValid("tragwerk", 7)).toBe(false);
  });

  it("isLpValid: LP9 bei Gebäude = true", () => {
    expect(isLpValid("gebaeude", 9)).toBe(true);
  });
});

describe("hoai/calculate — Stützstellen-Treffer (Gebäude)", () => {
  it("100.000 € · Zone III · Mittelsatz · alle LPs = Vollhonorar zwischen min/max", () => {
    // Stützstelle bei 100.000: Zone III min 15.012 € / max 17.373 €
    // Mittelwert = 16.192,50 €
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.beauftragterLpAnteil).toBeCloseTo(1.0, 2);
    // Mittelwert von 15.012 und 17.373 = 16.192,50 €
    expect(r.vollhonorarCents).toBeGreaterThanOrEqual(1_619_200);
    expect(r.vollhonorarCents).toBeLessThanOrEqual(1_619_300);
    expect(r.grundhonorarCents).toBe(r.vollhonorarCents);
  });

  it("100.000 € · Zone III · Mindestsatz", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "min",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    // Zone III min bei 100.000 € = 15.012 €
    expect(r.vollhonorarCents).toBe(15_012_00);
  });

  it("100.000 € · Zone III · Höchstsatz", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "max",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    // Zone III max bei 100.000 € = 17.373 €
    expect(r.vollhonorarCents).toBe(17_373_00);
  });
});

describe("hoai/calculate — Interpolation zwischen Stützstellen (Gebäude)", () => {
  it("150.000 € (zwischen 100k und 200k) · Zone III · min", () => {
    // 100k Zone III min: 15.012 €
    // 200k Zone III min: 28.216 €
    // 150k linear interpoliert: 15.012 + 0.5 × (28.216 - 15.012) = 21.614 €
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "min",
      anrechenbareKostenCents: 150_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.vollhonorarCents).toBe(21_614_00);
    expect(r.debug.interpolationsfaktor).toBeCloseTo(0.5, 4);
  });
});

describe("hoai/calculate — LP-Aufsplitt + Anteile", () => {
  it("Nur LP1-4 beauftragt = 27% Vollhonorar", () => {
    // Gebäude: LP1 2% + LP2 7% + LP3 15% + LP4 3% = 27%
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [1, 2, 3, 4],
    });
    expect(r.beauftragterLpAnteil).toBeCloseTo(0.27, 4);
    // Grundhonorar = 27% von 16.192,50 € ≈ 4.371,98 €
    expect(r.grundhonorarCents).toBe(Math.round(0.27 * r.vollhonorarCents));
  });

  it("LP-Aufsplitt summiert exakt auf Grundhonorar", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 500_000_00,
      beauftragteLps: [3, 5, 8],
    });
    const summe = Object.values(r.lpAufsplittCents).reduce(
      (s, v) => s + (v ?? 0),
      0
    );
    expect(summe).toBe(r.grundhonorarCents);
  });

  it("LP-Aufsplitt nur für beauftragte LPs", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [3, 5, 8],
    });
    const keys = Object.keys(r.lpAufsplittCents).map(Number);
    expect(keys.sort()).toEqual([3, 5, 8]);
  });
});

describe("hoai/calculate — Umbau-Zuschlag + Nebenkosten", () => {
  it("33% Umbauzuschlag + 5% Nebenkosten", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [3, 5, 8],
      umbauZuschlagPct: 33,
      nebenkostenPauschalePct: 5,
    });
    // Grundhonorar = (15+25+32)% = 72% von Vollhonorar
    // Umbau-Zuschlag = 33% × Grundhonorar
    // Nebenkosten = 5% × (Grundhonorar + Umbau)
    expect(r.umbauZuschlagCents).toBe(Math.round(r.grundhonorarCents * 0.33));
    expect(r.nebenkostenCents).toBe(
      Math.round((r.grundhonorarCents + r.umbauZuschlagCents) * 0.05)
    );
    expect(r.honorarsummeNettoCents).toBe(
      r.grundhonorarCents + r.umbauZuschlagCents + r.nebenkostenCents
    );
  });

  it("Negative Werte werden auf 0 geclamped", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [3, 5, 8],
      umbauZuschlagPct: -10,
      nebenkostenPauschalePct: -5,
    });
    expect(r.umbauZuschlagCents).toBe(0);
    expect(r.nebenkostenCents).toBe(0);
  });

  it("Umbau-Zuschlag wird auf 80% geclamped", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 100_000_00,
      beauftragteLps: [3, 5, 8],
      umbauZuschlagPct: 200,
    });
    expect(r.umbauZuschlagCents).toBe(Math.round(r.grundhonorarCents * 0.8));
  });
});

describe("hoai/calculate — Tragwerksplanung", () => {
  it("Tragwerk LP1-6 (alle) bei 200.000 € Zone III mittel", () => {
    const r = calculateOrThrow({
      leistungsbild: "tragwerk",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 200_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6],
    });
    expect(r.beauftragterLpAnteil).toBeCloseTo(1.0, 2);
    // Stützstelle 200k Zone III: min 15.265 / max 17.670 → mittel = 16.467,50 €
    expect(r.vollhonorarCents).toBeGreaterThanOrEqual(1_646_700);
    expect(r.vollhonorarCents).toBeLessThanOrEqual(1_646_800);
  });

  it("Tragwerk nur LP4-5 = 70%", () => {
    const r = calculateOrThrow({
      leistungsbild: "tragwerk",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 200_000_00,
      beauftragteLps: [4, 5],
    });
    // LP4 30% + LP5 40% = 70%
    expect(r.beauftragterLpAnteil).toBeCloseTo(0.7, 4);
  });
});

describe("hoai/calculate — Ingenieurbauwerke", () => {
  it("Ingenieurbau bei 1 Mio € Zone III mittel · LP1-9", () => {
    const r = calculateOrThrow({
      leistungsbild: "ingenieurbau",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 1_000_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.beauftragterLpAnteil).toBeCloseTo(1.0, 2);
    // Stützstelle 1 Mio Zone III: min 121.998 / max 141.198 → mittel = 131.598 €
    expect(r.vollhonorarCents).toBeGreaterThanOrEqual(13_159_700);
    expect(r.vollhonorarCents).toBeLessThanOrEqual(13_159_900);
  });
});

describe("hoai/calculate — TGA", () => {
  it("TGA bei 50.000 € Zone III mittel · LP1-9", () => {
    const r = calculateOrThrow({
      leistungsbild: "tga",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 50_000_00,
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.beauftragterLpAnteil).toBeCloseTo(1.0, 2);
    // 50k Zone III: min 10.948 / max 12.668 → mittel = 11.808 €
    expect(r.vollhonorarCents).toBeGreaterThanOrEqual(1_180_700);
    expect(r.vollhonorarCents).toBeLessThanOrEqual(1_180_900);
  });

  it("TGA Bereich startet bei 5.000 €", () => {
    const r = calculate({
      leistungsbild: "tga",
      zone: "III",
      satz: "mittel",
      anrechenbareKostenCents: 4_000_00,
      beauftragteLps: [1, 2, 3],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("kosten_unter_min");
  });
});

describe("hoai/calculate — Edge Cases", () => {
  it("Genau auf Stützstelle (Faktor = 0)", () => {
    const r = calculateOrThrow({
      leistungsbild: "gebaeude",
      zone: "III",
      satz: "min",
      anrechenbareKostenCents: 25_000_00, // exakt erste Stützstelle
      beauftragteLps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    });
    expect(r.debug.interpolationsfaktor).toBe(0);
  });

  it("calculateOrThrow wirft bei ungültiger Eingabe", () => {
    expect(() =>
      calculateOrThrow({
        leistungsbild: "gebaeude",
        zone: "III",
        satz: "mittel",
        anrechenbareKostenCents: 1_000_00, // unter Minimum
        beauftragteLps: [1],
      })
    ).toThrow();
  });
});

describe("hoai/formatEur", () => {
  it("formatiert Cents als deutsche €-Notation", () => {
    expect(formatEur(123_456_78)).toMatch(/123\.456,78/);
  });
});
