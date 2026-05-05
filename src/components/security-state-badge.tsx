import type { SecurityState } from "@/db/schema";
import { SECURITY_STATE_LABEL } from "@/lib/sicherheiten";

const TONE: Record<SecurityState, string> = {
  aktiv:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  expiring:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  overdue:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  released:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function SecurityStateBadge({
  state,
  daysLeft,
  size = "sm",
}: {
  state: SecurityState;
  daysLeft?: number | null;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md"
      ? "text-[11px] px-2 py-0.5"
      : "text-[10px] px-1.5 py-0.5";
  let detail = "";
  if (state === "expiring" && typeof daysLeft === "number") {
    detail = ` · ${daysLeft} T`;
  } else if (state === "overdue" && typeof daysLeft === "number") {
    detail = ` · ${Math.abs(daysLeft)} T überfällig`;
  }
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[state]}`}
    >
      {SECURITY_STATE_LABEL[state]}
      {detail}
    </span>
  );
}
