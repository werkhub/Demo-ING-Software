import { describe, expect, it } from "vitest";
import {
  calcEinbehalte,
  calcFaelligkeit,
  calcKontoSaldo,
  canTransitionAuftrag,
  canTransitionRechnung,
  defaultBauabzugCents,
  isAusgleichOk,
  nuAufwandPerLvPosition,
} from "./index";

describe("nu-operations/state-machine", () => {
  it("Auftrag: offen → laufend OK", () => {
    expect(canTransitionAuftrag("offen", "laufend")).toBe(true);
  });
  it("Auftrag: fertig → laufend NICHT OK", () => {
    expect(canTransitionAuftrag("fertig", "laufend")).toBe(false);
  });
  it("Auftrag: gleicher Status immer OK", () => {
    expect(canTransitionAuftrag("offen", "offen")).toBe(true);
  });
  it("Rechnung: eingegangen → strittig OK", () => {
    expect(canTransitionRechnung("eingegangen", "strittig")).toBe(true);
  });
  it("Rechnung: gezahlt → strittig NICHT OK", () => {
    expect(canTransitionRechnung("gezahlt", "strittig")).toBe(false);
  });
  it("Rechnung: strittig → geprueft (Re-Prüfung) OK", () => {
    expect(canTransitionRechnung("strittig", "geprueft")).toBe(true);
  });
});

describe("nu-operations/calcEinbehalte", () => {
  it("Standard-Fall ohne Bauabzug", () => {
    const r = calcEinbehalte({
      bruttoCents: 119000, // 1190 EUR
      nettoCents: 100000, // 1000 EUR
      sicherheitseinbehaltPct: 5,
      gewaehrleistungseinbehaltPct: 5,
      skontoCents: 0,
      bauabzugCents: 0,
    });
    expect(r.sicherheitCents).toBe(5000);
    expect(r.gewaehrleistungCents).toBe(5000);
    expect(r.skontoCents).toBe(0);
    expect(r.bauabzugCents).toBe(0);
    // 119000 - 5000 - 5000 = 109000
    expect(r.ausgezahltCents).toBe(109000);
  });

  it("mit Bauabzug + Skonto", () => {
    const r = calcEinbehalte({
      bruttoCents: 119000,
      nettoCents: 100000,
      sicherheitseinbehaltPct: 5,
      gewaehrleistungseinbehaltPct: 0,
      skontoCents: 2380, // 2% von 119000
      bauabzugCents: 17850, // 15% von 119000
    });
    expect(r.bauabzugCents).toBe(17850);
    // 119000 - 5000 - 2380 - 17850 = 93770
    expect(r.ausgezahltCents).toBe(93770);
  });

  it("nicht negativ wenn Einbehalte > Brutto", () => {
    const r = calcEinbehalte({
      bruttoCents: 1000,
      nettoCents: 1000,
      sicherheitseinbehaltPct: 100,
      gewaehrleistungseinbehaltPct: 100,
      skontoCents: 0,
      bauabzugCents: 500,
    });
    expect(r.ausgezahltCents).toBe(0);
  });
});

describe("nu-operations/defaultBauabzugCents", () => {
  it("kein Abzug wenn Workspace nicht bauabzug-pflichtig", () => {
    expect(defaultBauabzugCents(100000, false, false)).toBe(0);
  });
  it("kein Abzug bei gültiger Freistellungsbescheinigung", () => {
    expect(defaultBauabzugCents(100000, true, true)).toBe(0);
  });
  it("15% Abzug ohne Freistellung", () => {
    expect(defaultBauabzugCents(100000, false, true)).toBe(15000);
  });
});

describe("nu-operations/calcFaelligkeit", () => {
  it("Vertragserfüllung mit Abnahmedatum", () => {
    const r = calcFaelligkeit({
      art: "vertragserfuellung",
      buchungDatum: "2024-01-15",
      abnahmeDatum: "2024-12-01",
      warrantyEndDatum: null,
      vertragstyp: "vob",
    });
    expect(r).toBe("2024-12-01");
  });

  it("Vertragserfüllung ohne Abnahme: Buchung + 18 Monate", () => {
    const r = calcFaelligkeit({
      art: "vertragserfuellung",
      buchungDatum: "2024-01-15",
      abnahmeDatum: null,
      warrantyEndDatum: null,
      vertragstyp: "vob",
    });
    expect(r).toBe("2025-07-15");
  });

  it("Gewährleistung VOB (4 Jahre) ab Abnahme", () => {
    const r = calcFaelligkeit({
      art: "gewaehrleistung",
      buchungDatum: "2024-01-15",
      abnahmeDatum: "2024-06-30",
      warrantyEndDatum: null,
      vertragstyp: "vob",
    });
    expect(r).toBe("2028-06-30");
  });

  it("Gewährleistung BGB (5 Jahre) ab Abnahme", () => {
    const r = calcFaelligkeit({
      art: "gewaehrleistung",
      buchungDatum: "2024-01-15",
      abnahmeDatum: "2024-06-30",
      warrantyEndDatum: null,
      vertragstyp: "bgb",
    });
    expect(r).toBe("2029-06-30");
  });

  it("warrantyEnd hat Vorrang vor Abnahme + Frist", () => {
    const r = calcFaelligkeit({
      art: "gewaehrleistung",
      buchungDatum: "2024-01-15",
      abnahmeDatum: "2024-06-30",
      warrantyEndDatum: "2027-12-31", // explizit gesetzt
      vertragstyp: "vob",
    });
    expect(r).toBe("2027-12-31");
  });
});

describe("nu-operations/calcKontoSaldo", () => {
  it("offene + freigegebene aggregiert", () => {
    const eintraege = [
      {
        einbehaltenerBetragCents: 5000,
        freigabeBetragCents: 0,
        freigegebenAm: null,
      },
      {
        einbehaltenerBetragCents: 5000,
        freigabeBetragCents: 5000,
        freigegebenAm: new Date(),
      },
      {
        einbehaltenerBetragCents: 3000,
        freigabeBetragCents: null,
        freigegebenAm: null,
      },
    ];
    const s = calcKontoSaldo(eintraege);
    expect(s.offenCents).toBe(8000);
    expect(s.freigegebenCents).toBe(5000);
    expect(s.gesamtCents).toBe(13000);
    expect(s.count).toBe(3);
  });

  it("isAusgleichOk: nur wenn nichts mehr offen", () => {
    expect(
      isAusgleichOk({ offenCents: 0, freigegebenCents: 5000, gesamtCents: 5000, count: 2 })
    ).toBe(true);
    expect(
      isAusgleichOk({ offenCents: 100, freigegebenCents: 0, gesamtCents: 100, count: 1 })
    ).toBe(false);
  });
});

describe("nu-operations/nuAufwandPerLvPosition", () => {
  it("aggregiert NU-Aufwand pro LV-Position", () => {
    const rechnungen = [
      {
        id: "r1",
        workspaceId: "ws",
        nuAuftragId: "a1",
        rechnungsnr: "R1",
        rechnungsdatum: "2024-01-15",
        bruttoCents: 119000,
        nettoCents: 100000,
        ustCents: 19000,
        einbehaltSicherheitCents: 0,
        einbehaltGewaehrleistungCents: 0,
        einbehaltSkontoCents: 0,
        bauabzugEinbehaltCents: 0,
        ausgezahltCents: 119000,
        zahlungsdatum: null,
        status: "gezahlt" as const,
        freigabeDurch: null,
        freigabeAm: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lv = [{ nuAuftragId: "a1", lvPositionId: "lv-1" }];
    const m = nuAufwandPerLvPosition(rechnungen, lv);
    expect(m.get("lv-1")).toBe(100000);
  });

  it("verteilt Aufwand auf mehrere LV-Positionen gleichmäßig", () => {
    const rechnungen = [
      {
        id: "r1",
        workspaceId: "ws",
        nuAuftragId: "a1",
        rechnungsnr: "R1",
        rechnungsdatum: "2024-01-15",
        bruttoCents: 119000,
        nettoCents: 100000,
        ustCents: 19000,
        einbehaltSicherheitCents: 0,
        einbehaltGewaehrleistungCents: 0,
        einbehaltSkontoCents: 0,
        bauabzugEinbehaltCents: 0,
        ausgezahltCents: 119000,
        zahlungsdatum: null,
        status: "gezahlt" as const,
        freigabeDurch: null,
        freigabeAm: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lv = [
      { nuAuftragId: "a1", lvPositionId: "lv-1" },
      { nuAuftragId: "a1", lvPositionId: "lv-2" },
    ];
    const m = nuAufwandPerLvPosition(rechnungen, lv);
    expect(m.get("lv-1")).toBe(50000);
    expect(m.get("lv-2")).toBe(50000);
  });

  it("ignoriert nicht-gezahlte und nicht-geprüfte Rechnungen", () => {
    const rechnungen = [
      {
        id: "r1",
        workspaceId: "ws",
        nuAuftragId: "a1",
        rechnungsnr: "R1",
        rechnungsdatum: "2024-01-15",
        bruttoCents: 119000,
        nettoCents: 100000,
        ustCents: 19000,
        einbehaltSicherheitCents: 0,
        einbehaltGewaehrleistungCents: 0,
        einbehaltSkontoCents: 0,
        bauabzugEinbehaltCents: 0,
        ausgezahltCents: 0,
        zahlungsdatum: null,
        status: "eingegangen" as const,
        freigabeDurch: null,
        freigabeAm: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lv = [{ nuAuftragId: "a1", lvPositionId: "lv-1" }];
    const m = nuAufwandPerLvPosition(rechnungen, lv);
    expect(m.size).toBe(0);
  });
});
