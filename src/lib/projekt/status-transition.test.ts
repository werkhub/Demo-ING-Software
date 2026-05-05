import { describe, expect, it } from "vitest";
import {
  computeAbnahmeAutomations,
  computeWarrantyEnd,
  isValidStatus,
  shiftIsoDays,
} from "./status-transition";

const REFERENCE_NOW = new Date("2026-05-01T12:00:00Z");

describe("shiftIsoDays", () => {
  it("addiert Tage korrekt", () => {
    expect(shiftIsoDays("2026-05-01", 30)).toBe("2026-05-31");
  });
  it("subtrahiert Tage korrekt", () => {
    expect(shiftIsoDays("2026-05-01", -60)).toBe("2026-03-02");
  });
  it("rechnet über Jahresgrenzen", () => {
    expect(shiftIsoDays("2025-12-25", 14)).toBe("2026-01-08");
  });
  it("ist idempotent bei 0 Tagen", () => {
    expect(shiftIsoDays("2026-05-01", 0)).toBe("2026-05-01");
  });
});

describe("computeWarrantyEnd", () => {
  it("VOB-Vertrag: 4 Jahre", () => {
    expect(computeWarrantyEnd("2026-05-01", "vob_vertrag")).toBe("2030-05-01");
  });
  it("BGB-Werkvertrag: 5 Jahre", () => {
    expect(computeWarrantyEnd("2026-05-01", "bgb_werkvertrag")).toBe(
      "2031-05-01"
    );
  });
  it("Verbraucherbauvertrag: 5 Jahre", () => {
    expect(computeWarrantyEnd("2026-05-01", "verbraucherbauvertrag")).toBe(
      "2031-05-01"
    );
  });
  it("kein Vertragstyp: konservativ 5 Jahre", () => {
    expect(computeWarrantyEnd("2026-05-01", null)).toBe("2031-05-01");
  });
});

describe("isValidStatus", () => {
  it("akzeptiert die 5 erlaubten Werte", () => {
    expect(isValidStatus("Geplant")).toBe(true);
    expect(isValidStatus("Bauphase")).toBe(true);
    expect(isValidStatus("Abnahme")).toBe(true);
    expect(isValidStatus("Gewährleistung")).toBe(true);
    expect(isValidStatus("Abgeschlossen")).toBe(true);
  });
  it("lehnt unbekannte Werte ab", () => {
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus("DROP TABLE")).toBe(false);
    expect(isValidStatus("bauphase")).toBe(false); // case-sensitive
    expect(isValidStatus("In Bearbeitung")).toBe(false);
  });
});

describe("computeAbnahmeAutomations", () => {
  it("setzt Abnahme-Datum auf heute, wenn vorher leer", () => {
    const result = computeAbnahmeAutomations({
      currentAbnahmeDate: null,
      currentWarrantyEnd: null,
      contractType: "vob_vertrag",
      now: REFERENCE_NOW,
    });
    expect(result.abnahmeDate).toBe("2026-05-01");
  });

  it("respektiert vorhandenes Abnahme-Datum (idempotent)", () => {
    const result = computeAbnahmeAutomations({
      currentAbnahmeDate: "2026-04-15",
      currentWarrantyEnd: null,
      contractType: "vob_vertrag",
      now: REFERENCE_NOW,
    });
    expect(result.abnahmeDate).toBe(null); // = nicht zu setzen, bleibt wie es ist
    expect(result.warrantyEnd).toBe("2030-04-15"); // berechnet aus existing abnahmeDate
    expect(result.fristen[0].deadline).toBe("2026-05-15"); // 30d nach 2026-04-15
  });

  it("respektiert vorhandenes Gewährleistungs-Ende", () => {
    const result = computeAbnahmeAutomations({
      currentAbnahmeDate: "2026-04-15",
      currentWarrantyEnd: "2031-04-15", // manuell gesetzt
      contractType: "vob_vertrag",
      now: REFERENCE_NOW,
    });
    expect(result.warrantyEnd).toBe(null); // bleibt
    expect(result.fristen[1].deadline).toBe("2031-02-14"); // 60d vor 2031-04-15
  });

  it("legt zwei Pflicht-Fristen an: § 16 Abs. 3 VOB/B + Gewährleistung", () => {
    const result = computeAbnahmeAutomations({
      currentAbnahmeDate: null,
      currentWarrantyEnd: null,
      contractType: "vob_vertrag",
      now: REFERENCE_NOW,
    });
    expect(result.fristen).toHaveLength(2);
    expect(result.fristen[0].legalBasis).toBe("§ 16 Abs. 3 VOB/B");
    expect(result.fristen[0].deadline).toBe("2026-05-31");
    expect(result.fristen[1].legalBasis).toBe("§ 13 Abs. 4 VOB/B");
    expect(result.fristen[1].deadline).toBe("2030-03-02"); // 60d vor 2030-05-01
  });

  it("nutzt § 634a BGB statt VOB für BGB-Werkvertrag", () => {
    const result = computeAbnahmeAutomations({
      currentAbnahmeDate: null,
      currentWarrantyEnd: null,
      contractType: "bgb_werkvertrag",
      now: REFERENCE_NOW,
    });
    expect(result.fristen[1].legalBasis).toBe("§ 634a BGB");
  });

  it("nutzt § 634a BGB für Verbraucherbauvertrag und null-Vertragstyp", () => {
    const verbraucher = computeAbnahmeAutomations({
      currentAbnahmeDate: null,
      currentWarrantyEnd: null,
      contractType: "verbraucherbauvertrag",
      now: REFERENCE_NOW,
    });
    const noContract = computeAbnahmeAutomations({
      currentAbnahmeDate: null,
      currentWarrantyEnd: null,
      contractType: null,
      now: REFERENCE_NOW,
    });
    expect(verbraucher.fristen[1].legalBasis).toBe("§ 634a BGB");
    expect(noContract.fristen[1].legalBasis).toBe("§ 634a BGB");
  });
});
