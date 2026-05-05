import { describe, expect, it } from "vitest";
import { computeMaengelquote } from "./maengelquote";

describe("kpi/maengelquote", () => {
  it("ohne Abnahme im Quartal → null (noch nicht verfügbar)", () => {
    const r = computeMaengelquote([], [], new Date(2026, 4, 5));
    expect(r.value).toBe(null);
    expect(r.abnahmenCount).toBe(0);
  });

  it("zwei Abnahmen mit 6 Mängeln → Quote 3,00", () => {
    // Q2 2026 = 01.04. – 30.06.
    const abnahmen = [
      { id: "a1", abnahmeDate: "2026-04-15" },
      { id: "a2", abnahmeDate: "2026-05-01" },
    ];
    const maengel = [
      { abnahmeId: "a1" },
      { abnahmeId: "a1" },
      { abnahmeId: "a1" },
      { abnahmeId: "a2" },
      { abnahmeId: "a2" },
      { abnahmeId: "a2" },
    ];
    const r = computeMaengelquote(abnahmen, maengel, new Date(2026, 4, 5));
    expect(r.value).toBe(3);
    expect(r.abnahmenCount).toBe(2);
    expect(r.maengelCount).toBe(6);
  });

  it("Mängel ohne zugehörige Quartals-Abnahme zählen nicht", () => {
    const abnahmen = [{ id: "current", abnahmeDate: "2026-04-15" }];
    const maengel = [
      { abnahmeId: "current" },
      { abnahmeId: "old" }, // gehört zu nicht-im-Quartal-Abnahme
    ];
    const r = computeMaengelquote(abnahmen, maengel, new Date(2026, 4, 5));
    expect(r.value).toBe(1);
  });

  it("Vorquartal-Trend Q2 → Q1", () => {
    const abnahmen = [
      { id: "q2-1", abnahmeDate: "2026-04-15" },
      { id: "q1-1", abnahmeDate: "2026-02-15" },
      { id: "q1-2", abnahmeDate: "2026-03-15" },
    ];
    const maengel = [
      { abnahmeId: "q2-1" },
      { abnahmeId: "q1-1" },
      { abnahmeId: "q1-1" },
      { abnahmeId: "q1-2" },
      { abnahmeId: "q1-2" },
      { abnahmeId: "q1-2" },
      { abnahmeId: "q1-2" },
    ];
    const r = computeMaengelquote(abnahmen, maengel, new Date(2026, 4, 5));
    expect(r.value).toBe(1); // Q2: 1 Mangel / 1 Abnahme
    expect(r.previous).toBe(3); // Q1: 6 Mängel / 2 Abnahmen
  });

  it("Sparkline hat 6 Quartale, oldest → newest", () => {
    const abnahmen = [{ id: "a", abnahmeDate: "2026-04-15" }];
    const r = computeMaengelquote(
      abnahmen,
      [{ abnahmeId: "a" }, { abnahmeId: "a" }],
      new Date(2026, 4, 5)
    );
    expect(r.sparkline).toHaveLength(6);
    expect(r.sparkline[5]).toBe(2); // aktuelles Q (Q2 2026) = letzter Index
  });
});
