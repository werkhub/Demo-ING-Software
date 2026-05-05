import type { AbnahmeBeurteilung, AbnahmeKind } from "@/db/schema";
import {
  ABNAHME_BEURTEILUNG_LABEL,
  ABNAHME_KIND_LABEL,
} from "@/lib/abnahme";

const KIND_TONE: Record<AbnahmeKind, string> = {
  foermlich:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  fiktiv:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  konkludent:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  teilabnahme:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  verweigert:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

const BEURTEILUNG_TONE: Record<AbnahmeBeurteilung, string> = {
  mangelfrei:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  mit_unwesentlichen_maengeln:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  mit_wesentlichen_maengeln:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  verweigert:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

export function AbnahmeKindBadge({
  kind,
  size = "sm",
}: {
  kind: AbnahmeKind;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${KIND_TONE[kind]}`}
    >
      {ABNAHME_KIND_LABEL[kind]}
    </span>
  );
}

export function BeurteilungBadge({
  beurteilung,
  size = "sm",
}: {
  beurteilung: AbnahmeBeurteilung;
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "md" ? "text-[11px] px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${BEURTEILUNG_TONE[beurteilung]}`}
    >
      {ABNAHME_BEURTEILUNG_LABEL[beurteilung]}
    </span>
  );
}
