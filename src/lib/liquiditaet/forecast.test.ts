import { describe, expect, it } from "vitest";
import {
  aggregateLohnByMonth,
  buildForecast,
  findEngeLiquiditaet,
  summarize,
} from "./forecast";

const baseConfig = {
  basisdatum: "2024-01-01",
  horizontTage: 30,
  annahmeFristTageAn: 14,
  annahmeFristTageNu: 30,
  kontostandStartCents: 1_000_000, // 10.000 EUR
};

describe("liquiditaet/buildForecast", () => {
  it("liefert Tagesreihe für basisdatum + horizontTage + 1", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [],
      nuRechnungen: [],
      lohnMonate: [],
      mieten: [],
    });
    expect(rows).toHaveLength(31); // Tag 0 bis Tag 30
    expect(rows[0].datum).toBe("2024-01-01");
    expect(rows[30].datum).toBe("2024-01-31");
    expect(rows.every((r) => r.kontostandCents === 1_000_000)).toBe(true);
  });

  it("AR fließt am dueDate als Einnahme ein", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [
        {
          invoiceDate: "2024-01-05",
          dueDate: "2024-01-15",
          bruttoCents: 119000, // 1190 EUR
          status: "versendet",
          paidAt: null,
        },
      ],
      nuRechnungen: [],
      lohnMonate: [],
      mieten: [],
    });
    const day15 = rows.find((r) => r.datum === "2024-01-15")!;
    expect(day15.einnahmenCents).toBe(119000);
    expect(day15.kontostandCents).toBe(1_000_000 + 119_000);
  });

  it("AR ohne dueDate nutzt invoiceDate + annahmeFristTageAn", () => {
    const rows = buildForecast({
      config: { ...baseConfig, annahmeFristTageAn: 14 },
      ars: [
        {
          invoiceDate: "2024-01-01",
          dueDate: null,
          bruttoCents: 50000,
          status: "versendet",
          paidAt: null,
        },
      ],
      nuRechnungen: [],
      lohnMonate: [],
      mieten: [],
    });
    const day15 = rows.find((r) => r.datum === "2024-01-15")!;
    expect(day15.einnahmenCents).toBe(50000);
  });

  it("bezahlte AR fließt nicht in Forecast", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [
        {
          invoiceDate: "2024-01-05",
          dueDate: "2024-01-15",
          bruttoCents: 119000,
          status: "bezahlt",
          paidAt: new Date(),
        },
      ],
      nuRechnungen: [],
      lohnMonate: [],
      mieten: [],
    });
    expect(rows.find((r) => r.datum === "2024-01-15")?.einnahmenCents).toBe(0);
  });

  it("NU-Rechnung als Ausgabe am Zahlungsdatum", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: "2024-01-20",
          bruttoCents: 119000,
          ausgezahltCents: 100000,
          status: "geprueft",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    const day20 = rows.find((r) => r.datum === "2024-01-20")!;
    expect(day20.ausgabenCents).toBe(100000); // ausgezahltCents bevorzugt
  });

  it("strittige NU-Rechnung wird ausgeklammert", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: null,
          bruttoCents: 119000,
          ausgezahltCents: 0,
          status: "strittig",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    expect(rows.every((r) => r.ausgabenCents === 0)).toBe(true);
  });

  it("Lohn am letzten Tag des Monats", () => {
    const rows = buildForecast({
      config: baseConfig,
      ars: [],
      nuRechnungen: [],
      lohnMonate: [{ ym: "2024-01", bruttoCents: 500000 }],
      mieten: [],
    });
    const last = rows.find((r) => r.datum === "2024-01-31")!;
    expect(last.ausgabenCents).toBe(500000);
  });

  it("Miete am 1. eines jeden Monats", () => {
    const rows = buildForecast({
      config: { ...baseConfig, basisdatum: "2024-01-15", horizontTage: 60 },
      ars: [],
      nuRechnungen: [],
      lohnMonate: [],
      mieten: [
        {
          monatlichCents: 100000,
          vonDatum: null,
          bisDatum: null,
          bezeichnung: "Bagger",
        },
      ],
    });
    // 2024-02-01 und 2024-03-01 sollten Miete buchen
    const feb = rows.find((r) => r.datum === "2024-02-01")!;
    expect(feb.ausgabenCents).toBe(100000);
    const mar = rows.find((r) => r.datum === "2024-03-01")!;
    expect(mar.ausgabenCents).toBe(100000);
  });

  it("kumuliert Kontostand korrekt bei Mix aus Ein- und Ausgabe", () => {
    const rows = buildForecast({
      config: { ...baseConfig, kontostandStartCents: 0 },
      ars: [
        {
          invoiceDate: "2024-01-01",
          dueDate: "2024-01-10",
          bruttoCents: 200000,
          status: "versendet",
          paidAt: null,
        },
      ],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: "2024-01-15",
          bruttoCents: 50000,
          ausgezahltCents: 0,
          status: "eingegangen",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    expect(rows.find((r) => r.datum === "2024-01-09")?.kontostandCents).toBe(0);
    expect(rows.find((r) => r.datum === "2024-01-10")?.kontostandCents).toBe(200000);
    expect(rows.find((r) => r.datum === "2024-01-15")?.kontostandCents).toBe(150000);
  });
});

describe("liquiditaet/findEngeLiquiditaet", () => {
  it("triggert wenn Kontostand <= 0 in Warn-Horizon", () => {
    const rows = buildForecast({
      config: { ...baseConfig, kontostandStartCents: 50000 },
      ars: [],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: "2024-01-10",
          bruttoCents: 100000,
          ausgezahltCents: 0,
          status: "eingegangen",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    const w = findEngeLiquiditaet(rows, 14);
    expect(w).not.toBeNull();
    expect(w?.datum).toBe("2024-01-10");
    expect(w?.kontostandCents).toBe(-50000);
  });

  it("triggert nicht außerhalb Warn-Horizon", () => {
    const rows = buildForecast({
      config: { ...baseConfig, kontostandStartCents: 50000 },
      ars: [],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: "2024-01-25",
          bruttoCents: 100000,
          ausgezahltCents: 0,
          status: "eingegangen",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    const w = findEngeLiquiditaet(rows, 14);
    expect(w).toBeNull();
  });
});

describe("liquiditaet/summarize", () => {
  it("aggregiert Ein/Aus + Min/Max", () => {
    const rows = buildForecast({
      config: { ...baseConfig, kontostandStartCents: 100000 },
      ars: [
        {
          invoiceDate: "2024-01-01",
          dueDate: "2024-01-10",
          bruttoCents: 50000,
          status: "versendet",
          paidAt: null,
        },
      ],
      nuRechnungen: [
        {
          rechnungsdatum: "2024-01-01",
          zahlungsdatum: "2024-01-20",
          bruttoCents: 30000,
          ausgezahltCents: 0,
          status: "eingegangen",
        },
      ],
      lohnMonate: [],
      mieten: [],
    });
    const s = summarize(rows);
    expect(s.einnahmenSumme).toBe(50000);
    expect(s.ausgabenSumme).toBe(30000);
    expect(s.kontostandEnde).toBe(120000);
    expect(s.kontostandMax).toBe(150000);
  });
});

describe("liquiditaet/aggregateLohnByMonth", () => {
  it("summiert Stunden × Stundensatz pro Monat", () => {
    const stunden = [
      { datum: "2024-01-15", stunden: 8, stundensatzCents: 4500 },
      { datum: "2024-01-16", stunden: 8, stundensatzCents: 4500 },
      { datum: "2024-02-01", stunden: 4, stundensatzCents: 5000 },
    ];
    const r = aggregateLohnByMonth(stunden);
    const jan = r.find((x) => x.ym === "2024-01");
    const feb = r.find((x) => x.ym === "2024-02");
    expect(jan?.bruttoCents).toBe(72000); // 16 * 4500
    expect(feb?.bruttoCents).toBe(20000); // 4 * 5000
  });
});
