import { describe, expect, it } from "vitest";
import {
  buildExtfFile,
  buildExtfHeader,
  buildExtfRow,
  EXTF_COLUMN_HEADER,
  type Buchungssatz,
  type ExtfHeader,
} from "./extf";
import { fromCp1252 } from "./encoding";

const baseHeader: ExtfHeader = {
  beraterNr: 1234567,
  mandantNr: 12345,
  wjBeginnYyyymmdd: "20240101",
  sachkontenlaenge: 4,
  datumVonYyyymmdd: "20240101",
  datumBisYyyymmdd: "20240131",
  bezeichnung: "Verkauf 01-2024",
};

describe("datev/extf header", () => {
  it("baut Header mit 26 Feldern", () => {
    const line = buildExtfHeader(baseHeader);
    const fields = line.split(";");
    expect(fields.length).toBe(26);
  });

  it("startet mit \"EXTF\";510;21", () => {
    const line = buildExtfHeader(baseHeader);
    expect(line.startsWith('"EXTF";510;21;')).toBe(true);
  });

  it("enthält Berater-Nr und Mandant-Nr", () => {
    const line = buildExtfHeader(baseHeader);
    const fields = line.split(";");
    expect(fields[10]).toBe("1234567");
    expect(fields[11]).toBe("12345");
  });

  it("Bezeichnung wird auf 30 Zeichen gekürzt", () => {
    const long = { ...baseHeader, bezeichnung: "a".repeat(50) };
    const line = buildExtfHeader(long);
    const fields = line.split(";");
    expect(fields[16]).toBe('"' + "a".repeat(30) + '"');
  });
});

describe("datev/extf rows", () => {
  it("Beleg-Zeile hat 14 Felder", () => {
    const b: Buchungssatz = {
      umsatzEur: 1190.0,
      sollHaben: "S",
      konto: 10001,
      gegenkonto: 8400,
      belegdatum: new Date(2024, 0, 15),
      belegfeld1: "AR-2024-0001",
      buchungstext: "Schlussrechnung Bauvorhaben Müllerstraße",
    };
    const line = buildExtfRow(b);
    const fields = line.split(";");
    expect(fields.length).toBe(14);
  });

  it("Betrag mit Komma als Dezimaltrenner", () => {
    const b: Buchungssatz = {
      umsatzEur: 1190.5,
      sollHaben: "H",
      konto: 8400,
      gegenkonto: 10001,
      belegdatum: new Date(2024, 0, 15),
      buchungstext: "x",
    };
    const line = buildExtfRow(b);
    expect(line.startsWith("1190,50;")).toBe(true);
  });

  it("Belegdatum ist DDMM-Format", () => {
    const b: Buchungssatz = {
      umsatzEur: 100,
      sollHaben: "S",
      konto: 10001,
      gegenkonto: 8400,
      belegdatum: new Date(2024, 2, 7), // 7. März 2024
      buchungstext: "Test",
    };
    const line = buildExtfRow(b);
    const fields = line.split(";");
    expect(fields[9]).toBe("0703");
  });

  it("Buchungstext wird auf 60 Zeichen gekürzt", () => {
    const b: Buchungssatz = {
      umsatzEur: 100,
      sollHaben: "S",
      konto: 10001,
      gegenkonto: 8400,
      belegdatum: new Date(2024, 0, 1),
      buchungstext: "x".repeat(120),
    };
    const line = buildExtfRow(b);
    const fields = line.split(";");
    expect(fields[13]).toBe('"' + "x".repeat(60) + '"');
  });
});

describe("datev/extf full file", () => {
  it("baut komplette Datei mit Header + Spalten + Buchung als CP1252-Buffer", () => {
    const buchungen: Buchungssatz[] = [
      {
        umsatzEur: 1190.0,
        sollHaben: "S",
        konto: 10001,
        gegenkonto: 8400,
        belegdatum: new Date(2024, 0, 15),
        belegfeld1: "AR-2024-0001",
        buchungstext: "Müller GmbH — Bauvorhaben",
      },
    ];
    const buf = buildExtfFile(baseHeader, buchungen);
    expect(buf).toBeInstanceOf(Buffer);
    // Decode zurück und prüfe
    const text = fromCp1252(buf);
    const lines = text.split("\r\n");
    expect(lines[0].startsWith('"EXTF";510;21;')).toBe(true);
    expect(lines[1]).toBe(EXTF_COLUMN_HEADER);
    expect(lines[2].startsWith("1190,00;")).toBe(true);
    // Leerzeile am Ende
    expect(text.endsWith("\r\n\r\n")).toBe(true);
  });

  it("Umlaute werden in CP1252 korrekt encoded", () => {
    const buchungen: Buchungssatz[] = [
      {
        umsatzEur: 100,
        sollHaben: "S",
        konto: 10001,
        gegenkonto: 8400,
        belegdatum: new Date(2024, 0, 1),
        buchungstext: "Müller — Größenordnung",
      },
    ];
    const buf = buildExtfFile(baseHeader, buchungen);
    // ü = 0xFC, — = 0x97, ß = 0xDF
    const hex = buf.toString("hex");
    expect(hex.includes("fc")).toBe(true); // ü
    expect(hex.includes("97")).toBe(true); // —
    expect(hex.includes("df")).toBe(true); // ß
  });
});
