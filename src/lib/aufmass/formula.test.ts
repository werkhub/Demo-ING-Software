import { describe, expect, it } from "vitest";
import { evaluateFormula } from "./formula";

describe("evaluateFormula", () => {
  describe("basics", () => {
    it("addiert zwei Zahlen", () => {
      expect(evaluateFormula("1 + 2")).toEqual({ ok: true, value: 3 });
    });
    it("subtrahiert", () => {
      expect(evaluateFormula("10 - 3")).toEqual({ ok: true, value: 7 });
    });
    it("multipliziert", () => {
      expect(evaluateFormula("4 * 5")).toEqual({ ok: true, value: 20 });
    });
    it("dividiert", () => {
      expect(evaluateFormula("10 / 4")).toEqual({ ok: true, value: 2.5 });
    });
  });

  describe("operator-precedence", () => {
    it("multipliziert vor addiert", () => {
      expect(evaluateFormula("2 + 3 * 4")).toEqual({ ok: true, value: 14 });
    });
    it("klammert korrekt", () => {
      expect(evaluateFormula("(2 + 3) * 4")).toEqual({ ok: true, value: 20 });
    });
    it("mehrere Klammern", () => {
      expect(evaluateFormula("(1 + 2) * (3 + 4)")).toEqual({ ok: true, value: 21 });
    });
  });

  describe("REB-typisch (Putzfläche Wand)", () => {
    it("L*B - Tür-Abzug", () => {
      // 3,50 m × 2,80 m - Tür 0,90 m × 2,10 m = 9,80 - 1,89 = 7,91 m²
      expect(evaluateFormula("3,50 * 2,80 - 0,90 * 2,10")).toEqual({
        ok: true,
        value: 7.91,
      });
    });
    it("L*B mit zwei Abzügen (Tür + Fenster)", () => {
      const r = evaluateFormula("4,20 * 2,80 - 0,90 * 2,10 - 1,20 * 1,40");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBeCloseTo(8.19, 2);
    });
  });

  describe("Zahlen-Notation", () => {
    it("akzeptiert deutsches Komma", () => {
      expect(evaluateFormula("3,5 * 2")).toEqual({ ok: true, value: 7 });
    });
    it("akzeptiert englischen Punkt", () => {
      expect(evaluateFormula("3.5 * 2")).toEqual({ ok: true, value: 7 });
    });
    it("akzeptiert Tausender-Trenner-Punkt mit Komma", () => {
      // 1.234,56 → 1234.56
      expect(evaluateFormula("1.234,56 + 0")).toEqual({
        ok: true,
        value: 1234.56,
      });
    });
  });

  describe("Vorzeichen", () => {
    it("unäres Minus", () => {
      expect(evaluateFormula("-5 + 10")).toEqual({ ok: true, value: 5 });
    });
    it("doppelt negiert", () => {
      expect(evaluateFormula("--5")).toEqual({ ok: true, value: 5 });
    });
  });

  describe("Fehlerfälle", () => {
    it("leere Formel", () => {
      const r = evaluateFormula("");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/leer/i);
    });
    it("nur Whitespace", () => {
      const r = evaluateFormula("   ");
      expect(r.ok).toBe(false);
    });
    it("Division durch 0", () => {
      const r = evaluateFormula("10 / 0");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/Division durch 0/);
    });
    it("fehlende Klammer", () => {
      const r = evaluateFormula("(1 + 2");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/Klammer/);
    });
    it("ungültiges Zeichen", () => {
      const r = evaluateFormula("1 + abc");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/Unerlaubt/i);
    });
    it("zwei Operatoren hintereinander (außer unär)", () => {
      const r = evaluateFormula("1 * * 2");
      expect(r.ok).toBe(false);
    });
    it("nur ein Operator", () => {
      const r = evaluateFormula("+");
      expect(r.ok).toBe(false);
    });
  });

  describe("Rundung", () => {
    it("rundet auf 4 Dezimalstellen", () => {
      // 1/3 = 0.33333... → 0.3333
      expect(evaluateFormula("1 / 3")).toEqual({ ok: true, value: 0.3333 });
    });
  });
});
