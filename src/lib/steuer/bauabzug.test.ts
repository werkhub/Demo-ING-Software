import { describe, expect, it } from "vitest";
import {
  BAUABZUG_BAGATELLGRENZE_CENTS,
  BAUABZUG_PERCENT,
  anmeldungDeadline,
  computeAbzug,
  monthRange,
  needsAbzug,
  previousMonthIso,
} from "./bauabzug";

describe("needsAbzug", () => {
  it("verneint Abzug bei gültiger Bescheinigung am Rechnungsdatum", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: "F-2026-12345",
          freistellungsbescheinigungGueltigBis: "2026-12-31",
        },
        "2026-06-15"
      )
    ).toBe(false);
  });

  it("erkennt Abzug bei abgelaufener Bescheinigung", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: "F-2026-12345",
          freistellungsbescheinigungGueltigBis: "2026-01-31",
        },
        "2026-06-15"
      )
    ).toBe(true);
  });

  it("akzeptiert Bescheinigung, die genau am Rechnungsdatum endet", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: "F-1",
          freistellungsbescheinigungGueltigBis: "2026-06-15",
        },
        "2026-06-15"
      )
    ).toBe(false);
  });

  it("erkennt Abzug bei fehlender Nummer", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: null,
          freistellungsbescheinigungGueltigBis: "2026-12-31",
        },
        "2026-06-15"
      )
    ).toBe(true);
  });

  it("erkennt Abzug bei fehlendem Gültig-bis", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: "F-1",
          freistellungsbescheinigungGueltigBis: null,
        },
        "2026-06-15"
      )
    ).toBe(true);
  });

  it("erkennt Abzug bei kaputtem Datum-Format", () => {
    expect(
      needsAbzug(
        {
          freistellungsbescheinigungNr: "F-1",
          freistellungsbescheinigungGueltigBis: "12/2026",
        },
        "2026-06-15"
      )
    ).toBe(true);
  });
});

describe("computeAbzug", () => {
  it("rechnet 15 % vom Brutto bei needs=true und über Bagatell", () => {
    const r = computeAbzug({ bruttoCents: 100_000_00, needs: true });
    expect(r.applies).toBe(true);
    expect(r.einbehaltCents).toBe(15_000_00);
    expect(r.auszahlungCents).toBe(85_000_00);
  });

  it("rundet kaufmännisch auf volle Cent (über Bagatell)", () => {
    // 5_000_07 Cent × 15 % = 75_001.05 → round = 75_001
    const r = computeAbzug({ bruttoCents: 5_000_07, needs: true });
    expect(r.einbehaltCents).toBe(75_001);
    expect(r.auszahlungCents).toBe(5_000_07 - 75_001);
  });

  it("verneint Abzug bei needs=false (Freistellung gültig)", () => {
    const r = computeAbzug({ bruttoCents: 100_000_00, needs: false });
    expect(r.applies).toBe(false);
    expect(r.einbehaltCents).toBe(0);
    expect(r.auszahlungCents).toBe(100_000_00);
    expect(r.reason).toMatch(/Freistellung/);
  });

  it("verneint Abzug bei Bagatelle (< 5.000 €)", () => {
    const r = computeAbzug({
      bruttoCents: BAUABZUG_BAGATELLGRENZE_CENTS - 1,
      needs: true,
    });
    expect(r.applies).toBe(false);
    expect(r.einbehaltCents).toBe(0);
    expect(r.reason).toMatch(/Bagatelle/);
  });

  it("greift bei genau 5.000 € Brutto", () => {
    const r = computeAbzug({
      bruttoCents: BAUABZUG_BAGATELLGRENZE_CENTS,
      needs: true,
    });
    expect(r.applies).toBe(true);
    expect(r.einbehaltCents).toBe(75_000); // 5000 € × 15 % = 750 €
  });

  it("dokumentiert Prozent-Konstante in der Begründung", () => {
    const r = computeAbzug({ bruttoCents: 10_000_00, needs: true });
    expect(r.reason).toContain(`${BAUABZUG_PERCENT} %`);
  });
});

describe("anmeldungDeadline", () => {
  it("liefert den 10. des Folgemonats", () => {
    expect(anmeldungDeadline("2026-03")).toBe("2026-04-10");
    expect(anmeldungDeadline("2026-12")).toBe("2027-01-10");
  });

  it("wirft bei ungültigem Format", () => {
    expect(() => anmeldungDeadline("2026/03")).toThrow();
  });
});

describe("previousMonthIso", () => {
  it("liefert den Vormonat im YYYY-MM-Format", () => {
    expect(previousMonthIso(new Date(Date.UTC(2026, 5, 5)))).toBe("2026-05");
  });

  it("wechselt das Jahr bei Januar", () => {
    expect(previousMonthIso(new Date(Date.UTC(2026, 0, 5)))).toBe("2025-12");
  });
});

describe("monthRange", () => {
  it("liefert ersten und letzten Tag", () => {
    expect(monthRange("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(monthRange("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});
