import { UI_STATE_LABEL } from "@/lib/hinschg";
import type { HinschgUiState } from "@/db/schema";

const TONE: Record<HinschgUiState, string> = {
  neu:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  ack_ueberfaellig:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  in_pruefung:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  antwort_ueberfaellig:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  abgeschlossen:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  unbegruendet:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  archiviert:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function HinschgStatusBadge({
  state,
  size = "sm",
}: {
  state: HinschgUiState;
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
