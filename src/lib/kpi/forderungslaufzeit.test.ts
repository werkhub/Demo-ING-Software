import { describe, expect, it } from "vitest";
import { computeForderungslaufzeit } from "./forderungslaufzeit";

describe("kpi/forderungslaufzeit", () => {
  it("leere Inputs → value=null, previous=null", () => {
    const r = computeForderungslaufzeit([], new Date(2026, 4, 5));
    expect(r.value).toBe(null);
    expect(r.previous).toBe(null);
    expect(r.sparkline).toHaveLength(6);
    expect(r.sparkline.every((x) => x === null)).toBe(true);
  });

  it("rechnet AVG-Tage zwischen invoiceDate und paidAt im Fenster", () => {
    const now = new Date(2026, 4, 5); // 5. Mai 2026
    const r = computeForderungslaufzeit(
      [
        // 14 Tage Laufzeit, paidAt im aktuellen 90-Tage-Fenster
        { invoiceDate: "2026-04-01", paidAt: "2026-04-15" },
        // 21 Tage
        { invoiceDate: "2026-03-01", paidAt: "2026-03-22" },
      ],
      now
    );
    expect(r.value).toBe(18); // round((14+21)/2) = 17.5 → 18
    expect(r.sampleSize).toBe(2);
  });

  it("ignoriert AR außerhalb des Stichtags-Fensters", () => {
    const now = new Date(2026, 4, 5);
    const r = computeForderungslaufzeit(
      [
        // weit vor dem aktuellen Fenster
        { invoiceDate: "2024-01-01", paidAt: "2024-01-15" },
      ],
      now
    );
    expect(r.value).toBe(null);
  });

  it("akzeptiert Date-Objekt für paidAt", () => {
    const now = new Date(2026, 4, 5);
    const r = computeForderungslaufzeit(
      [{ invoiceDate: "2026-04-01", paidAt: new Date("2026-04-21") }],
      now
    );
    expect(r.value).toBe(20);
  });

  it("filtert negative Laufzeiten (paidAt < invoiceDate ist Datenfehler)", () => {
    const now = new Date(2026, 4, 5);
    const r = computeForderungslaufzeit(
      [{ invoiceDate: "2026-04-15", paidAt: "2026-04-01" }],
      now
    );
    expect(r.value).toBe(null);
  });

  it("vorperiode: 90-Tage-Fenster davor", () => {
    const now = new Date(2026, 4, 5);
    const r = computeForderungslaufzeit(
      [
        // aktuelle Periode (in den letzten 90 Tagen): 10 Tage
        { invoiceDate: "2026-04-10", paidAt: "2026-04-20" },
        // vorperiode (90–180 Tage zurück): 30 Tage
        { invoiceDate: "2025-12-15", paidAt: "2026-01-14" },
      ],
      now
    );
    expect(r.value).toBe(10);
    expect(r.previous).toBe(30);
  });

  it("Sparkline hat 6 Punkte (älteste zuerst)", () => {
    const r = computeForderungslaufzeit(
      [{ invoiceDate: "2026-04-01", paidAt: "2026-04-15" }],
      new Date(2026, 4, 5)
    );
    expect(r.sparkline).toHaveLength(6);
    // April-Bucket = 14 Tage, andere Monate leer
    expect(r.sparkline[4]).toBe(14); // April: index 4 (Dez, Jan, Feb, Mär, Apr, Mai)
    expect(r.sparkline[5]).toBe(null); // Mai (kein Datenpunkt)
  });
});
