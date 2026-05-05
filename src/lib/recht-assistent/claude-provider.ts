/**
 * Claude-Provider — Stub.
 *
 * Wird scharf, sobald:
 *   1. ANTHROPIC_API_KEY in der ENV gesetzt ist
 *   2. RAG-Index für BGB/HOAI/VOB/BGH-Rechtsprechung gebaut + abrufbar ist
 *      (geplant in src/lib/legal/rag.ts — kommt mit Modul 5)
 *   3. LEGAL_ASSISTANT_PROVIDER=claude in der ENV gesetzt wird
 *
 * Heute: liefert deterministisches Throw, damit ein versehentlich aktivierter
 * Provider nicht stillschweigend Mock liefert (Sicherheits-Default: laut
 * scheitern, nicht leise täuschen).
 *
 * Skizze für die spätere Implementierung:
 *   - Anthropic SDK initialisieren (claude-opus-4-7 oder claude-sonnet-4-6)
 *   - System-Prompt mit Rolle (ROLE_META[input.role].assistantPerspective)
 *   - Retrieval: top-k Chunks aus legalChunks (siehe schema/legal.ts)
 *   - Tool-Calls für „Norm nachschlagen" / „Urteil zitieren"
 *   - Strukturierte Ausgabe via Tool oder JSON-Mode (LegalAssistantOutput.structured)
 *   - Audit-Log: Quellen + Token-Verbrauch
 */
import "server-only";
import type {
  LegalAssistantInput,
  LegalAssistantOutput,
  LegalAssistantProvider,
} from "./provider";

export class ClaudeProvider implements LegalAssistantProvider {
  readonly name = "claude";

  async answer(_input: LegalAssistantInput): Promise<LegalAssistantOutput> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ClaudeProvider gewählt, aber ANTHROPIC_API_KEY ist nicht gesetzt."
      );
    }
    throw new Error(
      "ClaudeProvider ist noch nicht implementiert. Setze LEGAL_ASSISTANT_PROVIDER=mock oder implementiere claude-provider.ts."
    );
  }
}
