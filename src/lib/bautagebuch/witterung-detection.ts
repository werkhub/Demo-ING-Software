/**
 * Schwellwert-Logik für witterungsbedingte Behinderungen.
 *
 * Pure Funktion — keine Seiten-Effekte. Wird vom Server-Action-Layer und
 * vom UI-Vorschau-Code identisch verwendet.
 *
 * Schwellen sind branchenüblich (Bauhandwerk-Witterung) und entsprechen den
 * gängigen Auslegungen zu § 6 Abs. 2 Nr. 2 VOB/B (außergewöhnliche Witterung):
 *
 *   Frost      tempMin       <  -5 °C
 *   Sturm      wind          >  60 km/h
 *   Starkregen precipitation >  25 mm/Tag
 *   Hitze      tempMax       >  32 °C
 *
 * Bei mehreren Treffern gilt die Priorität sturm > starkregen > frost > hitze
 * (sicherheitsrelevant zuerst).
 */
import type { BehinderungArt, WeatherCondition } from "@/db/schema";

export type WeatherInput = {
  tempMin: number | null;
  tempMax: number | null;
  precipitation: number | null;
  wind: number | null;
};

export const WITTERUNG_THRESHOLDS = {
  frostBelowC: -5,
  windAboveKmh: 60,
  precipitationAboveMmPerDay: 25,
  heatAboveC: 32,
} as const;

export type WitterungDetection = {
  art: BehinderungArt;
  schwellwertText: string;
};

/**
 * Liefert die Behinderungsart, falls eine Schwelle gerissen wird, sonst null.
 * Bei mehreren Treffern wird die schwerwiegendste zurückgegeben.
 */
export function detectWitterungsbehinderung(
  weather: WeatherInput
): WitterungDetection | null {
  if (
    weather.wind !== null &&
    weather.wind > WITTERUNG_THRESHOLDS.windAboveKmh
  ) {
    return {
      art: "sturm",
      schwellwertText: `Spitzenwind ${formatNum(weather.wind)} km/h (Schwelle ${WITTERUNG_THRESHOLDS.windAboveKmh} km/h)`,
    };
  }
  if (
    weather.precipitation !== null &&
    weather.precipitation > WITTERUNG_THRESHOLDS.precipitationAboveMmPerDay
  ) {
    return {
      art: "starkregen",
      schwellwertText: `Niederschlag ${formatNum(weather.precipitation)} mm/Tag (Schwelle ${WITTERUNG_THRESHOLDS.precipitationAboveMmPerDay} mm)`,
    };
  }
  if (
    weather.tempMin !== null &&
    weather.tempMin < WITTERUNG_THRESHOLDS.frostBelowC
  ) {
    return {
      art: "frost",
      schwellwertText: `Tagestief ${formatNum(weather.tempMin)} °C (Schwelle ${WITTERUNG_THRESHOLDS.frostBelowC} °C)`,
    };
  }
  if (
    weather.tempMax !== null &&
    weather.tempMax > WITTERUNG_THRESHOLDS.heatAboveC
  ) {
    return {
      art: "hitze",
      schwellwertText: `Tageshöchst ${formatNum(weather.tempMax)} °C (Schwelle ${WITTERUNG_THRESHOLDS.heatAboveC} °C)`,
    };
  }
  return null;
}

function formatNum(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

export const BEHINDERUNG_ART_LABEL: Record<BehinderungArt, string> = {
  frost: "Frost",
  sturm: "Sturm",
  starkregen: "Starkregen",
  hitze: "Hitze",
  sonstiges: "Sonstige Witterung",
};

/** Heuristisches Mapping in das bestehende `weatherCondition`-Enum für die UI. */
export function inferWeatherCondition(
  weather: WeatherInput
): WeatherCondition | null {
  if (weather.wind !== null && weather.wind > WITTERUNG_THRESHOLDS.windAboveKmh) {
    return "sturm";
  }
  if (
    weather.tempMin !== null &&
    weather.tempMin < WITTERUNG_THRESHOLDS.frostBelowC
  ) {
    return "frost";
  }
  if (weather.precipitation !== null && weather.precipitation > 1) {
    return weather.tempMax !== null && weather.tempMax < 1 ? "schnee" : "regen";
  }
  if (weather.tempMax !== null && weather.tempMax > 22) return "sonnig";
  return "bewoelkt";
}
