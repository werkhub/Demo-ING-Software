import { describe, expect, it } from "vitest";
import { fromCp1252, toCp1252 } from "./encoding";

describe("datev/encoding", () => {
  it("ASCII bleibt 1:1", () => {
    const buf = toCp1252("Hello, World!");
    expect(buf.toString("hex")).toBe(
      Buffer.from("Hello, World!", "ascii").toString("hex")
    );
  });

  it("deutsche Umlaute werden zu CP1252-Bytes", () => {
    // ä = 0xE4, ö = 0xF6, ü = 0xFC, ß = 0xDF
    const buf = toCp1252("äöüß");
    expect([...buf]).toEqual([0xe4, 0xf6, 0xfc, 0xdf]);
  });

  it("Großbuchstaben-Umlaute korrekt", () => {
    // Ä = 0xC4, Ö = 0xD6, Ü = 0xDC
    const buf = toCp1252("ÄÖÜ");
    expect([...buf]).toEqual([0xc4, 0xd6, 0xdc]);
  });

  it("€-Zeichen wird zu 0x80 (CP1252-Sondermapping)", () => {
    const buf = toCp1252("€100");
    expect([...buf]).toEqual([0x80, 0x31, 0x30, 0x30]);
  });

  it("typografische Anführungszeichen mappen", () => {
    // „ = 0x84, ” = 0x94
    const buf = toCp1252("„Hallo”");
    expect(buf[0]).toBe(0x84);
    expect(buf[buf.length - 1]).toBe(0x94);
  });

  it("nicht-mappbare Zeichen werden zu '?'", () => {
    // 🚀 ist Surrogate Pair, nicht in CP1252
    const buf = toCp1252("A🚀B");
    expect(buf[0]).toBe(0x41); // A
    expect(buf[buf.length - 1]).toBe(0x42); // B
    expect([...buf].some((b) => b === 0x3f)).toBe(true);
  });

  it("Roundtrip: encode → decode", () => {
    const original = "Müller GmbH · Bauunternehmen — €1.234,56";
    const buf = toCp1252(original);
    const decoded = fromCp1252(buf);
    expect(decoded).toBe(original);
  });
});
