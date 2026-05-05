import {
  UI_STATE_LABEL,
  type AnzeigeUiState,
} from "@/lib/anzeigen";

const TONE: Record<AnzeigeUiState, string> = {
  entwurf:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  versendet:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  wartet_zugang_ueberfaellig:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  bestaetigt:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  wartet_antwort:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  zurueckgewiesen:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  erledigt:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function AnzeigeStatusBadge({
  state,
  size = "sm",
}: {
  state: AnzeigeUiState;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[state]}`}
    >
      {UI_STATE_LABEL[state]}
    </span>
  );
}
