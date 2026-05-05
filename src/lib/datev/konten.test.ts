import { describe, expect, it } from "vitest";
import { defaultKonten, resolveKonto } from "./konten";

describe("datev/konten", () => {
  it("SKR03 Default-Konten", () => {
    const k = defaultKonten("skr03");
    expect(k.erloese_19).toBe(8400);
    expect(k.erloese_rc_13b).toBe(8337);
    expect(k.aufwand_lohn).toBe(4100);
    expect(k.aufwand_nu).toBe(3100);
  });

  it("SKR04 Default-Konten", () => {
    const k = defaultKonten("skr04");
    expect(k.erloese_19).toBe(4400);
    expect(k.erloese_rc_13b).toBe(4337);
    expect(k.aufwand_lohn).toBe(6010);
    expect(k.aufwand_nu).toBe(5400);
  });

  it("ohne Override: Default", () => {
    expect(resolveKonto("skr03", "erloese_19", null)).toBe(8400);
  });

  it("Workspace-Override greift", () => {
    const mapping = JSON.stringify({ erloese_19: 8401 });
    expect(resolveKonto("skr03", "erloese_19", mapping)).toBe(8401);
  });

  it("kaputtes JSON: Default", () => {
    expect(resolveKonto("skr03", "erloese_19", "{not-json")).toBe(8400);
  });

  it("Override mit ungültigem Wert: Default", () => {
    const mapping = JSON.stringify({ erloese_19: 999999 });
    expect(resolveKonto("skr03", "erloese_19", mapping)).toBe(8400);
  });
});
