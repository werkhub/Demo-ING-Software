import { describe, expect, it } from "vitest";
import { computeVorgangRiskScore } from "./risk-score";

const REFERENCE_NOW = new Date("2026-05-01T08:00:00");

describe("computeVorgangRiskScore", () => {
  it("returns 0 für abgeschlossene Vorgänge unabhängig von Frist und Kategorie", () => {
    const score = computeVorgangRiskScore({
      category: "maengelruege",
      status: "abgeschlossen",
      dueDate: "2026-05-02",
      now: REFERENCE_NOW,
    });
    expect(score).toBe(0);
  });

  it("returns 0 für archivierte Vorgänge", () => {
    const score = computeVorgangRiskScore({
      category: "vertragspflicht",
      status: "archiviert",
      dueDate: null,
      now: REFERENCE_NOW,
    });
    expect(score).toBe(0);
  });

  it("vergibt Kategorie-Basisgewicht ohne Frist", () => {
    expect(
      computeVorgangRiskScore({
        category: "maengelruege",
        status: "offen",
        dueDate: null,
        now: REFERENCE_NOW,
      })
    ).toBe(35);
    expect(
      computeVorgangRiskScore({
        category: "vertragspflicht",
        status: "offen",
        dueDate: null,
        now: REFERENCE_NOW,
      })
    ).toBe(30);
    expect(
      computeVorgangRiskScore({
        category: "anlieferung",
        status: "offen",
        dueDate: null,
        now: REFERENCE_NOW,
      })
    ).toBe(15);
    expect(
      computeVorgangRiskScore({
        category: "sonstiges",
        status: "offen",
        dueDate: null,
        now: REFERENCE_NOW,
      })
    ).toBe(10);
  });

  it("erhöht Score bei kritischer Frist (<= 1 Tag)", () => {
    const heute = computeVorgangRiskScore({
      category: "maengelruege",
      status: "offen",
      dueDate: "2026-05-01",
      now: REFERENCE_NOW,
    });
    const morgen = computeVorgangRiskScore({
      category: "maengelruege",
      status: "offen",
      dueDate: "2026-05-02",
      now: REFERENCE_NOW,
    });
    // Basis 35 + 25 (≤1 Tag) = 60
    expect(heute).toBe(60);
    expect(morgen).toBe(60);
  });

  it("vergibt höchsten Frist-Bonus bei Überfälligkeit", () => {
    const score = computeVorgangRiskScore({
      category: "vertragspflicht",
      status: "in_bearbeitung",
      dueDate: "2026-04-25", // 6 Tage überfällig
      now: REFERENCE_NOW,
    });
    // Basis 30 + 30 (überfällig) + 4 (in_bearbeitung) = 64
    expect(score).toBe(64);
  });

  it("addiert Status-Bonus für 'wartet auf Anwalt'", () => {
    const score = computeVorgangRiskScore({
      category: "maengelruege",
      status: "wartet_auf_anwalt",
      dueDate: null,
      now: REFERENCE_NOW,
    });
    // Basis 35 + 12 = 47
    expect(score).toBe(47);
  });

  it("addiert Citation-Bonus gedeckelt auf 15", () => {
    const wenig = computeVorgangRiskScore({
      category: "anlieferung",
      status: "offen",
      dueDate: null,
      citationCount: 2,
      now: REFERENCE_NOW,
    });
    const viel = computeVorgangRiskScore({
      category: "anlieferung",
      status: "offen",
      dueDate: null,
      citationCount: 20,
      now: REFERENCE_NOW,
    });
    expect(wenig).toBe(15 + 6); // 2*3 = 6
    expect(viel).toBe(15 + 15); // gedeckelt
  });

  it("deckelt Gesamtscore auf 100", () => {
    const score = computeVorgangRiskScore({
      category: "maengelruege",
      status: "wartet_auf_anwalt",
      dueDate: "2026-04-15", // sehr überfällig
      citationCount: 10,
      documentCount: 10,
      now: REFERENCE_NOW,
    });
    // 35 + 30 + 12 + 15 + 8 = 100, gedeckelt
    expect(score).toBe(100);
  });

  it("ist zwischen 0 und 100 für sehr unterschiedliche Eingaben", () => {
    const inputs = [
      { category: "sonstiges", status: "offen", dueDate: null },
      { category: "vertragspflicht", status: "in_bearbeitung", dueDate: "2026-05-15" },
      { category: "maengelruege", status: "wartet_auf_anwalt", dueDate: "2026-04-01" },
    ] as const;
    for (const i of inputs) {
      const s = computeVorgangRiskScore({ ...i, now: REFERENCE_NOW });
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
