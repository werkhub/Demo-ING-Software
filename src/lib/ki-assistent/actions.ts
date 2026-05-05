"use server";

import { getLocale } from "next-intl/server";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { buildWorkspaceSnapshot } from "./snapshot";
import { getKiAssistantProvider } from "./provider";
import type { Locale } from "./feature-index";

export type KiAssistantResponse = {
  markdown: string;
  providerName: string;
  questionEcho: string;
};

function normalizeLocale(raw: string): Locale {
  return raw === "en" ? "en" : "de";
}

/**
 * Server-Action für den Floating-KI-Assistenten. Sammelt Snapshot, ruft
 * Provider, gibt Markdown-Antwort zurück. Persistiert die Anfrage NICHT —
 * der Floating-Assistent ist Quick-Access, keine dauerhafte Anfrage-Historie.
 * Wer das Resultat speichern möchte, hat dafür den Recht-Assistenten.
 */
export async function askKiAssistant(
  question: string
): Promise<ActionResult<KiAssistantResponse>> {
  const trimmed = question.trim();
  const locale = normalizeLocale(await getLocale());
  if (trimmed.length < 3) {
    return fail(
      locale === "en"
        ? "Please enter at least 3 characters."
        : "Bitte mindestens 3 Zeichen eingeben."
    );
  }
  if (trimmed.length > 2000) {
    return fail(
      locale === "en"
        ? "Question is too long (max. 2000 characters)."
        : "Frage zu lang (max. 2000 Zeichen)."
    );
  }

  let snapshot;
  try {
    snapshot = await buildWorkspaceSnapshot(locale);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return fail(
      locale === "en"
        ? `Workspace snapshot could not be loaded: ${msg}`
        : `Workspace-Snapshot konnte nicht geladen werden: ${msg}`
    );
  }

  try {
    const provider = await getKiAssistantProvider();
    const result = await provider.answer({ question: trimmed, snapshot });
    return ok({
      markdown: result.markdown,
      providerName: result.providerName,
      questionEcho: trimmed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return fail(
      locale === "en"
        ? `AI assistant unavailable: ${msg}`
        : `KI-Assistent nicht verfügbar: ${msg}`
    );
  }
}
