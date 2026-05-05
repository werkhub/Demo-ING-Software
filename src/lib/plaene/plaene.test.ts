import { describe, expect, it } from "vitest";
import { aggregateFreigabeStatus, sanitizeFileName } from "./index";

describe("aggregateFreigabeStatus", () => {
  it("liefert null bei leerer Liste (kein Vorschlag)", () => {
    const agg = aggregateFreigabeStatus([]);
    expect(agg.total).toBe(0);
    expect(agg.nextPlanStatus).toBeNull();
  });

  it("eine zugestimmte Freigabe → freigegeben", () => {
    const agg = aggregateFreigabeStatus(["zugestimmt"]);
    expect(agg.total).toBe(1);
    expect(agg.zugestimmt).toBe(1);
    expect(agg.nextPlanStatus).toBe("freigegeben");
  });

  it("alle drei zugestimmt (Bauherr/Statiker/Polier) → freigegeben", () => {
    const agg = aggregateFreigabeStatus([
      "zugestimmt",
      "zugestimmt",
      "zugestimmt",
    ]);
    expect(agg.total).toBe(3);
    expect(agg.zugestimmt).toBe(3);
    expect(agg.nextPlanStatus).toBe("freigegeben");
  });

  it("zwei zugestimmt + eine offen → kein Status-Wechsel (null)", () => {
    const agg = aggregateFreigabeStatus(["zugestimmt", "zugestimmt", "offen"]);
    expect(agg.zugestimmt).toBe(2);
    expect(agg.offen).toBe(1);
    expect(agg.nextPlanStatus).toBeNull();
  });

  it("eine abgelehnt → entwurf (zurück zur Überarbeitung)", () => {
    const agg = aggregateFreigabeStatus([
      "zugestimmt",
      "abgelehnt",
      "zugestimmt",
    ]);
    expect(agg.abgelehnt).toBe(1);
    expect(agg.nextPlanStatus).toBe("entwurf");
  });

  it("nur zurueckgestellt → kein Vorschlag", () => {
    const agg = aggregateFreigabeStatus([
      "zurueckgestellt",
      "zurueckgestellt",
    ]);
    expect(agg.zurueckgestellt).toBe(2);
    expect(agg.nextPlanStatus).toBeNull();
  });

  it("zugestimmt + zurueckgestellt → noch nicht freigegeben (null)", () => {
    const agg = aggregateFreigabeStatus(["zugestimmt", "zurueckgestellt"]);
    expect(agg.nextPlanStatus).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("entfernt Pfad-Separatoren", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toMatch(/[\\/]/);
  });

  it("ersetzt Sonderzeichen aber behält Endungen", () => {
    const out = sanitizeFileName("Plan A 101 (Stand 2026).pdf");
    expect(out.endsWith(".pdf")).toBe(true);
    expect(/^[A-Za-z0-9._-]+$/.test(out)).toBe(true);
  });

  it("Leerstring → 'datei'", () => {
    expect(sanitizeFileName("")).toBe("datei");
  });

  it("Punkt-Prefix wird entwertet", () => {
    expect(sanitizeFileName(".bashrc")).not.toMatch(/^\./);
  });
});

/**
 * Versions-Zähler-Verhalten ist in den Server-Actions implementiert (max+1).
 * Hier verifizieren wir die monotone-Zähler-Eigenschaft als reine Zahlen-Logik.
 */
describe("Versions-Zähler (Logik)", () => {
  function nextNr(existing: number[]): number {
    return (existing.length === 0 ? 0 : Math.max(...existing)) + 1;
  }

  it("erste Version ist 1", () => {
    expect(nextNr([])).toBe(1);
  });

  it("nach v1 kommt v2", () => {
    expect(nextNr([1])).toBe(2);
  });

  it("nach v1+v2+v3 kommt v4", () => {
    expect(nextNr([1, 2, 3])).toBe(4);
  });

  it("Lücken füllen sich nicht (z. B. nach Lösch-v2)", () => {
    expect(nextNr([1, 3])).toBe(4);
  });
});
