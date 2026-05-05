import type { VorgangCategory, VorgangStatus } from "@/db/schema";

export const VORGANG_CATEGORY_LABEL: Record<VorgangCategory, string> = {
  maengelruege: "Mängelrüge",
  anlieferung: "Anlieferung",
  vertragspflicht: "Vertragspflicht",
  sonstiges: "Sonstiges",
};

export const VORGANG_STATUS_LABEL: Record<VorgangStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  wartet_auf_anwalt: "Wartet auf Anwalt",
  abgeschlossen: "Abgeschlossen",
  archiviert: "Archiviert",
};

export const VORGANG_STATUS_TONE: Record<VorgangStatus, string> = {
  offen:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  in_bearbeitung:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  wartet_auf_anwalt:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  abgeschlossen:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  archiviert:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

/** Tone-Helper für RiskScorePill — pure, keine Side-Effects. */
export function vorgangRiskTone(score: number): string {
  if (score >= 70)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (score >= 40)
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
}
