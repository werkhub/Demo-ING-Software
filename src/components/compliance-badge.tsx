import type { ComplianceLevel } from "@/db/schema";
import { COMPLIANCE_LEVEL_LABEL } from "@/lib/compliance/nu";

const TONE: Record<ComplianceLevel, string> = {
  ok: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  warning:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  critical:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

const SHORT: Record<ComplianceLevel, string> = {
  ok: "OK",
  warning: "Läuft ab",
  critical: "Lücke",
};

/**
 * Badge für NU-Compliance-Status. Reuse aus NU-Liste, Detail-Header,
 * Rechnungen-Detail (wenn Zahlungsfreigabe blockiert wird).
 */
export function ComplianceBadge({
  level,
  fulfilled,
  required,
  size = "sm",
}: {
  level: ComplianceLevel;
  fulfilled?: number;
  required?: number;
  size?: "sm" | "md";
}) {
  const showCount =
    fulfilled !== undefined && required !== undefined && required > 0;
  const sizeCls =
    size === "md"
      ? "text-[11px] px-2 py-0.5"
      : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      title={COMPLIANCE_LEVEL_LABEL[level]}
      className={`font-mono uppercase tracking-[0.12em] border rounded-sm ${sizeCls} ${TONE[level]}`}
    >
      {SHORT[level]}
      {showCount ? ` · ${fulfilled}/${required}` : ""}
    </span>
  );
}
