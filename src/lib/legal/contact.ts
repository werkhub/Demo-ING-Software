export const OPERATOR = {
  legalName: "TODO: Firmenname GmbH",
  street: "TODO: Strasse Nr.",
  zip: "TODO: PLZ",
  city: "TODO: Stadt",
  country: "Deutschland",
  represented: "TODO: Geschäftsführer Vorname Nachname",
  registerCourt: "TODO: Amtsgericht ...",
  registerNumber: "TODO: HRB ...",
  vatId: "TODO: DE000000000",
  email: "TODO: kontakt@example.de",
  phone: "TODO: +49 ...",
  dpoName: "TODO: Datenschutzbeauftragter Name",
  dpoEmail: "TODO: datenschutz@example.de",
  supervisoryAuthority:
    "TODO: zuständige Landesdatenschutzbehörde, z. B. Hamburgischer Beauftragter für Datenschutz und Informationsfreiheit",
} as const;

export const HOSTING = {
  provider: "Hetzner Online GmbH",
  location: "Frankfurt am Main, Deutschland",
} as const;

export const SUBPROCESSORS = [
  {
    name: "Hetzner Online GmbH",
    purpose: "Server-Hosting (Anwendung & Datenbank)",
    location: "Deutschland",
    avv: "https://www.hetzner.com/de/legal/data-privacy",
  },
  {
    name: "Anthropic PBC",
    purpose: "KI-Antworten via Claude-API (sobald Phase 1 aktiv)",
    location: "USA / EU (je nach Region)",
    avv: "https://www.anthropic.com/legal/dpa",
  },
] as const;
