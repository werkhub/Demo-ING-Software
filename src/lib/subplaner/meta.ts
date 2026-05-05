/**
 * UI-Konstanten für Subplaner-Vergabe (Ingenieurbüro).
 */

export const LEISTUNGSBEREICH_LABEL: Record<string, string> = {
  tragwerk: "Tragwerksplanung",
  tga: "TGA / HLS",
  brandschutz: "Brandschutz",
  vermessung: "Vermessung",
  geotechnik: "Geotechnik / Baugrund",
  schall: "Schall- / Wärmeschutz",
  sonstiges: "Sonstiges",
};

export const SUBPLANER_STATUS_LABEL: Record<string, string> = {
  angefragt: "angefragt",
  beauftragt: "beauftragt",
  abgeschlossen: "abgeschlossen",
  storniert: "storniert",
};

export const SUBPLANER_STATUS_COLOR: Record<string, string> = {
  angefragt: "border-[color:var(--color-border)] text-[color:var(--color-fg-muted)]",
  beauftragt:
    "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]",
  abgeschlossen:
    "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
  storniert:
    "border-[color:var(--color-fg-muted)] text-[color:var(--color-fg-muted)] line-through",
};
