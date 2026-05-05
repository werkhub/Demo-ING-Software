/**
 * Test der Frühwarn-Logik separat — die DB-Aggregation testen wir nicht
 * unit-getrieben, weil sie viele JOINs braucht. Stattdessen: Smoke-Test
 * via Cron-Lauf bzw. UI.
 */
import { describe, expect, it } from "vitest";

type WarningKind = "ok" | "kostenueberschreitung" | "fruehwarn";

function classify(opts: {
  sollCents: number;
  istCents: number;
  fertigstellung: number;
}): WarningKind {
  const FRUEHWARN_PCT = 0.85;
  const FERTIGSTELLUNG_GRENZE = 0.7;
  if (opts.sollCents <= 0) return "ok";
  if (opts.istCents > opts.sollCents) return "kostenueberschreitung";
  if (
    opts.istCents > opts.sollCents * FRUEHWARN_PCT &&
    opts.fertigstellung < FERTIGSTELLUNG_GRENZE
  ) {
    return "fruehwarn";
  }
  return "ok";
}

describe("nachkalk/warning", () => {
  it("OK wenn IST < 85% des SOLL", () => {
    expect(
      classify({ sollCents: 100000, istCents: 50000, fertigstellung: 0.5 })
    ).toBe("ok");
  });

  it("Frühwarn bei IST > 85% UND Fertigstellung < 70%", () => {
    expect(
      classify({ sollCents: 100000, istCents: 90000, fertigstellung: 0.5 })
    ).toBe("fruehwarn");
  });

  it("nicht Frühwarn bei IST > 85% wenn Fertigstellung >= 70%", () => {
    expect(
      classify({ sollCents: 100000, istCents: 90000, fertigstellung: 0.8 })
    ).toBe("ok");
  });

  it("Kostenüberschreitung wenn IST > SOLL", () => {
    expect(
      classify({ sollCents: 100000, istCents: 105000, fertigstellung: 0.5 })
    ).toBe("kostenueberschreitung");
  });

  it("Kostenüberschreitung schlägt Frühwarn", () => {
    expect(
      classify({ sollCents: 100000, istCents: 110000, fertigstellung: 0.3 })
    ).toBe("kostenueberschreitung");
  });

  it("OK bei SOLL=0 (LV-Position ohne Preis)", () => {
    expect(
      classify({ sollCents: 0, istCents: 5000, fertigstellung: 0.5 })
    ).toBe("ok");
  });
});
