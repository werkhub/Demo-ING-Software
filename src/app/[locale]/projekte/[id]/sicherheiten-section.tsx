import { fmtMoney } from "@/lib/utils";
import { SecurityStateBadge } from "@/components/security-state-badge";
import {
  SECURITY_LABELS,
  SECURITY_LEGAL_BASIS,
  annotateSecurities,
  summarizeSecurities,
} from "@/lib/sicherheiten";
import type { Project, Security, SecurityKind } from "@/db/schema";
import { SecurityForm } from "./security-form";
import {
  deleteSecurity,
  updateSecurityStatus,
} from "./sicherheiten-actions";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "aktiv", label: "Aktiv" },
  { value: "rueckgabe_angefordert", label: "Rückgabe angefordert" },
  { value: "freigegeben", label: "Freigegeben" },
  { value: "verfallen", label: "Verfallen" },
];

const DIRECTION_LABEL: Record<string, string> = {
  provided_to_ag: "wir → AG",
  received_from_ag: "AG → wir",
  provided_by_nu: "NU → wir",
};

function buildAnforderungsMail(opts: {
  project: Pick<Project, "identifier" | "name" | "ag">;
  kind: SecurityKind;
  amount: number;
  referenceNumber: string | null;
}): string {
  const subject = `Rückgabe Sicherheit — ${opts.project.identifier} · ${SECURITY_LABELS[opts.kind]}`;
  const body = [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `bezugnehmend auf das Bauvorhaben ${opts.project.identifier} (${opts.project.name}) bitten wir um die Rückgabe der von uns gestellten ${SECURITY_LABELS[opts.kind]}${
      opts.referenceNumber ? ` (Bürgschafts-Nr. ${opts.referenceNumber})` : ""
    } in Höhe von ${fmtMoney(opts.amount)}.`,
    ``,
    `Der Sicherungszweck ist nach unserem Verständnis weggefallen (${SECURITY_LEGAL_BASIS[opts.kind]}). Eine weitere Verwertung der Bürgschaft ist gem. § 17 Abs. 8 VOB/B nicht zulässig.`,
    ``,
    `Wir bitten um Rücksendung der Original-Bürgschaftsurkunde innerhalb von 14 Tagen.`,
    ``,
    `Mit freundlichen Grüßen`,
  ].join("\n");
  const params = new URLSearchParams({ subject, body });
  return `mailto:?${params.toString()}`;
}

export function SicherheitenSection({
  project,
  securities,
}: {
  project: Project;
  securities: Security[];
}) {
  const annotated = annotateSecurities(securities, project);
  const summary = summarizeSecurities(annotated);

  return (
    <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Sicherheiten
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Bürgschaften & Bareinbehalte
          </h2>
          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
            {summary.activeAmount > 0
              ? `${fmtMoney(summary.activeAmount)} aktiv`
              : "Keine aktiven Sicherheiten"}
            {summary.releasedAmount > 0
              ? ` · ${fmtMoney(summary.releasedAmount)} freigegeben`
              : ""}
            {summary.overdueCount > 0
              ? ` · ${summary.overdueCount} überfällig`
              : ""}
            {summary.expiringCount > 0
              ? ` · ${summary.expiringCount} läuft ab`
              : ""}
          </p>
        </div>
      </div>

      {annotated.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center mb-5">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Sicherheiten erfasst.
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
            Üblich für AN: 5 % Vertragserfüllung bis Abnahme + 5 %
            Mängelansprüche bis Gewährleistungsende.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)] mb-6">
          {annotated.map((s) => (
            <li key={s.id} className="py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[color:var(--color-fg)]">
                      {SECURITY_LABELS[s.kind]}
                    </p>
                    <SecurityStateBadge state={s.state} daysLeft={s.daysLeft} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--color-fg-muted)]">
                      {DIRECTION_LABEL[s.direction]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                    <span className="font-mono text-[color:var(--color-fg)]">
                      {fmtMoney(s.amount)}
                    </span>
                    {s.percentOfContract
                      ? ` · ${s.percentOfContract.toLocaleString("de-DE")} %`
                      : ""}
                    {s.provider ? ` · ${s.provider}` : ""}
                    {s.referenceNumber ? ` · Nr. ${s.referenceNumber}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                    {SECURITY_LEGAL_BASIS[s.kind]}
                    {s.effectiveValidUntil
                      ? ` · gültig bis ${s.effectiveValidUntil}`
                      : " · Geltung wartet auf Lebenszyklus-Ereignis"}
                    {s.releasedAt ? ` · freigegeben am ${s.releasedAt}` : ""}
                  </p>
                  {s.documentPath && s.documentFilename ? (
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                      📎 {s.documentFilename}
                    </p>
                  ) : null}
                  {s.notes && !s.notes.startsWith("[auto-vorgang") ? (
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] italic">
                      {s.notes
                        .split("\n")
                        .filter((l) => !l.startsWith("[auto-vorgang"))
                        .join(" ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.state !== "released" ? (
                    <a
                      href={buildAnforderungsMail({
                        project,
                        kind: s.kind,
                        amount: s.amount,
                        referenceNumber: s.referenceNumber,
                      })}
                      className="text-xs px-2.5 py-1 rounded-full text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] transition-colors"
                      title="Rückgabe anfordern (E-Mail)"
                    >
                      📧 Rückgabe
                    </a>
                  ) : null}
                  <form
                    action={updateSecurityStatus}
                    className="flex items-center gap-1"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <select
                      name="status"
                      defaultValue={s.status}
                      className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] px-2 py-1 transition-colors"
                    >
                      ↻
                    </button>
                  </form>
                  <form action={deleteSecurity}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      aria-label="Sicherheit löschen"
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SecurityForm
        projectId={project.id}
        contractValue={project.value}
        defaultRetentionPercent={project.securityRetentionPercent ?? null}
      />
    </section>
  );
}
