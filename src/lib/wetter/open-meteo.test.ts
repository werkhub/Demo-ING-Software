import { describe, expect, it, vi } from "vitest";
import { fetchWeather, parseDailyResponse } from "./open-meteo";

describe("parseDailyResponse", () => {
  it("liest Tageswerte aus typischer Open-Meteo-Antwort", () => {
    const payload = {
      daily: {
        time: ["2025-12-01"],
        temperature_2m_min: [-7.4],
        temperature_2m_max: [-2.1],
        precipitation_sum: [0],
        wind_speed_10m_max: [25],
      },
    };
    expect(parseDailyResponse(payload)).toEqual({
      tempMin: -7.4,
      tempMax: -2.1,
      precipitation: 0,
      wind: 25,
    });
  });

  it("wirft, wenn `daily` fehlt", () => {
    expect(() => parseDailyResponse({})).toThrow(/daily/);
    expect(() => parseDailyResponse(null)).toThrow();
  });

  it("wirft, wenn ein Tageswert nicht numerisch ist", () => {
    const payload = {
      daily: {
        time: ["2025-12-01"],
        temperature_2m_min: [null],
        temperature_2m_max: [10],
        precipitation_sum: [0],
        wind_speed_10m_max: [12],
      },
    };
    expect(() => parseDailyResponse(payload)).toThrow(/unplausibel/);
  });

  it("wirft, wenn Arrays leer sind", () => {
    const payload = {
      daily: {
        time: [],
        temperature_2m_min: [],
        temperature_2m_max: [],
        precipitation_sum: [],
        wind_speed_10m_max: [],
      },
    };
    expect(() => parseDailyResponse(payload)).toThrow(/unplausibel/);
  });
});

describe("fetchWeather", () => {
  it("baut die korrekte Open-Meteo-URL und parst die Antwort", async () => {
    const mockFetch = vi.fn(async (url: string) => {
      const parsed = new URL(url);
      expect(parsed.hostname).toBe("archive-api.open-meteo.com");
      expect(parsed.searchParams.get("latitude")).toBe("48.137");
      expect(parsed.searchParams.get("longitude")).toBe("11.575");
      expect(parsed.searchParams.get("start_date")).toBe("2025-08-15");
      expect(parsed.searchParams.get("end_date")).toBe("2025-08-15");
      expect(parsed.searchParams.get("daily")).toContain("temperature_2m_min");
      expect(parsed.searchParams.get("wind_speed_unit")).toBe("kmh");
      return new Response(
        JSON.stringify({
          daily: {
            time: ["2025-08-15"],
            temperature_2m_min: [18.4],
            temperature_2m_max: [33.7],
            precipitation_sum: [0.2],
            wind_speed_10m_max: [22.1],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const w = await fetchWeather(48.137, 11.575, "2025-08-15", mockFetch as unknown as typeof fetch);
    expect(w.tempMax).toBe(33.7);
    expect(w.precipitation).toBe(0.2);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("wirft bei HTTP-Fehler", async () => {
    const mockFetch = vi.fn(async () => new Response("Bad Request", { status: 400 }));
    await expect(
      fetchWeather(0, 0, "2025-08-15", mockFetch as unknown as typeof fetch)
    ).rejects.toThrow(/HTTP 400/);
  });

  it("validiert Datumsformat", async () => {
    const mockFetch = vi.fn();
    await expect(
      fetchWeather(48, 11, "15.08.2025", mockFetch as unknown as typeof fetch)
    ).rejects.toThrow(/YYYY-MM-DD/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("validiert Koordinaten", async () => {
    const mockFetch = vi.fn();
    await expect(
      fetchWeather(Number.NaN, 11, "2025-08-15", mockFetch as unknown as typeof fetch)
    ).rejects.toThrow(/Koordinaten/);
  });
});
