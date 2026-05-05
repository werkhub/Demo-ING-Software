/**
 * Open-Meteo-Wrapper für historische Tageswerte. Kostenlos, kein API-Key.
 *
 * Doku: https://open-meteo.com/en/docs/historical-weather-api
 *
 * Bewusst kein "server-only" — wird auch vom Cron (tsx-Script) ohne
 * Next-Bundling aufgerufen. Die einzige Abhängigkeit ist `globalThis.fetch`,
 * was sowohl im Node-Runtime als auch im Vitest-Test-Kontext verfügbar ist.
 */

export type WeatherSnapshot = {
  /** Tagestief in °C. */
  tempMin: number;
  /** Tageshoch in °C. */
  tempMax: number;
  /** Tagesniederschlagssumme in mm. */
  precipitation: number;
  /** Spitzenwind in km/h. */
  wind: number;
};

const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";

/**
 * Lädt die Tageswerte für (lat, lon) am ISO-Datum (YYYY-MM-DD).
 *
 * Wirft bei HTTP-Fehlern oder unplausiblen Antworten — Caller behandelt das
 * als „Wetter konnte nicht geladen werden, manuell ergänzen".
 */
export async function fetchWeather(
  lat: number,
  lon: number,
  date: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<WeatherSnapshot> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Ungültige Koordinaten.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Datum muss YYYY-MM-DD sein.");
  }

  const url = new URL(ARCHIVE_ENDPOINT);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "wind_speed_10m_max",
    ].join(",")
  );
  url.searchParams.set("timezone", "Europe/Berlin");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetchImpl(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Open-Meteo HTTP ${res.status}: ${res.statusText || "unbekannter Fehler"}`
    );
  }
  const json = (await res.json()) as unknown;
  return parseDailyResponse(json);
}

type DailyEnvelope = {
  daily?: {
    time?: unknown;
    temperature_2m_min?: unknown;
    temperature_2m_max?: unknown;
    precipitation_sum?: unknown;
    wind_speed_10m_max?: unknown;
  };
};

function pickFirstNumber(arr: unknown): number | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const v = arr[0];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Parst die Open-Meteo-Daily-Antwort. Exportiert für Tests. */
export function parseDailyResponse(payload: unknown): WeatherSnapshot {
  const env = payload as DailyEnvelope;
  if (!env || typeof env !== "object" || !env.daily) {
    throw new Error("Open-Meteo: Antwort ohne `daily`-Sektion.");
  }
  const tempMin = pickFirstNumber(env.daily.temperature_2m_min);
  const tempMax = pickFirstNumber(env.daily.temperature_2m_max);
  const precipitation = pickFirstNumber(env.daily.precipitation_sum);
  const wind = pickFirstNumber(env.daily.wind_speed_10m_max);
  if (
    tempMin === null ||
    tempMax === null ||
    precipitation === null ||
    wind === null
  ) {
    throw new Error("Open-Meteo: Tageswerte fehlen oder sind unplausibel.");
  }
  return { tempMin, tempMax, precipitation, wind };
}
