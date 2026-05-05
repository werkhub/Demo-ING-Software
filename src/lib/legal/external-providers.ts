/**
 * Externe Anbieter, die VOB-Volltexte für ihre Abonnenten bereitstellen.
 *
 * LexBau zeigt im Free-Tier nur Paraphrasen. Für den Volltext leitet die UI an
 * den vom Kunden bevorzugten Anbieter weiter — der Kunde nutzt sein vorhandenes
 * Abo. Paragraf-genaue Deep-Links existieren bei den drei großen Anbietern nur
 * eingeschränkt (alle hinter Login). Wir liefern eine Such-URL mit
 * vorausgefülltem Paragraf, das ist der bestmögliche Komfort ohne Lizenz.
 */

import type { LegalSource, VobPreferredExternalProvider } from "@/db/schema";

export type ExternalProviderId = "juris" | "din_media" | "beck_online";

export type VobPart = "A" | "B" | "C";

export type ExternalProvider = {
  id: ExternalProviderId;
  label: string;
  shortLabel: string;
  description: string;
  portalUrl: string;
  /**
   * Best-Effort-URL für einen konkreten VOB-Paragrafen oder eine ATV.
   * Beispiel-Slugs:
   *   VOB/A: "1", "3a", "10-eu", "1-vs"
   *   VOB/B: "1" … "18"
   *   VOB/C: "din-18299", "din-18331", "din-18459"
   */
  buildVobUrl: (part: VobPart, slug: string) => string;
};

function vobLabel(part: VobPart, slug: string): string {
  if (part === "C") {
    return slug.toUpperCase().replace("DIN-", "DIN ");
  }
  return `VOB/${part} § ${slug.toUpperCase()}`;
}

export const EXTERNAL_PROVIDERS: Record<ExternalProviderId, ExternalProvider> = {
  juris: {
    id: "juris",
    label: "juris",
    shortLabel: "juris",
    description:
      "Etabliertes Anwaltsportal mit Volltext + Kommentaren. Login erforderlich.",
    portalUrl: "https://www.juris.de",
    buildVobUrl: (part, slug) =>
      `https://www.juris.de/jportal/nav/index.jsp?searchparam=${encodeURIComponent(
        vobLabel(part, slug)
      )}`,
  },
  din_media: {
    id: "din_media",
    label: "DIN Media (VOBcenter)",
    shortLabel: "DIN Media",
    description:
      "Originalverlag der VOB. VOBcenter-Abo nötig für vollständigen Volltext.",
    portalUrl: "https://www.dinmedia.de/de/regelwerk/vob",
    buildVobUrl: () => "https://www.dinmedia.de/de/regelwerk/vob",
  },
  beck_online: {
    id: "beck_online",
    label: "beck-online",
    shortLabel: "beck-online",
    description:
      "C.H. Beck-Datenbank mit VOB-Modulen und Kommentaren. Login erforderlich.",
    portalUrl: "https://beck-online.beck.de",
    buildVobUrl: (part, slug) => {
      if (part === "B") {
        return `https://beck-online.beck.de/Default.aspx?vpath=${encodeURIComponent(
          `bibdata/komm/VOBKomm/cont/VOBKomm.B.P${slug}.htm`
        )}`;
      }
      // VOB/A und VOB/C: keine stabile Deep-Link-URL bekannt → Suche
      return `https://beck-online.beck.de/Suche?words=${encodeURIComponent(
        vobLabel(part, slug)
      )}`;
    },
  },
};

export const ALL_EXTERNAL_PROVIDERS: ExternalProvider[] = [
  EXTERNAL_PROVIDERS.juris,
  EXTERNAL_PROVIDERS.din_media,
  EXTERNAL_PROVIDERS.beck_online,
];

/**
 * Liefert geordnete Provider-Liste basierend auf Workspace-Präferenz.
 * Bevorzugter Anbieter steht vorne; "all" liefert alle drei in Standardreihenfolge.
 */
export function orderProvidersByPreference(
  preferred: VobPreferredExternalProvider
): ExternalProvider[] {
  if (preferred === "all") return ALL_EXTERNAL_PROVIDERS;
  const top = EXTERNAL_PROVIDERS[preferred];
  const rest = ALL_EXTERNAL_PROVIDERS.filter((p) => p.id !== preferred);
  return [top, ...rest];
}

export type DeepLink = {
  provider: ExternalProvider;
  url: string;
  isPreferred: boolean;
};

export function vobPartFromSource(source: LegalSource): VobPart | null {
  if (source === "vob_a") return "A";
  if (source === "vob_b") return "B";
  if (source === "vob_c") return "C";
  return null;
}

export function buildVobDeepLinks(
  source: LegalSource,
  paragraphSlug: string,
  preferred: VobPreferredExternalProvider
): DeepLink[] {
  const part = vobPartFromSource(source);
  if (!part) return [];
  const providers = orderProvidersByPreference(preferred);
  return providers.map((p, i) => ({
    provider: p,
    url: p.buildVobUrl(part, paragraphSlug),
    isPreferred: preferred !== "all" && i === 0,
  }));
}
