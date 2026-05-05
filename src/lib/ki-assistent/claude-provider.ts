/**
 * Claude-Provider für den KI-Assistenten — Stub.
 *
 * Wird scharf, sobald:
 *   1. ANTHROPIC_API_KEY in der ENV gesetzt ist
 *   2. KI_ASSISTANT_PROVIDER=claude in der ENV gesetzt wird
 *
 * Heute: deterministisches Throw, damit ein versehentlich aktivierter Provider
 * nicht still auf Mock zurückfällt (Sicherheits-Default: laut scheitern).
 *
 * Skizze für die spätere Implementierung:
 *   - Anthropic SDK initialisieren (Modell `claude-opus-4-7` oder
 *     `claude-sonnet-4-6` für schnellere Antworten)
 *   - Snapshot als kompaktes JSON in den System-Prompt einbetten
 *     (~5–10 KB, klar unter Token-Limit)
 *   - Tool-Use vorbereiten: get_project(id), search_vorgaenge(query),
 *     get_frist_details(id) — damit der Assistent gezielt nachzieht
 *   - Strukturierte Output-Variante (Markdown + optionale Citations
 *     mit Modul-Links) als JSON-Mode oder Tool-Call-Result
 *   - Audit-Log: question, response, token-Verbrauch
 */
import "server-only";
import type {
  KiAssistantInput,
  KiAssistantOutput,
  KiAssistantProvider,
} from "./provider";

export class ClaudeKiProvider implements KiAssistantProvider {
  readonly name = "claude";

  async answer(_input: KiAssistantInput): Promise<KiAssistantOutput> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ClaudeKiProvider gewählt, aber ANTHROPIC_API_KEY ist nicht gesetzt."
      );
    }
    throw new Error(
      "ClaudeKiProvider ist noch nicht implementiert. Setze KI_ASSISTANT_PROVIDER=mock oder implementiere claude-provider.ts."
    );
  }
}
