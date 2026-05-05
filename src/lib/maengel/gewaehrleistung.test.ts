import { describe, expect, it } from "vitest";
import {
  computeGewaehrleistungEnd,
  daysUntilGewaehrleistungEnd,
  gewaehrleistungEndState,
  GEWAEHRLEISTUNG_WARN_DAYS,
} from "./index";

describe("computeGewaehrleistungEnd", () => {
  it("liefert null bei fehlendem Vertragstyp", () => {
    expect(computeGewaehrleistungEnd("2024-05-15", null)).toBeNull();
  });

  it("4 Jahre - 1 Tag bei VOB-Vertrag", () => {
    expect(computeGewaehrleistungEnd("2024-05-15", "vob_vertrag")).toBe(
      "2028-05-14"
    );
  });

  it("5 Jahre - 1 Tag bei BGB-Werkvertrag", () => {
    expect(computeGewaehrleistungEnd("2024-05-15", "bgb_werkvertrag")).toBe(
      "2029-05-14"
    );
  });

  it("5 Jahre - 1 Tag bei Verbraucherbauvertrag", () => {
    expect(
      computeGewaehrleistungEnd("2024-05-15", "verbraucherbauvertrag")
    ).toBe("2029-05-14");
  });

  it("liefert null bei ungültigem Datumsformat", () => {
    expect(computeGewaehrleistungEnd("15.05.2024", "vob_vertrag")).toBeNull();
    expect(computeGewaehrleistungEnd("", "vob_vertrag")).toBeNull();
  });

  it("Schaltjahr-Datum bleibt korrekt", () => {
    // 29. Februar 2024 (Schaltjahr) + 4 J = 29.02.2028 (auch Schaltjahr)
    // → letzter gültiger Tag = 28.02.2028
    expect(computeGewaehrleistungEnd("2024-02-29", "vob_vertrag")).toBe(
      "2028-02-28"
    );
  });
});

describe("daysUntilGewaehrleistungEnd / gewaehrleistungEndState", () => {
  const today = new Date(2026, 4, 5); // 2026-05-05

  it("ok wenn weit in der Zukunft", () => {
    expect(
      gewaehrleistungEndState({ warrantyEnd: "2028-05-14" }, today)
    ).toBe("ok");
  });

  it("expiring wenn in 60 Tagen oder weniger", () => {
    const inSixtyDays = new Date(today);
    inSixtyDays.setDate(inSixtyDays.getDate() + GEWAEHRLEISTUNG_WARN_DAYS);
    const iso = inSixtyDays.toISOString().slice(0, 10);
    expect(gewaehrleistungEndState({ warrantyEnd: iso }, today)).toBe(
      "expiring"
    );
  });

  it("expired wenn in der Vergangenheit", () => {
    expect(
      gewaehrleistungEndState({ warrantyEnd: "2025-01-01" }, today)
    ).toBe("expired");
  });

  it("ok wenn warrantyEnd null", () => {
    expect(gewaehrleistungEndState({ warrantyEnd: null }, today)).toBe("ok");
  });

  it("daysUntilGewaehrleistungEnd liefert exakte Differenz", () => {
    expect(
      daysUntilGewaehrleistungEnd({ warrantyEnd: "2026-05-15" }, today)
    ).toBe(10);
    expect(
      daysUntilGewaehrleistungEnd({ warrantyEnd: "2026-04-25" }, today)
    ).toBe(-10);
  });
});
