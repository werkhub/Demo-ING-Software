import { describe, expect, it } from "vitest";
import { classifyEingang } from "./classifier";

describe("classifyEingang", () => {
  it("klassifiziert eine Mängelrüge mit hoher Confidence", () => {
    const result = classifyEingang({
      fileName: "Mangelruege_AG_Stadt_Luedenscheid.pdf",
      text: "Hiermit rügen wir folgende Mängel: Putz-Risse im Treppenhaus, Nachbesserung erforderlich.",
    });
    expect(result.category).toBe("maengelruege");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedTerms.length).toBeGreaterThan(0);
  });

  it("klassifiziert einen Lieferschein als Anlieferung", () => {
    const result = classifyEingang({
      fileName: "Lieferschein_Stahl_4711.pdf",
      text: "Anlieferung Bewehrungsstahl, Materialprüfung anbei.",
    });
    expect(result.category).toBe("anlieferung");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("klassifiziert eine Anordnung als Vertragspflicht", () => {
    const result = classifyEingang({
      fileName: "Anordnung_Tuermodell_AG.eml",
      text: "AG ordnet die Änderung des Türmodells an. Nachtrag erforderlich.",
    });
    expect(result.category).toBe("vertragspflicht");
  });

  it("liefert 'sonstiges' bei keinem Treffer", () => {
    const result = classifyEingang({
      fileName: "Foto_2026_05_01.jpg",
      text: "",
    });
    expect(result.category).toBe("sonstiges");
    expect(result.confidence).toBe(0);
    expect(result.matchedTerms).toEqual([]);
  });

  it("ist case-insensitive — GROSSBUCHSTABEN werden erkannt", () => {
    const result = classifyEingang({
      fileName: "MÄNGELRÜGE.pdf",
    });
    expect(result.category).toBe("maengelruege");
  });

  it("akzeptiert null als Text-Input", () => {
    const result = classifyEingang({
      fileName: "lieferschein_100.pdf",
      text: null,
    });
    expect(result.category).toBe("anlieferung");
  });

  it("Confidence steigt mit der Anzahl der Treffer", () => {
    const single = classifyEingang({
      fileName: "ruege.pdf",
    });
    const triple = classifyEingang({
      fileName: "Mangelruege_Risse_Nachbesserung.pdf",
      text: "mängelrüge mängel nachbesserung risse",
    });
    expect(triple.confidence).toBeGreaterThan(single.confidence);
  });

  it("Confidence ist auf 0.85 gedeckelt", () => {
    const result = classifyEingang({
      fileName: "Mangelruege.pdf",
      text:
        "mängel mängelrüge nachbesserung risse defekt mängelanzeige risse defekt mängel",
    });
    expect(result.confidence).toBeLessThanOrEqual(0.85);
  });

  it("entscheidet sich bei mehreren Kategorien für die Kategorie mit den meisten Treffern", () => {
    const result = classifyEingang({
      fileName: "Brief_AG.pdf",
      text:
        "Wir teilen mit: Mängel im Putz, Nachbesserung. Außerdem ist ein neuer Vertrag beigefügt.",
    });
    // 2 maengelruege-Treffer (mängel, nachbesserung) > 1 vertragspflicht-Treffer (vertrag)
    expect(result.category).toBe("maengelruege");
  });
});
