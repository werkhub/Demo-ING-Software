import type {
  AusgangsrechnungKind,
  AusgangsrechnungStatus,
} from "@/db/schema";
import { AR_KIND_LABEL, AR_STATUS_LABEL } from "@/lib/ausgangsrechnungen";

const TONE: Record<AusgangsrechnungStatus, string> = {
  entwurf:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  versendet:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  teilweise_bezahlt:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  bezahlt:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  mahnung_1:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  mahnung_2:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  mahnung_3:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  gerichtlich:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

const KIND_TONE: Record<AusgangsrechnungKind, string> = {
  abschlag:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  schluss:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
};

export function ArStatusBadge({
  status,
  size = "sm",
}: {
  status: AusgangsrechnungStatus;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[status]}`}
    >
      {AR_STATUS_LABEL[status]}
    </span>
  );
}

export function ArKindBadge({
  kind,
  abschlagNo,
}: {
  kind: AusgangsrechnungKind;
  abschlagNo?: number | null;
}) {
  const label =
    kind === "abschlag" && abschlagNo
      ? `${abschlagNo}. Abschlag`
      : AR_KIND_LABEL[kind];
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm text-[10px] px-1.5 py-0.5 ${KIND_TONE[kind]}`}
    >
      {label}
    </span>
  );
}
