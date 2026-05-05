/**
 * DATEV-EXTF-Generator (Buchungsstapel v7).
 *
 * Format-Spezifikation: DATEV "EXTF — Schnittstelle Buchungsstapel" Version 510
 *  · Encoding ANSI / Windows-1252 (NICHT UTF-8)
 *  · Trenner Semikolon (;)
 *  · Text-Felder in Anführungszeichen
 *  · Numerische Felder ohne Anführungszeichen
 *  · Beträge mit Komma als Dezimaltrenner, max. 2 Nachkommastellen
 *  · Datum DDMM (4-stellig, ohne Jahr — das Jahr steht im Header)
 *  · Zeilenende CRLF
 *  · Eine Leerzeile am Dateiende
 *
 * Header (Zeile 1) hat 26 Felder, Spalten-Header (Zeile 2) für Buchungsstapel
 * 116 Felder. Wir nutzen die Pflicht-Untermenge.
 *
 * Quelle: DATEV-Doku "Format DATEV-Format Buchungsstapel" Stand 2024.
 */
import { toCp1252 } from "./encoding";

const CRLF = "\r\n";

export type ExtfHeader = {
  /** Berater-Nr. — 7-stellig. */
  beraterNr: number;
  /** Mandanten-Nr. — 5-stellig. */
  mandantNr: number;
  /** Wirtschaftsjahr-Beginn als YYYYMMDD (z.B. 20240101). */
  wjBeginnYyyymmdd: string;
  /** Sachkontenlänge — typisch 4. */
  sachkontenlaenge: number;
  /** Datum-von als YYYYMMDD. */
  datumVonYyyymmdd: string;
  /** Datum-bis als YYYYMMDD. */
  datumBisYyyymmdd: string;
  /** Bezeichnung des Stapels. */
  bezeichnung: string;
  /** Diktat-Kürzel — meist 2 Buchstaben. */
  diktatkuerzel?: string;
  /** Buchungstyp: 1 = Finanzbuchführung, 2 = Jahresabschluss. */
  buchungstyp?: 1 | 2;
  /** WKZ — meist EUR. */
  waehrung?: string;
};

export type Buchungssatz = {
  /** Umsatz in € (positiv). Vorzeichen kommt aus sollHaben. */
  umsatzEur: number;
  /** S = Soll, H = Haben. Bezieht sich auf das "Konto" (nicht Gegenkonto). */
  sollHaben: "S" | "H";
  /** Konto — bei "S" steht Betrag im Soll des Kontos. */
  konto: number;
  /** Gegenkonto — die Buchung läuft Konto AN Gegenkonto. */
  gegenkonto: number;
  /** Steuerschlüssel/BU-Schlüssel — z.B. 9 = 19% USt. Optional, da auch über Konto. */
  buSchluessel?: string;
  /** Belegdatum — Date-Objekt (Jahr wird ignoriert, Format DDMM extrahiert). */
  belegdatum: Date;
  /** Belegfeld 1 — z.B. Rechnungsnummer. */
  belegfeld1?: string;
  /** Belegfeld 2 — z.B. Mahnstufe. */
  belegfeld2?: string;
  /** Buchungstext — max. 60 Zeichen. */
  buchungstext: string;
  /** Kostenstelle 1 — optional. */
  kostenstelle1?: string;
};

/** Numeric → DATEV-Komma-Format (max 2 Nachkommastellen, Komma als Trenner). */
function fmtBetrag(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Date → DDMM (4-stellig). */
function fmtDdmm(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}`;
}

/** Text → CSV-escaped (umrahmt von "), interne " zu doppelten "" verdoppelt. */
function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Header-Zeile (26 Felder) für DATEV-EXTF Buchungsstapel v7.
 * Format: "EXTF";510;21;"Buchungsstapel";7;...
 */
export function buildExtfHeader(h: ExtfHeader): string {
  const created = new Date();
  const yyyymmddHHmmss =
    `${created.getFullYear()}` +
    `${String(created.getMonth() + 1).padStart(2, "0")}` +
    `${String(created.getDate()).padStart(2, "0")}` +
    `${String(created.getHours()).padStart(2, "0")}` +
    `${String(created.getMinutes()).padStart(2, "0")}` +
    `${String(created.getSeconds()).padStart(2, "0")}` +
    `000`; // ms

  const fields: (string | number)[] = [
    quote("EXTF"),                                 // 1 Format-Kennzeichen
    "510",                                          // 2 Versionsnummer
    "21",                                           // 3 Datenkategorie (Buchungsstapel)
    quote("Buchungsstapel"),                       // 4 Format-Name
    "7",                                            // 5 Format-Version
    yyyymmddHHmmss,                                 // 6 erzeugt am
    "",                                             // 7 Importiert (leer)
    quote("LB"),                                    // 8 Herkunft (LexBau)
    quote("LB"),                                    // 9 Exportiert von
    quote(""),                                      // 10 Importiert von (leer)
    h.beraterNr,                                    // 11 Berater-Nr.
    h.mandantNr,                                    // 12 Mandant-Nr.
    h.wjBeginnYyyymmdd,                             // 13 WJ-Beginn
    h.sachkontenlaenge,                             // 14 Sachkontenlänge
    h.datumVonYyyymmdd,                             // 15 Datum von
    h.datumBisYyyymmdd,                             // 16 Datum bis
    quote(h.bezeichnung.slice(0, 30)),              // 17 Bezeichnung
    quote(h.diktatkuerzel ?? "LB"),                // 18 Diktatkürzel
    h.buchungstyp ?? 1,                             // 19 Buchungstyp
    "0",                                            // 20 Rechnungslegungszweck (0 = unabhängig)
    "0",                                            // 21 Festschreibung (0 = nicht)
    quote(h.waehrung ?? "EUR"),                    // 22 WKZ
    "",                                             // 23 reserviert
    "",                                             // 24 Derivatskennzeichen
    "",                                             // 25 reserviert
    "",                                             // 26 reserviert
  ];
  return fields.join(";");
}

/**
 * Spalten-Header-Zeile für Buchungsstapel. Pflicht-Felder + die, die wir füllen.
 * Hier abgekürzt — DATEV akzeptiert auch reduzierte Spalten-Header, solange
 * Reihenfolge eingehalten wird. Wir nutzen die ersten 14 Pflichtspalten.
 */
export const EXTF_COLUMN_HEADER = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
]
  .map((c) => `"${c}"`)
  .join(";");

/** Eine Buchungssatz-Zeile im EXTF-Format. */
export function buildExtfRow(b: Buchungssatz): string {
  const fields: string[] = [
    fmtBetrag(b.umsatzEur),                                   // 1 Umsatz
    quote(b.sollHaben),                                        // 2 S/H
    quote("EUR"),                                              // 3 WKZ
    "",                                                         // 4 Kurs
    "",                                                         // 5 Basis-Umsatz
    "",                                                         // 6 WKZ Basis
    String(b.konto),                                            // 7 Konto
    String(b.gegenkonto),                                       // 8 Gegenkonto
    b.buSchluessel ? quote(b.buSchluessel) : "",                // 9 BU-Schlüssel
    fmtDdmm(b.belegdatum),                                      // 10 Belegdatum
    quote((b.belegfeld1 ?? "").slice(0, 36)),                  // 11 Belegfeld 1
    quote((b.belegfeld2 ?? "").slice(0, 12)),                  // 12 Belegfeld 2
    "",                                                         // 13 Skonto
    quote(b.buchungstext.slice(0, 60)),                         // 14 Buchungstext
  ];
  return fields.join(";");
}

/**
 * Komplette EXTF-Datei aus Header + Buchungssätzen als CP1252-Buffer.
 */
export function buildExtfFile(
  header: ExtfHeader,
  buchungen: Buchungssatz[]
): Buffer {
  const lines: string[] = [];
  lines.push(buildExtfHeader(header));
  lines.push(EXTF_COLUMN_HEADER);
  for (const b of buchungen) {
    lines.push(buildExtfRow(b));
  }
  // DATEV-Konvention: Leerzeile am Ende
  const text = lines.join(CRLF) + CRLF + CRLF;
  return toCp1252(text);
}
