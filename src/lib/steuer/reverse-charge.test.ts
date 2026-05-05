import { describe, expect, it } from "vitest";
import {
  REVERSE_CHARGE_HINWEIS,
  generateRcAusweis,
  isReverseCharge,
  type ReverseChargeArInput,
  type ReverseChargeProjectInput,
} from "./reverse-charge";

const ar = (overrides: Partial<ReverseChargeArInput> = {}): ReverseChargeArInput => ({
  recipientIsBauunternehmer: true,
  recipientVatId: "DE987654321",
  partyAnTaxId: "123/456/78901",
  partyAnVatId: "DE123456789",
  ...overrides,
});

const project = (overrides: Partial<ReverseChargeProjectInput> = {}): ReverseChargeProjectInput => ({
  isBauleistung: true,
  ...overrides,
});

describe("isReverseCharge", () => {
  it("erkennt RC bei Bauleistung an Bauunternehmer mit USt-IdNr.", () => {
    const r = isReverseCharge(ar(), project());
    expect(r.applies).toBe(true);
    expect(r.hinweis).toBe(REVERSE_CHARGE_HINWEIS);
    expect(r.missing).toEqual([]);
  });

  it("verneint RC, wenn Projekt keine Bauleistung", () => {
    const r = isReverseCharge(ar(), project({ isBauleistung: false }));
    expect(r.applies).toBe(false);
    expect(r.hinweis).toBeNull();
    expect(r.reason).toMatch(/keine Bauleistung/);
  });

  it("verneint RC, wenn Empfänger kein Bauunternehmer", () => {
    const r = isReverseCharge(
      ar({ recipientIsBauunternehmer: false }),
      project()
    );
    expect(r.applies).toBe(false);
    expect(r.reason).toMatch(/nicht Bauunternehmer/);
  });

  it("verneint RC, wenn USt-IdNr. des Empfängers fehlt", () => {
    const r = isReverseCharge(ar({ recipientVatId: null }), project());
    expect(r.applies).toBe(false);
    expect(r.reason).toMatch(/ohne USt-IdNr/);
  });

  it("verneint RC, wenn USt-IdNr. leer ist (Whitespace)", () => {
    const r = isReverseCharge(ar({ recipientVatId: "   " }), project());
    expect(r.applies).toBe(false);
  });

  it("kumuliert mehrere fehlende Voraussetzungen in reason", () => {
    const r = isReverseCharge(
      ar({ recipientIsBauunternehmer: false, recipientVatId: null }),
      project({ isBauleistung: false })
    );
    expect(r.applies).toBe(false);
    expect(r.reason.split(" · ")).toHaveLength(3);
  });

  it("meldet fehlende AN-Steuerangabe als missing, applies bleibt true", () => {
    const r = isReverseCharge(
      ar({ partyAnTaxId: null, partyAnVatId: null }),
      project()
    );
    expect(r.applies).toBe(true);
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0]).toMatch(/Steuernummer oder USt-IdNr/);
  });

  it("akzeptiert nur Steuernummer auf AN-Seite (statt USt-IdNr.)", () => {
    const r = isReverseCharge(
      ar({ partyAnTaxId: "123/456/78901", partyAnVatId: null }),
      project()
    );
    expect(r.applies).toBe(true);
    expect(r.missing).toEqual([]);
  });
});

describe("generateRcAusweis", () => {
  it("setzt USt auf 0 und Brutto = Netto", () => {
    const a = generateRcAusweis({ netNet: 12345.67, grund: null });
    expect(a.effectiveVatPercent).toBe(0);
    expect(a.effectiveVatAmount).toBe(0);
    expect(a.effectiveGross).toBe(12345.67);
    expect(a.hinweis).toBe(REVERSE_CHARGE_HINWEIS);
  });

  it("nutzt Default-Begründung, wenn keine angegeben", () => {
    const a = generateRcAusweis({ netNet: 1000, grund: null });
    expect(a.grund).toMatch(/§ 13b II Nr. 4 UStG/);
  });

  it("nutzt User-Begründung, wenn angegeben", () => {
    const a = generateRcAusweis({
      netNet: 1000,
      grund: "Gesondert vereinbart",
    });
    expect(a.grund).toBe("Gesondert vereinbart");
  });

  it("ignoriert leere Begründung (Whitespace)", () => {
    const a = generateRcAusweis({ netNet: 1000, grund: "   " });
    expect(a.grund).toMatch(/§ 13b/);
  });
});
