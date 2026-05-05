/**
 * Provider-Interface für den KI-Assistenten.
 *
 * Eigener Provider neben dem Recht-Assistenten, weil der Use-Case anders ist:
 *   - Recht-Assistent: juristische Antwort mit Norm/Urteilsbezug.
 *   - KI-Assistent: operativer Überblick über Workspace-Daten — „wo stehen
 *     wir bei Projekt X?", „wer ist Projektleiter?", „wie viel ist
 *     abgerechnet?", „welche Risiken sind akut?".
 *
 * Wahl per ENV `KI_ASSISTANT_PROVIDER`:
 *   mock    — heuristische Antwort auf Basis des Snapshots (Default)
 *   claude  — Claude-API mit Snapshot als System-Prompt-Kontext (Stub)
 */
import "server-only";
import type { WorkspaceSnapshot } from "./snapshot";

export type KiAssistantInput = {
  question: string;
  snapshot: WorkspaceSnapshot;
};

export type KiAssistantOutput = {
  /** Markdown-Volltext — wird im Drawer gerendert. */
  markdown: string;
  /** Welcher Provider hat geantwortet. */
  providerName: string;
};

export interface KiAssistantProvider {
  readonly name: string;
  answer(input: KiAssistantInput): Promise<KiAssistantOutput>;
}

let cached: KiAssistantProvider | null = null;

export async function getKiAssistantProvider(): Promise<KiAssistantProvider> {
  if (cached) return cached;
  const choice = (process.env.KI_ASSISTANT_PROVIDER ?? "mock").toLowerCase();
  switch (choice) {
    case "claude": {
      const { ClaudeKiProvider } = await import("./claude-provider");
      cached = new ClaudeKiProvider();
      break;
    }
    case "mock":
    default: {
      const { MockKiProvider } = await import("./mock-provider");
      cached = new MockKiProvider();
      break;
    }
  }
  return cached;
}
