/**
 * Pure-Function-Resolver für die VOB-Anzeige.
 *
 * Heute (Tier 0): Workspace hat keine Lizenz → Paraphrase + Deep-Links.
 * Morgen (Tier 1): Workspace hat passende Lizenz + chunk.licensedContent ist
 *   befüllt → Volltext nativ.
 *
 * Die UI ruft NUR diesen Resolver auf, keine direkte Logik in den Pages.
 * So kann der Lizenz-Switch später komplett serverseitig erfolgen.
 */

import type { LegalChunk, LegalSource, Workspace } from "@/db/schema";
import { buildVobDeepLinks, type DeepLink } from "./external-providers";

export type VobView =
  | {
      mode: "paraphrase";
      ref: string;
      title: string;
      summary: string | null;
      paraphraseContent: string;
      deepLinks: DeepLink[];
      disclaimer: string;
    }
  | {
      mode: "fulltext";
      ref: string;
      title: string;
      summary: string | null;
      paraphraseContent: string;
      fulltextContent: string;
      sourceLabel: string;
      licensedSourceId: string | null;
      deepLinks: DeepLink[];
    };

const PARAPHRASE_DISCLAIMER_BY_SOURCE: Record<string, string> = {
  vob_a:
    "Eigene Zusammenfassung in Anlehnung an den Wortlaut. Der amtliche Volltext der VOB/A liegt urheberrechtlich bei DIN Media. Für den Volltext bitte den vorhandenen Anbieter-Zugang nutzen.",
  vob_b:
    "Eigene Zusammenfassung in Anlehnung an den Wortlaut. Der amtliche Volltext der VOB/B liegt urheberrechtlich bei DIN Media. Für den Volltext bitte den vorhandenen Anbieter-Zugang nutzen.",
  vob_c:
    "Eigene Zusammenfassung der ATV-Inhalte. Die Volltexte der DIN-Normenreihe (18299 und 18300–18459) liegen urheberrechtlich bei DIN Media. Für den Normentext bitte den vorhandenen Anbieter-Zugang nutzen.",
};

const PROVIDER_LABEL: Record<string, string> = {
  din_media: "DIN Media (Volltext-Lizenz)",
  juris: "juris (Volltext-Lizenz)",
  beck_online: "beck-online (Volltext-Lizenz)",
};

export function resolveVobView(
  chunk: Pick<
    LegalChunk,
    "ref" | "title" | "summary" | "content" | "licensedContent" | "licensedSourceId" | "slug"
  >,
  workspace: Pick<Workspace, "vobLicenseProvider" | "vobPreferredExternalProvider">,
  source: LegalSource = "vob_b"
): VobView {
  const deepLinks = buildVobDeepLinks(
    source,
    chunk.slug,
    workspace.vobPreferredExternalProvider
  );
  const disclaimer =
    PARAPHRASE_DISCLAIMER_BY_SOURCE[source] ?? PARAPHRASE_DISCLAIMER_BY_SOURCE.vob_b;

  if (
    workspace.vobLicenseProvider !== "none" &&
    chunk.licensedContent &&
    chunk.licensedContent.trim().length > 0
  ) {
    return {
      mode: "fulltext",
      ref: chunk.ref,
      title: chunk.title,
      summary: chunk.summary,
      paraphraseContent: chunk.content,
      fulltextContent: chunk.licensedContent,
      sourceLabel:
        PROVIDER_LABEL[workspace.vobLicenseProvider] ?? workspace.vobLicenseProvider,
      licensedSourceId: chunk.licensedSourceId,
      deepLinks,
    };
  }

  return {
    mode: "paraphrase",
    ref: chunk.ref,
    title: chunk.title,
    summary: chunk.summary,
    paraphraseContent: chunk.content,
    deepLinks,
    disclaimer,
  };
}
