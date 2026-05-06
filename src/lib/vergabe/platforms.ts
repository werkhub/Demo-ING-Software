/**
 * Bekannte Vergabe-Plattformen (DACH) — Erkennung anhand Hostname.
 * Reine Lookup-Funktion ohne Netzwerkzugriff. Wird sowohl serverseitig
 * (Action-Validation) als auch clientseitig (Live-Anzeige) verwendet.
 */

export type TenderPlatform = {
  /** Stabiler Schlüssel für interne Logik. */
  id: string;
  /** Anzeigename. */
  label: string;
  /** Geltungsbereich grob — beeinflusst Verfahrensart-Default. */
  scope: "eu" | "bund" | "land" | "kommune" | "privat";
  /** Hostname-Fragmente; alle in Kleinbuchstaben. */
  hostMatches: readonly string[];
  /** Hinweis für Bieter, der im Result-Panel angezeigt wird. */
  hint: string;
};

export const TENDER_PLATFORMS: readonly TenderPlatform[] = [
  {
    id: "ted",
    label: "TED · Tenders Electronic Daily (EU)",
    scope: "eu",
    hostMatches: ["ted.europa.eu"],
    hint: "EU-Schwellenwert Bau 5.538.000 € netto (Stand 2024). EU-weite Verfahrensregeln nach GWB greifen.",
  },
  {
    id: "evergabe-bund",
    label: "eVergabe-Online (Bund / BeschA)",
    scope: "bund",
    hostMatches: ["evergabe-online.de", "evergabe.bund.de"],
    hint: "Bundes-Plattform. Achten auf VHB-Formblätter (211, 212, 213, 233).",
  },
  {
    id: "dtvp",
    label: "DTVP · Deutsches Vergabeportal",
    scope: "land",
    hostMatches: ["dtvp.de"],
    hint: "Verbreitete Mehrländer-Plattform. Nachrichten-Modul für Bieterfragen nutzen — Fristen sind hart.",
  },
  {
    id: "subreport",
    label: "Subreport ELViS",
    scope: "land",
    hostMatches: ["subreport.de", "subreport-elvis.de"],
    hint: "ELViS-Bietertool nötig für Angebotsabgabe. Signatur-/Authentifizierungs-Setup vorab testen.",
  },
  {
    id: "vergabe24",
    label: "vergabe24",
    scope: "land",
    hostMatches: ["vergabe24.de"],
    hint: "Mehrländer-Plattform mit kommunalen Stellen. Lose-Vergabe häufig.",
  },
  {
    id: "vmp-bayern",
    label: "Vergabeplattform Bayern",
    scope: "land",
    hostMatches: ["vergabe.bayern.de"],
    hint: "Bayerisches Staatsministerium. Tariftreue- und Mindestlohn-Erklärungen typisch verlangt.",
  },
  {
    id: "vmp-nrw",
    label: "Vergabemarktplatz NRW",
    scope: "land",
    hostMatches: ["vergabe.nrw.de", "vergabemarktplatz.nrw.de"],
    hint: "NRW: Tariftreue- und Vergabegesetz NRW (TVgG) prüfen.",
  },
  {
    id: "bi-medien",
    label: "B_I Gemeinschaftsausschreibung",
    scope: "privat",
    hostMatches: ["bi-medien.de", "bi-gemeinschaftsausschreibung.de"],
    hint: "Sammel-Ausschreibungen, häufig privatwirtschaftlich. VOB/B nicht automatisch — Vertragsgrundlage prüfen.",
  },
  {
    id: "ai-bau",
    label: "AI BAU · Auftragsinformations-System",
    scope: "privat",
    hostMatches: ["ai-bau.de"],
    hint: "Auftragsinfo-Datenbank für Bauunternehmer; verlinkt auf Original-Plattformen.",
  },
];

export function detectPlatformFromUrl(url: string): TenderPlatform | null {
  if (!url) return null;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    // kein gültiges URL-Objekt — vielleicht nur ein Domain-Schnipsel
    host = url.toLowerCase();
  }
  for (const p of TENDER_PLATFORMS) {
    if (p.hostMatches.some((h) => host.includes(h))) return p;
  }
  return null;
}
