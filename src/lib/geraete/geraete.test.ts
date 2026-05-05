import { describe, expect, it } from "vitest";
import { hasOverlap, wartungState } from "./index";

describe("geraete/hasOverlap", () => {
  const base = (overrides: Partial<Parameters<typeof hasOverlap>[0][number]>) =>
    ({
      id: "d-1",
      vonDatum: "2026-06-01",
      bisDatum: "2026-06-10",
      status: "geplant" as const,
      ...overrides,
    });

  it("zwei nicht-überlappende Zeiträume → kein Konflikt", () => {
    const existing = [base({ vonDatum: "2026-06-01", bisDatum: "2026-06-05" })];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-06",
      bisDatum: "2026-06-10",
    });
    expect(r).toBeNull();
  });

  it("überlappende Zeiträume → Konflikt-Treffer", () => {
    const existing = [base({ id: "d-A", vonDatum: "2026-06-01", bisDatum: "2026-06-08" })];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-05",
      bisDatum: "2026-06-12",
    });
    expect(r?.id).toBe("d-A");
  });

  it("Berührung am Endtag zählt als Konflikt (gleicher Tag)", () => {
    const existing = [base({ id: "d-B", vonDatum: "2026-06-01", bisDatum: "2026-06-10" })];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-10",
      bisDatum: "2026-06-15",
    });
    expect(r?.id).toBe("d-B");
  });

  it("stornierte Disposition blockiert nicht", () => {
    const existing = [
      base({ id: "d-C", vonDatum: "2026-06-01", bisDatum: "2026-06-10", status: "storniert" }),
    ];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-05",
      bisDatum: "2026-06-08",
    });
    expect(r).toBeNull();
  });

  it("zurueckgegebene Disposition blockiert nicht", () => {
    const existing = [
      base({ id: "d-D", vonDatum: "2026-06-01", bisDatum: "2026-06-10", status: "zurueck" }),
    ];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-05",
      bisDatum: "2026-06-08",
    });
    expect(r).toBeNull();
  });

  it("excludeId überspringt eigene Zeile beim Update", () => {
    const existing = [
      base({ id: "self", vonDatum: "2026-06-01", bisDatum: "2026-06-10" }),
      base({ id: "other", vonDatum: "2026-07-01", bisDatum: "2026-07-10" }),
    ];
    const r = hasOverlap(
      existing,
      { vonDatum: "2026-06-03", bisDatum: "2026-06-08" },
      "self"
    );
    expect(r).toBeNull();
  });

  it("zwei aktive Dispositionen für selbes Gerät überlappend → Konflikt", () => {
    const existing = [
      base({ id: "d-aktiv", vonDatum: "2026-06-01", bisDatum: "2026-06-30", status: "aktiv" }),
    ];
    const r = hasOverlap(existing, {
      vonDatum: "2026-06-15",
      bisDatum: "2026-06-20",
    });
    expect(r?.id).toBe("d-aktiv");
  });
});

describe("geraete/wartungState", () => {
  const today = new Date(Date.UTC(2026, 4, 5)); // 2026-05-05

  it("durchgeführt → done (auch wenn faellig in der Zukunft)", () => {
    expect(wartungState("2026-12-01", "2026-04-15", "uvv_pruefung", today)).toBe(
      "done"
    );
  });

  it("faellig in Vergangenheit, nicht durchgeführt → overdue", () => {
    expect(wartungState("2026-04-30", null, "uvv_pruefung", today)).toBe(
      "overdue"
    );
  });

  it("faellig in 10 Tagen, UVV → expiring (Lead 30 Tage)", () => {
    expect(wartungState("2026-05-15", null, "uvv_pruefung", today)).toBe(
      "expiring"
    );
  });

  it("faellig in 60 Tagen, UVV → ok", () => {
    expect(wartungState("2026-07-04", null, "uvv_pruefung", today)).toBe("ok");
  });

  it("Reparatur faellig in 20 Tagen → ok (Lead nur 14 Tage)", () => {
    expect(wartungState("2026-05-25", null, "reparatur", today)).toBe("ok");
  });
});
