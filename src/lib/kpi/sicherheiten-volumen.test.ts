import { describe, expect, it } from "vitest";
import { computeSicherheitenVolumen } from "./sicherheiten-volumen";

describe("kpi/sicherheiten-volumen", () => {
  it("leere Liste → null", () => {
    expect(computeSicherheitenVolumen([])).toEqual({
      value: null,
      activeCount: 0,
    });
  });

  it("summiert nur aktive", () => {
    const r = computeSicherheitenVolumen([
      { amount: 10000, status: "aktiv" },
      { amount: 25000, status: "aktiv" },
      { amount: 99999, status: "freigegeben" },
      { amount: 50000, status: "verfallen" },
      { amount: 7000, status: "rueckgabe_angefordert" },
    ]);
    expect(r.value).toBe(35000);
    expect(r.activeCount).toBe(2);
  });

  it("alle nicht-aktiv → 0 (Workspace hat Sicherheiten gehabt, aber alle abgewickelt)", () => {
    const r = computeSicherheitenVolumen([
      { amount: 10000, status: "freigegeben" },
    ]);
    expect(r.value).toBe(0);
    expect(r.activeCount).toBe(0);
  });
});
