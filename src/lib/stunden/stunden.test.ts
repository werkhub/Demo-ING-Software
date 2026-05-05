import { describe, expect, it } from "vitest";
import {
  aggregateByLvPosition,
  aggregateDaily,
  daysOfIsoWeek,
  effectiveStundensatzCents,
  isoWeekFromDate,
  isoWeekFromDateString,
  isUnplausibleHours,
  mondayOfIsoWeek,
} from "./index";

describe("stunden/iso-week", () => {
  it("isoWeekFromDate: 4. Januar liegt in KW 1", () => {
    const r = isoWeekFromDate(new Date(Date.UTC(2024, 0, 4)));
    expect(r).toEqual({ jahr: 2024, kw: 1 });
  });

  it("isoWeekFromDate: 31.12.2024 ist KW 1 von 2025 (ISO 8601)", () => {
    const r = isoWeekFromDate(new Date(Date.UTC(2024, 11, 31)));
    expect(r).toEqual({ jahr: 2025, kw: 1 });
  });

  it("isoWeekFromDate: 1.1.2023 (Sonntag) ist KW 52 von 2022", () => {
    const r = isoWeekFromDate(new Date(Date.UTC(2023, 0, 1)));
    expect(r).toEqual({ jahr: 2022, kw: 52 });
  });

  it("mondayOfIsoWeek: KW 1 / 2024 startet Montag 1.1.2024", () => {
    const r = mondayOfIsoWeek(2024, 1);
    expect(r.toISOString().slice(0, 10)).toBe("2024-01-01");
  });

  it("mondayOfIsoWeek: KW 1 / 2025 startet Montag 30.12.2024", () => {
    const r = mondayOfIsoWeek(2025, 1);
    expect(r.toISOString().slice(0, 10)).toBe("2024-12-30");
  });

  it("daysOfIsoWeek: liefert 7 ISO-Tage Mo-So", () => {
    const days = daysOfIsoWeek(2024, 1);
    expect(days).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      "2024-01-04",
      "2024-01-05",
      "2024-01-06",
      "2024-01-07",
    ]);
  });

  it("isoWeekFromDateString: parsed YYYY-MM-DD korrekt", () => {
    const r = isoWeekFromDateString("2024-12-30");
    expect(r).toEqual({ jahr: 2025, kw: 1 });
  });
});

describe("stunden/plausi", () => {
  it("isUnplausibleHours: 12h ist OK, 12.5h ist auffällig", () => {
    expect(isUnplausibleHours(12)).toBe(false);
    expect(isUnplausibleHours(12.5)).toBe(true);
    expect(isUnplausibleHours(0)).toBe(false);
  });
});

describe("stunden/aggregate", () => {
  it("aggregateDaily: summiert korrekt pro Datum", () => {
    const rows = [
      { datum: "2024-01-15", stunden: 4 },
      { datum: "2024-01-15", stunden: 3 },
      { datum: "2024-01-16", stunden: 8 },
    ];
    const m = aggregateDaily(rows);
    expect(m.get("2024-01-15")).toBe(7);
    expect(m.get("2024-01-16")).toBe(8);
  });

  it("aggregateByLvPosition: rechnet Lohn-Cents pro LV-Position", () => {
    const rows = [
      { lvPositionId: "lv-1", stunden: 8, stundensatzCents: 4500 },
      { lvPositionId: "lv-1", stunden: 4, stundensatzCents: 4500 },
      { lvPositionId: "lv-2", stunden: 8, stundensatzCents: 5500 },
      { lvPositionId: null, stunden: 8, stundensatzCents: 5500 },
    ];
    const m = aggregateByLvPosition(rows);
    expect(m.get("lv-1")).toBe(54000); // 12 * 4500
    expect(m.get("lv-2")).toBe(44000); // 8 * 5500
    expect(m.has("null")).toBe(false);
    expect(m.size).toBe(2);
  });
});

describe("stunden/effectiveStundensatzCents", () => {
  it("liefert stundensatzCents bei lohnart=stunden", () => {
    const r = effectiveStundensatzCents({
      lohnart: "stunden",
      stundensatzCents: 4500,
      monatsgehaltCents: 0,
      monatsSollStunden: 173.33,
    });
    expect(r).toBe(4500);
  });

  it("rechnet aus Monatsgehalt bei lohnart=monat", () => {
    const r = effectiveStundensatzCents({
      lohnart: "monat",
      stundensatzCents: 0,
      monatsgehaltCents: 400000, // 4000 EUR
      monatsSollStunden: 160,
    });
    expect(r).toBe(2500); // 400000 / 160
  });

  it("liefert 0, wenn lohnart=monat und Felder fehlen", () => {
    const r = effectiveStundensatzCents({
      lohnart: "monat",
      stundensatzCents: 0,
      monatsgehaltCents: 0,
      monatsSollStunden: null,
    });
    expect(r).toBe(0);
  });
});
