import { describe, expect, it } from "vitest";
import { buildHoaiBreakdown } from "./schlussrechnung";

describe("hoai/buildHoaiBreakdown", () => {
  it("alles unbezahlt = jetzt = soll", () => {
    const r = buildHoaiBreakdown(
      { 1: 2000, 2: 7000, 8: 32000 },
      {} // nichts vorher
    );
    expect(r.rows).toHaveLength(3);
    expect(r.sollSummeCents).toBe(41000);
    expect(r.vorherSummeCents).toBe(0);
    expect(r.jetztSummeCents).toBe(41000);
    expect(r.rows[0]).toMatchObject({ lp: 1, sollCents: 2000, vorherCents: 0, jetztCents: 2000 });
  });

  it("LP1+2 voll, LP8 zu 80% bezahlt", () => {
    const r = buildHoaiBreakdown(
      { 1: 2000, 2: 7000, 8: 32000, 9: 2000 },
      { 1: 2000, 2: 7000, 8: 25600, 9: 0 }
    );
    expect(r.vorherSummeCents).toBe(34600);
    expect(r.jetztSummeCents).toBe(8400); // 6.400 (LP8 Rest) + 2.000 (LP9)
    const lp8 = r.rows.find((x) => x.lp === 8)!;
    expect(lp8.jetztCents).toBe(6400);
    expect(lp8.vorherPct).toBeCloseTo(0.8, 3);
    expect(lp8.jetztPct).toBeCloseTo(1.0, 3);
  });

  it("Sortierung nach LP-Nr aufsteigend", () => {
    const r = buildHoaiBreakdown({ 9: 1, 1: 1, 5: 1 }, {});
    expect(r.rows.map((x) => x.lp)).toEqual([1, 5, 9]);
  });

  it("Vorher überschreitet Soll → jetzt = 0 (defensiv)", () => {
    const r = buildHoaiBreakdown({ 1: 1000 }, { 1: 1500 });
    expect(r.rows[0].jetztCents).toBe(0);
  });

  it("Soll = 0 → vorherPct/jetztPct = 0 (Division-by-Zero-Schutz)", () => {
    const r = buildHoaiBreakdown({ 1: 0 }, {});
    expect(r.rows[0].vorherPct).toBe(0);
    expect(r.rows[0].jetztPct).toBe(0);
  });

  it("Negative vorher-Werte werden auf 0 geclamped", () => {
    const r = buildHoaiBreakdown({ 1: 1000 }, { 1: -500 });
    expect(r.rows[0].vorherCents).toBe(0);
    expect(r.rows[0].jetztCents).toBe(1000);
  });
});
