/**
 * SKR03 / SKR04 Konten-Mapping für LexBau-Buchungen.
 *
 * Workspace kann pro Konto-Schlüssel überschreiben via
 * workspaces.datev_konten_mapping_json (JSON mit Schlüssel-Wert-Paaren).
 *
 * Standard-Konten:
 *   erloese_19            — Erlöse 19% (AR-Standard)
 *   erloese_rc_13b        — Erlöse §13b UStG, ohne USt
 *   forderungen_kunde     — Sammelkonto Kunden (oder pro Kunde, falls gesetzt)
 *   aufwand_lohn          — Lohn-Aufwand
 *   verbindlichkeit_lohn  — Verbindlichkeiten Lohn (Gegenkonto bei Lohnbuchung)
 *   aufwand_nu            — NU-Fremdleistung
 *   verbindlichkeit_nu    — Sammelkonto Lieferanten
 */
import type { DatevKontenrahmen } from "@/db/schema";

export type DatevKontoKey =
  | "erloese_19"
  | "erloese_rc_13b"
  | "forderungen_kunde"
  | "aufwand_lohn"
  | "verbindlichkeit_lohn"
  | "aufwand_nu"
  | "verbindlichkeit_nu";

const SKR03_DEFAULT: Record<DatevKontoKey, number> = {
  erloese_19: 8400,
  erloese_rc_13b: 8337,
  forderungen_kunde: 10001, // Sammelkonto Default — überschreibbar
  aufwand_lohn: 4100,
  verbindlichkeit_lohn: 1740,
  aufwand_nu: 3100,
  verbindlichkeit_nu: 70001,
};

const SKR04_DEFAULT: Record<DatevKontoKey, number> = {
  erloese_19: 4400,
  erloese_rc_13b: 4337,
  forderungen_kunde: 10001,
  aufwand_lohn: 6010,
  verbindlichkeit_lohn: 3740,
  aufwand_nu: 5400,
  verbindlichkeit_nu: 70001,
};

export function defaultKonten(
  rahmen: DatevKontenrahmen
): Record<DatevKontoKey, number> {
  return rahmen === "skr04" ? { ...SKR04_DEFAULT } : { ...SKR03_DEFAULT };
}

/**
 * Liefert das effektive Konto unter Berücksichtigung von Workspace-Override.
 * `mappingJson` ist der String aus workspaces.datev_konten_mapping_json.
 */
export function resolveKonto(
  rahmen: DatevKontenrahmen,
  key: DatevKontoKey,
  mappingJson: string | null
): number {
  const defaults = defaultKonten(rahmen);
  if (!mappingJson) return defaults[key];
  try {
    const overrides = JSON.parse(mappingJson) as Partial<
      Record<DatevKontoKey, number>
    >;
    const override = overrides[key];
    if (typeof override === "number" && override > 0 && override < 100000) {
      return override;
    }
  } catch {
    // Fehler-tolerant: bei kaputtem JSON Default zurück
  }
  return defaults[key];
}

/**
 * BU-Schlüssel (Steuerschlüssel) für Standard-Buchungen.
 * Quelle: DATEV-Steuerschlüssel-Liste 2024.
 */
export const BU_SCHLUESSEL = {
  /** 19 % USt — automatisch über Konto, daher leer (DATEV erkennt). */
  ust_19: "",
  /** 7 % USt — automatisch über Konto. */
  ust_7: "",
  /** § 13b UStG (Reverse-Charge), Bauleistungen. */
  rc_13b_bau: "94",
  /** Steuerfrei (z.B. Skonto-Verbuchung). */
  steuerfrei: "0",
} as const;
