import { Link } from "@/i18n/navigation";
import type { VorgangCitationKind } from "@/db/schema";

const KIND_TONE: Record<VorgangCitationKind, string> = {
  bgb:
    "bg-[color:var(--color-info-soft,var(--color-bg-subtle))] text-[color:var(--color-info,var(--color-fg-muted))] border-[color:var(--color-info-border,var(--color-border))]",
  hoai:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  vob:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  urteil:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  intern:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const KIND_PREFIX: Record<VorgangCitationKind, string> = {
  bgb: "📕",
  hoai: "📘",
  vob: "📜",
  urteil: "⚖️",
  intern: "🔗",
};

function hrefFor(kind: VorgangCitationKind, ref: string): string {
  if (kind === "bgb") return `/gesetze/bgb#${encodeURIComponent(ref)}`;
  if (kind === "hoai") return `/gesetze/hoai#${encodeURIComponent(ref)}`;
  if (kind === "vob") return `/gesetze/vob_b#${encodeURIComponent(ref)}`;
  if (kind === "urteil") return `/urteile?q=${encodeURIComponent(ref)}`;
  if (kind === "intern") return `/vorgaenge/${encodeURIComponent(ref)}`;
  return "/gesetze";
}

export function CitationBadge({
  kind,
  cite,
  snippet,
}: {
  kind: VorgangCitationKind;
  cite: string;
  snippet?: string | null;
}) {
  return (
    <Link
      href={hrefFor(kind, cite)}
      title={snippet ?? undefined}
      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 hover:underline ${KIND_TONE[kind]}`}
    >
      <span aria-hidden>{KIND_PREFIX[kind]}</span>
      <span>{cite}</span>
    </Link>
  );
}
