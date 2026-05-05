import { describe, expect, it } from "vitest";
import {
  matchBestellungMitLieferscheinen,
  matchBestellungMitRechnung,
  type BestellpositionLike,
  type LieferscheinpositionLike,
  type RechnungspositionLike,
} from "./match";
import { aggregateMaterialAufwand } from "./aggregate";

const bp = (
  id: string,
  posNr: string,
  menge: number,
  epCents: number
): BestellpositionLike => ({
  id,
  posNr,
  bezeichnung: `Pos ${posNr}`,
  menge,
  einzelpreisCents: epCents,
  gesamtpreisCents: Math.round(menge * epCents),
});

const lsp = (
  bestellposId: string | null,
  menge: number
): LieferscheinpositionLike => ({
  bestellposId,
  bezeichnung: bestellposId ? `LS-Pos ${bestellposId}` : "—",
  menge,
});

describe("matchBestellungMitLieferscheinen", () => {
  it("vollständig geliefert → complete=true", () => {
    const bps = [bp("a", "1", 100, 500), bp("b", "2", 50, 1000)];
    const lps = [lsp("a", 100), lsp("b", 50)];
    const r = matchBestellungMitLieferscheinen(bps, lps);
    expect(r.complete).toBe(true);
    expect(r.missingMengen).toHaveLength(0);
    expect(r.surplusMengen).toHaveLength(0);
  });

  it("teilweise geliefert → missingMengen", () => {
    const bps = [bp("a", "1", 100, 500), bp("b", "2", 50, 1000)];
    const lps = [lsp("a", 60), lsp("b", 50)];
    const r = matchBestellungMitLieferscheinen(bps, lps);
    expect(r.complete).toBe(false);
    expect(r.missingMengen).toHaveLength(1);
    expect(r.missingMengen[0].posNr).toBe("1");
    expect(r.missingMengen[0].art).toBe("menge_zu_wenig");
    expect(r.surplusMengen).toHaveLength(0);
  });

  it("Surplus → surplusMengen", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 110)]; // 10% mehr — außerhalb 2% Toleranz
    const r = matchBestellungMitLieferscheinen(bps, lps);
    expect(r.complete).toBe(false);
    expect(r.surplusMengen).toHaveLength(1);
    expect(r.surplusMengen[0].art).toBe("menge_zu_viel");
  });

  it("innerhalb Toleranz (2%) → complete=true", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 101.5)]; // +1.5%
    const r = matchBestellungMitLieferscheinen(bps, lps);
    expect(r.complete).toBe(true);
  });
});

describe("matchBestellungMitRechnung", () => {
  it("exakte Übereinstimmung → ok", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 100)];
    const rps: RechnungspositionLike[] = [
      {
        lvPosition: "1",
        description: "Pos 1",
        quantity: 100,
        unitPrice: 5.0,
        totalPrice: 500.0,
      },
    ];
    const r = matchBestellungMitRechnung({
      bestellPositionen: bps,
      lieferscheinPositionen: lps,
      rechnungPositionen: rps,
    });
    expect(r.status).toBe("ok");
    expect(r.abweichungen).toHaveLength(0);
  });

  it("1% Mengenabweichung innerhalb Toleranz → ok (mit Cent-Toleranz)", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 100)];
    const rps: RechnungspositionLike[] = [
      {
        lvPosition: "1",
        description: "Pos 1",
        quantity: 101,
        unitPrice: 5.0,
        totalPrice: 505.0,
      },
    ];
    // 1% Mengen-Diff impliziert 500ct Betrags-Diff — beide brauchen Toleranz.
    const r = matchBestellungMitRechnung({
      bestellPositionen: bps,
      lieferscheinPositionen: lps,
      rechnungPositionen: rps,
      toleranzCents: 1000,
    });
    expect(r.status).toBe("ok");
  });

  it("5% Mengenabweichung außerhalb Toleranz → abweichung", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 100)];
    const rps: RechnungspositionLike[] = [
      {
        lvPosition: "1",
        description: "Pos 1",
        quantity: 105,
        unitPrice: 5.0,
        totalPrice: 525.0,
      },
    ];
    const r = matchBestellungMitRechnung({
      bestellPositionen: bps,
      lieferscheinPositionen: lps,
      rechnungPositionen: rps,
    });
    expect(r.status).toBe("abweichung");
    expect(
      r.abweichungen.some((a) => a.art === "rechnung_menge")
    ).toBe(true);
  });

  it("ohne_zuordnung wenn lvPosition unbekannt → unklar", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 100)];
    const rps: RechnungspositionLike[] = [
      {
        lvPosition: "999",
        description: "Phantom-Pos",
        quantity: 5,
        unitPrice: 10,
        totalPrice: 50,
      },
    ];
    const r = matchBestellungMitRechnung({
      bestellPositionen: bps,
      lieferscheinPositionen: lps,
      rechnungPositionen: rps,
    });
    expect(r.status).toBe("unklar");
    expect(r.abweichungen[0].art).toBe("ohne_zuordnung");
  });

  it("0-Cent Toleranz: 100ct Abweichung → abweichung", () => {
    const bps = [bp("a", "1", 100, 500)];
    const lps = [lsp("a", 100)];
    const rps: RechnungspositionLike[] = [
      {
        lvPosition: "1",
        description: "Pos 1",
        quantity: 100,
        unitPrice: 5.01,
        totalPrice: 501.0, // erwartet 500.00, +100 ct
      },
    ];
    const r = matchBestellungMitRechnung({
      bestellPositionen: bps,
      lieferscheinPositionen: lps,
      rechnungPositionen: rps,
      toleranzCents: 0,
    });
    expect(r.status).toBe("abweichung");
    expect(
      r.abweichungen.some((a) => a.art === "rechnung_betrag")
    ).toBe(true);
  });
});

describe("aggregateMaterialAufwand", () => {
  it("summiert pro LV-Position, ignoriert null-LV und stornierte", () => {
    const rows = [
      {
        lvPositionId: "lv-1",
        gesamtpreisCents: 50000,
        bestellungStatus: "vollstaendig" as const,
      },
      {
        lvPositionId: "lv-1",
        gesamtpreisCents: 30000,
        bestellungStatus: "teilgeliefert" as const,
      },
      {
        lvPositionId: "lv-2",
        gesamtpreisCents: 20000,
        bestellungStatus: "offen" as const,
      },
      {
        lvPositionId: "lv-1",
        gesamtpreisCents: 99999,
        bestellungStatus: "storniert" as const,
      },
      {
        lvPositionId: null,
        gesamtpreisCents: 12345,
        bestellungStatus: "vollstaendig" as const,
      },
    ];
    const m = aggregateMaterialAufwand(rows);
    expect(m.get("lv-1")).toBe(80000);
    expect(m.get("lv-2")).toBe(20000);
    expect(m.size).toBe(2);
  });
});
