/**
 * Provider-Interface für den Recht-Assistenten.
 *
 * Heute wählt der Selektor immer den `MockProvider`. Sobald der Anthropic-API-
 * Key in der Umgebung liegt + RAG-Index für BGB/HOAI/VOB/BGH steht, fügt man
 * den `ClaudeProvider` ein und setzt ENV `LEGAL_ASSISTANT_PROVIDER=claude` —
 * der Rest der App ändert sich nicht.
 *
 * Ziel-Vertrag:
 *   - synchron einsetzbar aus Server-Actions (eine Promise pro Frage)
 *   - liefert immer ein Markdown-Body (UI rendert Markdown bereits)
 *   - optional `structured` für spätere strukturierte Anzeige (Norm/Pros/Cons/Aktionen)
 *   - tolerant gegenüber Provider-Fehlern: throws → Action zeigt fail-Banner
 */
import "server-only";
import type { ClientFocus, Discipline, WorkspaceRole } from "@/db/schema";

export type LegalAssistantInput = {
  question: string;
  /** Rolle des Workspaces — beeinflusst Antwort-Perspektive (AN/AG/PS/BL). */
  role: WorkspaceRole;
  /**
   * Fachdisziplinen des Workspaces (mehrfach). Steuert, ob Antworten
   * Hochbau-Werkvertrag, Tiefbau-Vergaberecht, Tragwerksstreit etc. in
   * den Vordergrund rücken.
   */
  disciplines?: readonly Discipline[];
  /**
   * Auftraggeber-Schwerpunkt. „oeffentlich" → VgV/UVgO/Honorarprüfung
   * werden bewusst eingeflochten, „privat" → BGB-Werkvertrag-Default.
   */
  clientFocus?: ClientFocus;
  /** Optional: Projektbezug für Grounding. */
  projectId?: string | null;
  /** Optional: Auto-erkannte Kategorie (aus categorizeQuery). */
  category?: string | null;
};

export type LegalAssistantOutput = {
  /** Markdown-Volltext — wird in queries.response gespeichert + im UI gerendert. */
  markdown: string;
  /** Optional: strukturiertes Detail für künftige UI-Bausteine. */
  structured?: {
    norm?: string | null;
    pros?: string[];
    cons?: string[];
    actions?: string[];
    citations?: Array<{
      kind: "bgb" | "hoai" | "vob" | "urteil" | "intern";
      ref: string;
      snippet?: string;
    }>;
  };
  /** Welcher Provider hat geantwortet — für Telemetry + Debug. */
  providerName: string;
};

export interface LegalAssistantProvider {
  readonly name: string;
  answer(input: LegalAssistantInput): Promise<LegalAssistantOutput>;
}

/**
 * Wählt den aktiven Provider per ENV. Default: Mock (Demo).
 *
 *   LEGAL_ASSISTANT_PROVIDER=mock     → MockProvider (Default)
 *   LEGAL_ASSISTANT_PROVIDER=claude   → ClaudeProvider (sobald API-Key gesetzt)
 *
 * Lazy-Import damit der Claude-SDK nicht im Bundle landet, solange er nicht
 * gewählt ist.
 */
let cached: LegalAssistantProvider | null = null;

export async function getLegalAssistantProvider(): Promise<LegalAssistantProvider> {
  if (cached) return cached;
  const choice = (process.env.LEGAL_ASSISTANT_PROVIDER ?? "mock").toLowerCase();
  switch (choice) {
    case "claude": {
      const { ClaudeProvider } = await import("./claude-provider");
      cached = new ClaudeProvider();
      break;
    }
    case "mock":
    default: {
      const { MockProvider } = await import("./mock-provider");
      cached = new MockProvider();
      break;
    }
  }
  return cached;
}
