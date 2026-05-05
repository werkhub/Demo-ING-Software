import type { RechnungAnomalie } from "@/db/schema";

const KIND_LABEL: Record<RechnungAnomalie["kind"], string> = {
  price_jump: "Preis-Sprung",
  not_in_contract: "Nicht im Hauptvertrag",
  duplicate: "Duplikat-Verdacht",
  math_error: "Mathematischer Fehler",
  format_warning: "Format-Hinweis",
};

const SEV_TONE: Record<RechnungAnomalie["severity"], string> = {
  info: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  warning:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  critical:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

export function RechnungAnomaliePanel({
  anomalien,
}: {
  anomalien: RechnungAnomalie[];
}) {
  if (anomalien.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        Keine Anomalien gefunden — oder Anomalie-Engine noch nicht ausgeführt.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {anomalien.map((a) => (
        <li
          key={a.id}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4"
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 ${SEV_TONE[a.severity]}`}
              >
                {a.severity}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                {KIND_LABEL[a.kind]}
              </span>
            </div>
            <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              {a.createdAt.toLocaleString("de-DE")}
            </p>
          </div>
          <p className="text-sm text-[color:var(--color-fg)] leading-relaxed">
            {a.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
