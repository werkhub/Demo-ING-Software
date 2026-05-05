import { describe, expect, it } from "vitest";
import {
  WITTERUNG_THRESHOLDS,
  detectWitterungsbehinderung,
  inferWeatherCondition,
} from "./witterung-detection";

describe("detectWitterungsbehinderung — Schwellen", () => {
  it("erkennt Frost bei tempMin < -5 °C", () => {
    const r = detectWitterungsbehinderung({
      tempMin: -7.2,
      tempMax: -1,
      precipitation: 0,
      wind: 10,
    });
    expect(r?.art).toBe("frost");
    expect(r?.schwellwertText).toMatch(/Tagestief/);
  });

  it("erkennt Sturm bei wind > 60 km/h", () => {
    const r = detectWitterungsbehinderung({
      tempMin: 5,
      tempMax: 10,
      precipitation: 0,
      wind: 72,
    });
    expect(r?.art).toBe("sturm");
  });

  it("erkennt Starkregen bei precipitation > 25 mm/Tag", () => {
    const r = detectWitterungsbehinderung({
      tempMin: 12,
      tempMax: 18,
      precipitation: 30,
      wind: 15,
    });
    expect(r?.art).toBe("starkregen");
  });

  it("erkennt Hitze bei tempMax > 32 °C", () => {
    const r = detectWitterungsbehinderung({
      tempMin: 20,
      tempMax: 35.5,
      precipitation: 0,
      wind: 8,
    });
    expect(r?.art).toBe("hitze");
  });

  it("liefert null bei harmlosem Wetter", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: 8,
        tempMax: 22,
        precipitation: 1.5,
        wind: 12,
      })
    ).toBeNull();
  });
});

describe("Schwellen-Grenzen — exklusive Vergleiche", () => {
  it("genau auf Schwelle = kein Trigger (Frost)", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: WITTERUNG_THRESHOLDS.frostBelowC, // -5
        tempMax: 0,
        precipitation: 0,
        wind: 0,
      })
    ).toBeNull();
  });

  it("genau auf Schwelle = kein Trigger (Sturm)", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: 5,
        tempMax: 10,
        precipitation: 0,
        wind: WITTERUNG_THRESHOLDS.windAboveKmh, // 60
      })
    ).toBeNull();
  });

  it("genau auf Schwelle = kein Trigger (Starkregen)", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: 10,
        tempMax: 15,
        precipitation: WITTERUNG_THRESHOLDS.precipitationAboveMmPerDay, // 25
        wind: 10,
      })
    ).toBeNull();
  });

  it("genau auf Schwelle = kein Trigger (Hitze)", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: 20,
        tempMax: WITTERUNG_THRESHOLDS.heatAboveC, // 32
        precipitation: 0,
        wind: 10,
      })
    ).toBeNull();
  });
});

describe("Priorität bei mehreren Treffern", () => {
  it("Sturm hat Priorität vor Starkregen, Frost, Hitze", () => {
    const r = detectWitterungsbehinderung({
      tempMin: -10, // Frost
      tempMax: 35, // Hitze (ignoriert weil tempMin schon greift, aber egal)
      precipitation: 50, // Starkregen
      wind: 80, // Sturm — gewinnt
    });
    expect(r?.art).toBe("sturm");
  });

  it("Starkregen vor Frost und Hitze", () => {
    const r = detectWitterungsbehinderung({
      tempMin: -10,
      tempMax: 40,
      precipitation: 30,
      wind: 20,
    });
    expect(r?.art).toBe("starkregen");
  });
});

describe("Null-Toleranz — fehlende Messwerte", () => {
  it("ignoriert null-Werte und erkennt vorhandene Trigger", () => {
    const r = detectWitterungsbehinderung({
      tempMin: null,
      tempMax: null,
      precipitation: null,
      wind: 75,
    });
    expect(r?.art).toBe("sturm");
  });

  it("alle null = kein Trigger", () => {
    expect(
      detectWitterungsbehinderung({
        tempMin: null,
        tempMax: null,
        precipitation: null,
        wind: null,
      })
    ).toBeNull();
  });
});

describe("inferWeatherCondition", () => {
  it("Sturm überschreibt alles", () => {
    expect(
      inferWeatherCondition({
        tempMin: 5,
        tempMax: 10,
        precipitation: 0,
        wind: 72,
      })
    ).toBe("sturm");
  });

  it("Frost vor Niederschlag", () => {
    expect(
      inferWeatherCondition({
        tempMin: -8,
        tempMax: 0,
        precipitation: 5,
        wind: 5,
      })
    ).toBe("frost");
  });

  it("Schnee bei Niederschlag und Tageshöchst < 1 °C", () => {
    expect(
      inferWeatherCondition({
        tempMin: -2,
        tempMax: 0.5,
        precipitation: 3,
        wind: 5,
      })
    ).toBe("schnee");
  });

  it("Regen bei Niederschlag und mildem Tageshöchst", () => {
    expect(
      inferWeatherCondition({
        tempMin: 8,
        tempMax: 14,
        precipitation: 4,
        wind: 5,
      })
    ).toBe("regen");
  });

  it("Sonnig bei mildem Wetter ohne Niederschlag und tempMax > 22", () => {
    expect(
      inferWeatherCondition({
        tempMin: 14,
        tempMax: 26,
        precipitation: 0,
        wind: 5,
      })
    ).toBe("sonnig");
  });

  it("Bewölkt als Default", () => {
    expect(
      inferWeatherCondition({
        tempMin: 8,
        tempMax: 14,
        precipitation: 0,
        wind: 5,
      })
    ).toBe("bewoelkt");
  });
});
