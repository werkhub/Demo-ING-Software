import { describe, expect, it } from "vitest";
import {
  BASIS_ZINS_PERCENT_DEFAULT,
  computeSkontoAbzug,
  computeVerzugszinsen,
  daysBetweenIso,
  defaultZinsSatzPercent,
  isWithinSkontoFrist,
  STANDARD_FRIST_TAGE,
  STANDARD_MAHNGEBUEHR,
  verzugsTage,
} from "./index";

describe("computeVerzugszinsen", () => {
  it("ein Jahr 9% auf 1000€ = 90€", () => {
    expect(computeVerzugszinsen(1000, 9, 365)).toBe(90);
  });
  it("90 Tage 12% auf 10000€ ≈ 295,89€", () => {
    expect(computeVerzugszinsen(10000, 12, 90)).toBeCloseTo(295.89, 2);
  });
  it("0€ Basis = 0€ Zinsen", () => {
    expect(computeVerzugszinsen(0, 9, 365)).toBe(0);
  });
  it("0 Tage = 0€ Zinsen", () => {
    expect(computeVerzugszinsen(1000, 9, 0)).toBe(0);
  });
});

describe("daysBetweenIso", () => {
  it("rechnet Tage zwischen 2 Daten", () => {
    expect(daysBetweenIso("2026-01-01", "2026-01-31")).toBe(30);
  });
  it("negativ wenn b vor a", () => {
    expect(daysBetweenIso("2026-02-01", "2026-01-15")).toBe(-17);
  });
});

describe("verzugsTage", () => {
  it("0 wenn nicht überfällig", () => {
    expect(verzugsTage({ dueDate: "2026-12-31" }, "2026-06-01")).toBe(0);
  });
  it("Tage Verzug wenn überfällig", () => {
    expect(verzugsTage({ dueDate: "2026-01-15" }, "2026-02-01")).toBe(17);
  });
  it("0 wenn dueDate null", () => {
    expect(verzugsTage({ dueDate: null }, "2026-02-01")).toBe(0);
  });
});

describe("isWithinSkontoFrist", () => {
  const ar = {
    invoiceDate: "2026-03-01",
    skontoDays: 10,
    skontoPercent: 2,
  };
  it("innerhalb Frist", () => {
    expect(isWithinSkontoFrist(ar, "2026-03-08")).toBe(true);
  });
  it("am letzten Tag", () => {
    expect(isWithinSkontoFrist(ar, "2026-03-11")).toBe(true);
  });
  it("nach Frist", () => {
    expect(isWithinSkontoFrist(ar, "2026-03-15")).toBe(false);
  });
  it("ohne Skonto-Konditionen → false", () => {
    expect(
      isWithinSkontoFrist(
        { invoiceDate: "2026-03-01", skontoDays: null, skontoPercent: null },
        "2026-03-08"
      )
    ).toBe(false);
  });
});

describe("computeSkontoAbzug", () => {
  it("2% von 11.305 EUR = 226,10 EUR", () => {
    expect(computeSkontoAbzug(11305, 2)).toBeCloseTo(226.1, 2);
  });
});

describe("defaultZinsSatzPercent", () => {
  it("VOB-Vertrag = Basis + 8 (§ 16 III VOB/B)", () => {
    expect(defaultZinsSatzPercent("vob_vertrag")).toBeCloseTo(
      BASIS_ZINS_PERCENT_DEFAULT + 8,
      2
    );
  });
  it("Verbraucherbau = Basis + 5 (§ 288 I BGB)", () => {
    expect(defaultZinsSatzPercent("verbraucherbauvertrag")).toBeCloseTo(
      BASIS_ZINS_PERCENT_DEFAULT + 5,
      2
    );
  });
  it("BGB-Werkvertrag B2B = Basis + 9 (§ 288 II BGB)", () => {
    expect(defaultZinsSatzPercent("bgb_werkvertrag")).toBeCloseTo(
      BASIS_ZINS_PERCENT_DEFAULT + 9,
      2
    );
  });
  it("null → B2B-Default", () => {
    expect(defaultZinsSatzPercent(null)).toBeCloseTo(
      BASIS_ZINS_PERCENT_DEFAULT + 9,
      2
    );
  });
});

describe("Standard-Konstanten", () => {
  it("Mahngebühren steigen", () => {
    expect(STANDARD_MAHNGEBUEHR[1]).toBeLessThan(STANDARD_MAHNGEBUEHR[2]);
    expect(STANDARD_MAHNGEBUEHR[2]).toBeLessThan(STANDARD_MAHNGEBUEHR[3]);
  });
  it("Fristen werden enger je höher die Stufe", () => {
    expect(STANDARD_FRIST_TAGE[1]).toBeGreaterThan(STANDARD_FRIST_TAGE[2]);
    expect(STANDARD_FRIST_TAGE[2]).toBeGreaterThan(STANDARD_FRIST_TAGE[3]);
  });
});
