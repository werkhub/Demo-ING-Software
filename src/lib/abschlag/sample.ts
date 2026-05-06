/**
 * Demo-Datensatz für die Abschlagsprüfung.
 *
 * Realistisches BU↔NU-Szenario: 4. Abschlagsrechnung eines Trockenbau-NU
 * mit absichtlich eingebauten Prüf-Treffern (EP-Abweichung, Aufmaß-Differenz,
 * Mengenüberschreitung, USt-Fehler bei Bauleistung), damit die Heuristik
 * etwas zu zeigen hat.
 */

import type { AbschlagInput } from "./types";

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export const SAMPLE_ABSCHLAG_INPUT: AbschlagInput = {
  rechnungsNr: "TB-2026-0438",
  rechnungsdatum: TODAY_ISO,
  rechnungseingangsdatum: TODAY_ISO,
  lieferant: "Trockenbau Schmitt GmbH",
  abschlagNr: 4,

  auftragssummeNetto: 245_000,
  vertragsstrafeOffenEur: 0,

  // §13b Bauleistung NU → Reverse-Charge → USt MUSS 0 sein
  istBauleistungNu: true,
  ustSatz: 19, // FEHLER: müsste 0 sein → triggered Finding
  freistellungsbescheinigungVorhanden: false, // → Bauabzug 15 %

  bisherGezahltBrutto: 168_000,

  sicherheitseinbehaltVebProzent: 5,
  sicherheitseinbehaltGlbProzent: 0,
  skontoFristTage: 14,
  skontoProzent: 2,

  positionen: [
    {
      oz: "01.020.010",
      beschreibung: "GK-Wand W112 doppelt beplankt, MW 80 mm, h ≤ 3 m",
      einheit: "m²",
      menge: 184,
      einheitspreis: 42,
      lvEinheitspreis: 42,
      lvMengeMax: 320,
      aufmassMengeIst: 184,
    },
    {
      oz: "01.020.020",
      beschreibung: "GK-Vorsatzschale W625, EI 30, h ≤ 3,5 m",
      einheit: "m²",
      menge: 95,
      einheitspreis: 58, // EP über LV → Finding
      lvEinheitspreis: 52,
      lvMengeMax: 140,
      aufmassMengeIst: 95,
    },
    {
      oz: "01.030.010",
      beschreibung: "GK-Decke F30-A abgehängt, h-Abh. ≤ 0,4 m",
      einheit: "m²",
      menge: 312, // Aufmaß ist nur 290 → Finding
      einheitspreis: 48,
      lvEinheitspreis: 48,
      lvMengeMax: 350,
      aufmassMengeIst: 290,
    },
    {
      oz: "01.040.010",
      beschreibung: "Revisionsklappe 30×30 cm, F30",
      einheit: "Stk",
      menge: 14, // LV erlaubt nur 10 → Mengen-Überschreitung
      einheitspreis: 168,
      lvEinheitspreis: 168,
      lvMengeMax: 10,
      aufmassMengeIst: 14,
    },
    {
      oz: "01.050.010",
      beschreibung: "Schallschutz-Fugendichtung umlaufend",
      einheit: "m",
      menge: 412,
      einheitspreis: 6.5,
      lvEinheitspreis: 6.5,
      lvMengeMax: 600,
      aufmassMengeIst: 412,
    },
  ],
};
