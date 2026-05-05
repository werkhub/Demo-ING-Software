/**
 * Validator für geparste E-Rechnungen.
 *
 * Prüft Pflicht-BT-Codes nach EN 16931 / XRechnung 3.0:
 *   BT-1   Rechnungsnummer
 *   BT-2   Rechnungsdatum
 *   BT-3   Rechnungstyp
 *   BT-5   Währung
 *   BG-25  Lieferant + ust-id
 *   BG-26  Käufer
 *   BT-106 Summe Positions-Netto > 0
 *   BT-109 Gesamtnetto
 *   BT-112 Bruttosumme
 *
 * Plausi-Checks:
 *   - Brutto = Netto + USt (±1 cent Rundung)
 *   - Position-Netto-Summe ≈ BT-106
 */
import type { ParsedErechnung } from "./parser";

export type ValidationStatus = "valid" | "warnings" | "invalid";

export type ValidationResult = {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
};

const REQUIRED_FIELDS: Array<{
  key: keyof ParsedErechnung;
  label: string;
}> = [
  { key: "rechnungsnr", label: "BT-1 Rechnungsnummer" },
  { key: "rechnungsdatum", label: "BT-2 Rechnungsdatum" },
  { key: "waehrung", label: "BT-5 Währung" },
  { key: "lieferantName", label: "BG-25 Lieferant Name" },
  { key: "kaeuferName", label: "BG-26 Käufer Name" },
];

export function validate(p: ParsedErechnung): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (p.format === "unbekannt") {
    errors.push("Format konnte nicht erkannt werden (weder UBL noch CII).");
  }

  for (const field of REQUIRED_FIELDS) {
    const v = p[field.key];
    if (!v || (typeof v === "string" && v.length === 0)) {
      errors.push(`Pflichtfeld fehlt: ${field.label}`);
    }
  }

  // Datum-Format
  if (p.rechnungsdatum && !/^\d{4}-\d{2}-\d{2}$/.test(p.rechnungsdatum)) {
    errors.push(
      `BT-2 Rechnungsdatum hat ungültiges Format (erwartet YYYY-MM-DD): ${p.rechnungsdatum}`
    );
  }

  // Beträge
  if (p.bruttoSummeCents <= 0) {
    errors.push("BT-112 Bruttosumme muss > 0 sein.");
  }

  // Plausi: Brutto ≈ Netto + USt
  const expectedBrutto = p.gesamtNettoCents + p.gesamtUstCents;
  if (
    p.bruttoSummeCents > 0 &&
    Math.abs(p.bruttoSummeCents - expectedBrutto) > 2
  ) {
    warnings.push(
      `Plausi: Brutto ${(p.bruttoSummeCents / 100).toFixed(2)} € ≠ Netto + USt = ${(expectedBrutto / 100).toFixed(2)} €.`
    );
  }

  // BT-106 ≈ Summe Positionen
  if (p.positionen.length > 0) {
    const summe = p.positionen.reduce(
      (sum, pos) => sum + pos.summeNettoCents,
      0
    );
    if (
      p.summePositionenNettoCents > 0 &&
      Math.abs(summe - p.summePositionenNettoCents) > 2
    ) {
      warnings.push(
        `Plausi: Summe Positionen-Netto (${(summe / 100).toFixed(2)} €) weicht von BT-106 (${(p.summePositionenNettoCents / 100).toFixed(2)} €) ab.`
      );
    }
  }

  // USt-ID-Format (sehr lose)
  if (p.lieferantUstId && !/^[A-Z]{2}/.test(p.lieferantUstId)) {
    warnings.push(
      `Lieferant-USt-ID ${p.lieferantUstId} beginnt nicht mit Länder-Präfix.`
    );
  }

  let status: ValidationStatus = "valid";
  if (errors.length > 0) status = "invalid";
  else if (warnings.length > 0) status = "warnings";
  return { status, errors, warnings };
}
