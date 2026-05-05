import { describe, expect, it } from "vitest";
import {
  istUeberfaellig,
  nextPruefungDate,
  tageBisPruefung,
  zustandsKlasse,
} from "./din1076";

describe("nextPruefungDate", () => {
  it("Hauptprüfung +6 Jahre", () => {
    expect(nextPruefungDate("hauptpruefung", "2024-05-15")).toBe("2030-05-15");
  });
  it("Einfache Prüfung +3 Jahre", () => {
    expect(nextPruefungDate("einfache_pruefung", "2024-05-15")).toBe(
      "2027-05-15"
    );
  });
  it("Besichtigung +1 Jahr", () => {
    expect(nextPruefungDate("besichtigung", "2024-05-15")).toBe("2025-05-15");
  });
  it("Sonderprüfung hat kein Folge-Intervall", () => {
    expect(nextPruefungDate("sonderpruefung", "2024-05-15")).toBeNull();
  });
  it("null oder ungültig → null", () => {
    expect(nextPruefungDate("hauptpruefung", null)).toBeNull();
    expect(nextPruefungDate("hauptpruefung", "kaputt")).toBeNull();
    expect(nextPruefungDate("hauptpruefung", "")).toBeNull();
  });
  it("Schaltjahr 29.02. → 28.02. im nächsten Nicht-Schaltjahr", () => {
    // 2024-02-29 + 6 Jahre = 2030-03-01 (UTC normalisiert von 2030-02-29)
    const next = nextPruefungDate("hauptpruefung", "2024-02-29");
    expect(next).toBe("2030-03-01");
  });
});

describe("zustandsKlasse", () => {
  it("klassifiziert Notenbereiche korrekt", () => {
    expect(zustandsKlasse(1.0)).toBe("sehr_gut");
    expect(zustandsKlasse(1.4)).toBe("sehr_gut");
    expect(zustandsKlasse(1.5)).toBe("gut");
    expect(zustandsKlasse(1.9)).toBe("gut");
    expect(zustandsKlasse(2.0)).toBe("befriedigend");
    expect(zustandsKlasse(2.4)).toBe("befriedigend");
    expect(zustandsKlasse(2.5)).toBe("ausreichend");
    expect(zustandsKlasse(2.9)).toBe("ausreichend");
    expect(zustandsKlasse(3.0)).toBe("nicht_ausreichend");
    expect(zustandsKlasse(3.4)).toBe("nicht_ausreichend");
    expect(zustandsKlasse(3.5)).toBe("ungenuegend");
    expect(zustandsKlasse(4.0)).toBe("ungenuegend");
  });
  it("clampt Werte außerhalb [1.0, 4.0]", () => {
    expect(zustandsKlasse(0.5)).toBe("sehr_gut");
    expect(zustandsKlasse(5.0)).toBe("ungenuegend");
  });
});

describe("istUeberfaellig", () => {
  it("erkennt überfällige Termine", () => {
    expect(istUeberfaellig("2024-01-01", "2026-05-01")).toBe(true);
  });
  it("erkennt zukünftige Termine als nicht überfällig", () => {
    expect(istUeberfaellig("2030-01-01", "2026-05-01")).toBe(false);
  });
  it("genau heute = nicht überfällig", () => {
    expect(istUeberfaellig("2026-05-01", "2026-05-01")).toBe(false);
  });
  it("null → nicht überfällig", () => {
    expect(istUeberfaellig(null, "2026-05-01")).toBe(false);
  });
});

describe("tageBisPruefung", () => {
  it("positiv für zukünftige Termine", () => {
    expect(tageBisPruefung("2026-05-31", "2026-05-01")).toBe(30);
  });
  it("negativ für überfällige Termine", () => {
    expect(tageBisPruefung("2026-04-01", "2026-05-01")).toBe(-30);
  });
  it("0 für heute", () => {
    expect(tageBisPruefung("2026-05-01", "2026-05-01")).toBe(0);
  });
  it("null → null", () => {
    expect(tageBisPruefung(null, "2026-05-01")).toBeNull();
  });
});
