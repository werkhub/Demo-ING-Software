import { describe, expect, it } from "vitest";
import { computeWorkingCapital } from "./working-capital";

describe("kpi/working-capital", () => {
  it("leere Inputs → null", () => {
    expect(computeWorkingCapital([], [])).toEqual({
      value: null,
      forderungenOffen: 0,
      verbindlichkeitenOffen: 0,
    });
  });

  it("addiert offene AR-Status, ignoriert entwurf/bezahlt", () => {
    const r = computeWorkingCapital(
      [
        { status: "versendet", payoutGross: 10000 },
        { status: "teilweise_bezahlt", payoutGross: 5000 },
        { status: "mahnung_2", payoutGross: 7000 },
        { status: "bezahlt", payoutGross: 99999 },
        { status: "entwurf", payoutGross: 88888 },
      ],
      []
    );
    expect(r.forderungenOffen).toBe(22000);
    expect(r.verbindlichkeitenOffen).toBe(0);
    expect(r.value).toBe(22000);
  });

  it("zieht offene ER ab (eingegangen + geprueft)", () => {
    const r = computeWorkingCapital(
      [{ status: "versendet", payoutGross: 10000 }],
      [
        { status: "eingegangen", totalGross: 4000 },
        { status: "geprueft", totalGross: 1000 },
        { status: "freigegeben", totalGross: 99999 },
        { status: "abgelehnt", totalGross: 88888 },
      ]
    );
    expect(r.verbindlichkeitenOffen).toBe(5000);
    expect(r.value).toBe(5000);
  });

  it("nimmt totalGross=null als 0", () => {
    const r = computeWorkingCapital(
      [],
      [{ status: "eingegangen", totalGross: null }]
    );
    expect(r.value).toBe(0);
  });

  it("kann negativ werden bei mehr offenen Verbindlichkeiten", () => {
    const r = computeWorkingCapital(
      [{ status: "versendet", payoutGross: 1000 }],
      [{ status: "eingegangen", totalGross: 5000 }]
    );
    expect(r.value).toBe(-4000);
  });
});
