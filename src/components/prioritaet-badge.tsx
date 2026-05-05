import type { MangelPrioritaet } from "@/db/schema";
import { MANGEL_PRIORITAET_LABEL } from "@/lib/maengel";

const TONE: Record<MangelPrioritaet, string> = {
  kritisch:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  hoch:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  mittel:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]",
  niedrig:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function PrioritaetBadge({
  prioritaet,
  size = "sm",
}: {
  prioritaet: MangelPrioritaet;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[prioritaet]}`}
    >
      {MANGEL_PRIORITAET_LABEL[prioritaet]}
    </span>
  );
}
