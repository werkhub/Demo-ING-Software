import { describe, expect, it } from "vitest";
import { analyzeRuege, buildResponseDraft } from "./ruege-analyze";

const VOLLSTAENDIGE_RUEGE = `Sehr geehrte Damen und Herren,

bei der Begehung des BV-2024-014 (Treppenhaus 1.OG) wurden Risse im Putz festgestellt. Wir fordern Sie auf, die Mängel innerhalb von 14 Werktagen zu beseitigen.

Mit freundlichen Grüßen
Stadt Lüdenscheid`;

const KURZE_FRIST = `Sehr geehrte Damen und Herren,

bei BV-2024-014 wurden Risse im Putz im Treppenhaus 1.OG festgestellt. Wir fordern Sie auf, die Mängel innerhalb von 5 Werktagen zu beseitigen.

Mit freundlichen Grüßen
Stadt Lüdenscheid`;

const OHNE_AUFFORDERUNG = `Sehr geehrte Damen und Herren,

uns sind Risse im Putz aufgefallen.

Mit freundlichen Grüßen`;

describe("analyzeRuege — vollständige Rüge", () => {
  const result = analyzeRuege(VOLLSTAENDIGE_RUEGE);

  it("erkennt formelle Wirksamkeit", () => {
    expect(result.formellPass).toBe(true);
  });
  it("liest die 14-Werktage-Frist aus und bewertet sie als angemessen", () => {
    expect(result.fristTage).toBe(14);
    expect(result.fristAngemessen).toBe(true);
  });
  it("riskscore liegt im sinnvollen Bereich", () => {
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
  it("liefert einen Antwort-Entwurf mit der Frist-Bestätigung", () => {
    expect(result.responseDraft.length).toBeGreaterThan(100);
    expect(result.responseDraft).not.toMatch(/unangemessen/);
  });
});

describe("analyzeRuege — kurze Frist", () => {
  const result = analyzeRuege(KURZE_FRIST);

  it("erkennt 5 Werktage als unangemessen", () => {
    expect(result.fristTage).toBe(5);
    expect(result.fristAngemessen).toBe(false);
  });
  it("der Antwort-Entwurf benennt die Unangemessenheit", () => {
    expect(result.responseDraft).toMatch(/unangemessen/);
    expect(result.responseDraft).toMatch(/14 Werktage/);
  });
});

describe("analyzeRuege — fehlende Aufforderung", () => {
  const result = analyzeRuege(OHNE_AUFFORDERUNG);

  it("formelle Wirksamkeit fällt durch", () => {
    expect(result.formellPass).toBe(false);
  });
  it("Aufforderungs-Check schlägt fehl", () => {
    const aufforderung = result.checks.find((c) =>
      c.label.toLowerCase().includes("aufforderung")
    );
    expect(aufforderung?.pass).toBe(false);
  });
});

describe("buildResponseDraft", () => {
  it("Frist angemessen → Bestätigungs-Variante", () => {
    const draft = buildResponseDraft({
      formellPass: true,
      fristTage: 14,
      fristAngemessen: true,
    });
    expect(draft).toMatch(/innerhalb dieser Frist/);
  });

  it("Frist unangemessen → Setzen einer neuen Frist", () => {
    const draft = buildResponseDraft({
      formellPass: true,
      fristTage: 5,
      fristAngemessen: false,
    });
    expect(draft).toMatch(/unangemessen kurz/);
    expect(draft).toMatch(/14 Werktage/);
  });

  it("enthält Beweissicherungs-Hinweise als Pflichtbestandteil", () => {
    const draft = buildResponseDraft({
      formellPass: true,
      fristTage: 14,
      fristAngemessen: true,
    });
    expect(draft).toMatch(/Beweissicherung/);
    expect(draft).toMatch(/Foto-Dokumentation/);
    expect(draft).toMatch(/Sachverständigen/);
  });
});
