import { describe, expect, it } from "vitest";
import {
  isInRange,
  last90Days,
  previous90Days,
  previousQuarter,
  quarterOf,
  quarterRange,
  workdaysInRange,
} from "./period";

describe("kpi/period", () => {
  it("quarterOf: Mai → Q2", () => {
    expect(quarterOf(new Date(2026, 4, 15))).toEqual({
      year: 2026,
      quarter: 2,
    });
  });

  it("quarterRange: Q2 2026 = 01.04.–30.06.", () => {
    expect(quarterRange(2026, 2)).toEqual({
      from: "2026-04-01",
      to: "2026-06-30",
    });
  });

  it("previousQuarter: Q1 2026 → Q4 2025", () => {
    expect(previousQuarter(2026, 1)).toEqual({ year: 2025, quarter: 4 });
  });

  it("last90Days: ab Stichtag rückwärts", () => {
    const r = last90Days(new Date(2026, 4, 5));
    expect(r.to).toBe("2026-05-05");
    // 90 Tage vorher = 4. Februar
    expect(r.from).toBe("2026-02-04");
  });

  it("previous90Days: weitere 90 Tage davor", () => {
    const r = previous90Days(new Date(2026, 4, 5));
    expect(r.to).toBe("2026-02-04");
    expect(r.from).toBe("2025-11-06");
  });

  it("workdaysInRange: 1 ganze Woche = 5 Werktage", () => {
    // Mo 04.05.2026 bis So 10.05.2026
    expect(
      workdaysInRange({ from: "2026-05-04", to: "2026-05-10" })
    ).toBe(5);
  });

  it("workdaysInRange: leerer Range = 0", () => {
    expect(workdaysInRange({ from: "2026-05-10", to: "2026-05-04" })).toBe(0);
  });

  it("isInRange: lexikografischer Vergleich", () => {
    const r = { from: "2026-01-01", to: "2026-12-31" };
    expect(isInRange("2026-06-15", r)).toBe(true);
    expect(isInRange("2025-12-31", r)).toBe(false);
    expect(isInRange("2027-01-01", r)).toBe(false);
  });
});
