import {
  AUFMASS_STATUS_LABEL,
  AUFMASS_ZEILE_STATUS_LABEL,
} from "@/lib/aufmass";
import type { AufmassStatus, AufmassZeileStatus } from "@/db/schema";

const TONE: Record<AufmassStatus, string> = {
  entwurf:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  eingereicht:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  geprueft:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  freigegeben:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  abgerechnet:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const ZEILE_TONE: Record<AufmassZeileStatus, string> = {
  offen:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  zugestimmt:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  gekuerzt:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  bestritten:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

export function AufmassStatusBadge({
  status,
  size = "sm",
}: {
  status: AufmassStatus;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[status]}`}
    >
      {AUFMASS_STATUS_LABEL[status]}
    </span>
  );
}

export function AufmassZeileStatusBadge({
  status,
}: {
  status: AufmassZeileStatus;
}) {
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm text-[10px] px-1.5 py-0.5 ${ZEILE_TONE[status]}`}
    >
      {AUFMASS_ZEILE_STATUS_LABEL[status]}
    </span>
  );
}
