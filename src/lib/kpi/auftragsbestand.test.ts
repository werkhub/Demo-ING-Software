import { describe, expect, it } from "vitest";
import { computeAuftragsbestand } from "./auftragsbestand";

describe("kpi/auftragsbestand", () => {
  it("leere Liste → null (kein Datenstand)", () => {
    expect(computeAuftragsbestand([])).toEqual({
      value: null,
      activeProjects: 0,
    });
  });

  it("nur Bauphase + Abnahme zählen", () => {
    const r = computeAuftragsbestand([
      { value: 100000, status: "Bauphase" },
      { value: 50000, status: "Abnahme" },
      { value: 200000, status: "Gewährleistung" },
      { value: 70000, status: "Abgeschlossen" },
      { value: 30000, status: "Geplant" },
    ]);
    expect(r.value).toBe(150000);
    expect(r.activeProjects).toBe(2);
  });

  it("alle Projekte abgeschlossen → value=0 (Workspace existiert, aber kein Bestand)", () => {
    const r = computeAuftragsbestand([
      { value: 100000, status: "Abgeschlossen" },
    ]);
    expect(r.value).toBe(0);
    expect(r.activeProjects).toBe(0);
  });

  it("rundet auf ganze EUR", () => {
    const r = computeAuftragsbestand([
      { value: 100000.4, status: "Bauphase" },
      { value: 50000.5, status: "Bauphase" },
    ]);
    expect(r.value).toBe(150001);
  });
});
