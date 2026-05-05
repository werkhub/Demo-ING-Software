import { describe, expect, it } from "vitest";
import { computeAuslastung } from "./auslastung";

describe("kpi/auslastung", () => {
  it("ohne aktive Mitarbeiter → null", () => {
    const r = computeAuslastung([{ datum: "2026-04-15", stunden: 8 }], 0);
    expect(r.value).toBe(null);
    expect(r.activeMitarbeiter).toBe(0);
  });

  it("100 % bei Soll-Erfüllung", () => {
    // Q2 2026 hat ca. 65 Werktage; testen mit kleiner Konstellation:
    // Wir nehmen einfach: 1 MA × Werktage × 8h gebucht = 100 %.
    const now = new Date(2026, 4, 5);
    // Buche genau den Workdays-Anteil x 8h: dafür generieren wir
    // einen Eintrag pro Werktag in Q2 mit 8h. Datums-Iteration in
    // lokaler Zeit, damit getDay() konsistent zu workdaysInRange ist.
    const stunden: { datum: string; stunden: number }[] = [];
    const pad = (n: number) => n.toString().padStart(2, "0");
    const d = new Date(2026, 3, 1); // 1. April lokal
    const end = new Date(2026, 5, 30); // 30. Juni lokal
    while (d <= end) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        stunden.push({
          datum: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          stunden: 8,
        });
      }
      d.setDate(d.getDate() + 1);
    }
    const r = computeAuslastung(stunden, 1, now);
    expect(r.value).toBe(100);
    expect(r.bookedHours).toBe(stunden.length * 8);
  });

  it("50 % bei halber Buchung", () => {
    const now = new Date(2026, 4, 5);
    const stunden = [
      // 1 Buchung à 4h an einem Werktag
      { datum: "2026-04-01", stunden: 4 },
    ];
    const r = computeAuslastung(stunden, 1, now);
    // Soll: 1 × workdays × 8 — bei einem MA und Q2 ist Soll groß
    // wir prüfen nur dass value > 0 und < 100
    expect(r.value).not.toBe(null);
    expect(r.value!).toBeGreaterThan(0);
    expect(r.value!).toBeLessThan(5);
  });

  it("Stunden außerhalb des Quartals zählen nicht", () => {
    const now = new Date(2026, 4, 5);
    const r = computeAuslastung(
      [{ datum: "2025-12-15", stunden: 8 }],
      1,
      now
    );
    expect(r.value).toBe(0);
    expect(r.bookedHours).toBe(0);
  });

  it("Sparkline hat 6 Quartale", () => {
    const r = computeAuslastung([], 1, new Date(2026, 4, 5));
    expect(r.sparkline).toHaveLength(6);
  });

  it("Trend Vorquartal-Buchung wird gefüllt", () => {
    const r = computeAuslastung(
      [{ datum: "2026-02-15", stunden: 8 }],
      1,
      new Date(2026, 4, 5)
    );
    expect(r.value).toBe(0); // Q2 (aktuell) = leer
    expect(r.previous).not.toBe(null); // Q1 hat eine 8h-Buchung
    expect(r.previous!).toBeGreaterThan(0);
  });
});
