/**
 * Mock-Provider für den Recht-Assistenten — bleibt aktiv bis Claude-API-Key.
 *
 * Liefert eine rollen-bewusste Demo-Antwort, damit die UI nicht „leer" wirkt.
 * Keine echte Inferenz — nur Textbaustein + Hinweis auf Phase 1.
 */
import "server-only";
import { ROLE_META } from "@/lib/roles";
import {
  CLIENT_FOCUS_LABEL,
  DISCIPLINE_LABEL,
} from "@/lib/workspace/disciplines";
import type {
  LegalAssistantInput,
  LegalAssistantOutput,
  LegalAssistantProvider,
} from "./provider";

export class MockProvider implements LegalAssistantProvider {
  readonly name = "mock";

  async answer(input: LegalAssistantInput): Promise<LegalAssistantOutput> {
    const role = ROLE_META[input.role];
    const disciplineHints = (input.disciplines ?? [])
      .map((d) => `· ${DISCIPLINE_LABEL[d]}`)
      .join("\n");
    const focusHint = input.clientFocus
      ? `Auftraggeber-Schwerpunkt: **${CLIENT_FOCUS_LABEL[input.clientFocus]}** — Antworten passen Vergabe-/Förderprojekt-/Honorarprüfungs-Aspekte entsprechend an.`
      : "";
    const lines = [
      `**Mock-Antwort · Demo-Modus**`,
      ``,
      `Diese Anfrage wurde gespeichert. Sobald die Claude-API-Anbindung mit RAG-Grounding auf BGB, HOAI, VOB und der indizierten BGH-Rechtsprechung scharfgeschaltet ist, liefert der Assistent hier:`,
      ``,
      `· Einschlägige Norm mit Paragraph-Referenz`,
      `· Pro/Contra-Argumente für die konkrete Situation`,
      `· Konkrete Handlungsschritte`,
      `· Quellenverweise mit Aktenzeichen`,
      ``,
      `**Aktive Perspektive: ${role.shortLabel} — ${role.label}**`,
      role.assistantPerspective,
      disciplineHints
        ? `\n**Fachdisziplinen des Workspaces:**\n${disciplineHints}`
        : "",
      focusHint ? `\n${focusHint}` : "",
      input.category
        ? `\n_Kategorie automatisch erkannt: ${input.category}_`
        : "",
    ].filter((l) => l !== "");
    return {
      markdown: lines.join("\n"),
      providerName: this.name,
    };
  }
}
