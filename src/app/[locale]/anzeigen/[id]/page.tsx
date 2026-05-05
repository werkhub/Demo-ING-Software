import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { AnzeigeStatusBadge } from "@/components/anzeige-status-badge";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getAnzeige } from "@/db/queries";
import {
  ANZEIGE_KIND_LABEL,
  ANZEIGE_LEGAL_BASIS,
  CAUSED_BY_LABEL,
  CONCERN_ABOUT_LABEL,
  RECIPIENT_ROLE_LABEL,
  uiState,
} from "@/lib/anzeigen";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  deleteAnzeige,
  markAnzeigeAcknowledged,
  markAnzeigeResolved,
  markAnzeigeResponded,
  markAnzeigeSent,
} from "../actions";

export const dynamic = "force-dynamic";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildAnzeigeMail(opts: {
  to: string | null;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({ subject: opts.subject, body: opts.body });
  return `mailto:${opts.to ?? ""}?${params.toString()}`;
}

export default async function AnzeigeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAnzeige(id);
  if (!a) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const [project] = await db
    .select({
      id: schema.projects.id,
      identifier: schema.projects.identifier,
      name: schema.projects.name,
      ag: schema.projects.ag,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, a.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);

  const state = uiState(a);
  const today = todayIso();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {ANZEIGE_KIND_LABEL[a.kind]} · {a.legalBasis}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              {a.title}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] font-mono">
              {project
                ? `${project.identifier} · ${project.name}`
                : "Projekt entfernt"}
              {a.recipientName ? ` · an ${a.recipientName}` : ""}
              {a.recipientRole
                ? ` (${RECIPIENT_ROLE_LABEL[a.recipientRole]})`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AnzeigeStatusBadge state={state} size="md" />
            <Link
              href="/anzeigen"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zurück zur Übersicht
            </Link>
          </div>
        </div>
      </section>

      {state === "wartet_zugang_ueberfaellig" ? (
        <section className="pb-6">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
              Zugangsbestätigung überfällig
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-fg)]">
              Versand am {formatDateShort(a.sentAt)}, bisher keine Bestätigung
              eingegangen. Beweissicherung: jetzt schriftlich nachfassen.
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-2">
              Sachverhalt
            </p>
            <p className="text-sm text-[color:var(--color-fg)] whitespace-pre-wrap leading-relaxed">
              {a.subjectMatter}
            </p>
          </div>
          <div className="space-y-4">
            {a.kind === "behinderung" ? (
              <>
                <Fact label="Ursache">
                  {a.causedBy ? CAUSED_BY_LABEL[a.causedBy] : "—"}
                </Fact>
                <Fact label="Beginn">{formatDateShort(a.obstructionStart)}</Fact>
                <Fact label="Dauer (Werktage)">
                  {a.estimatedDurationDays !== null
                    ? a.estimatedDurationDays
                    : "—"}
                </Fact>
                <Fact label="Mehrkosten (€ netto)">
                  {a.estimatedExtraCost !== null
                    ? fmtMoney(a.estimatedExtraCost)
                    : "—"}
                </Fact>
              </>
            ) : (
              <>
                <Fact label="Bedenken-Gegenstand">
                  {a.concernAbout ? CONCERN_ABOUT_LABEL[a.concernAbout] : "—"}
                </Fact>
                <Fact label="Mögliche Folgen">{a.potentialDamage ?? "—"}</Fact>
                <Fact label="Lösungsvorschlag">{a.proposedSolution ?? "—"}</Fact>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Volltext
        </p>
        <div className="bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-5 text-sm font-mono leading-relaxed whitespace-pre-wrap">
          {a.bodyMarkdown}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={buildAnzeigeMail({
              to: a.recipientEmail,
              subject: `${ANZEIGE_KIND_LABEL[a.kind]} — ${a.title}`,
              body: a.bodyMarkdown,
            })}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            📧 Per E-Mail versenden
          </a>
          <Link
            href={`/anzeigen/${a.id}/print`}
            target="_blank"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors px-3 py-1.5"
          >
            🖨 Druckansicht ↗
          </Link>
          {a.status === "entwurf" ? (
            <Link
              href={`/anzeigen/${a.id}/edit`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors px-3 py-1.5"
            >
              ✎ Entwurf bearbeiten
            </Link>
          ) : null}
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
          Workflow
        </p>

        <div className="space-y-3">
          {/* Step 1: Versand */}
          <WorkflowStep
            done={!!a.sentAt}
            label="Versendet am"
            value={a.sentAt ? formatDateShort(a.sentAt) : null}
          >
            {a.status === "entwurf" ? (
              <form action={markAnzeigeSent} className="flex items-center gap-2">
                <input type="hidden" name="id" value={a.id} />
                <input
                  type="date"
                  name="sentAt"
                  defaultValue={today}
                  required
                  className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                >
                  Als versendet markieren
                </button>
              </form>
            ) : null}
          </WorkflowStep>

          {/* Step 2: Zugang */}
          <WorkflowStep
            done={!!a.acknowledgedAt}
            label="Zugang bestätigt am"
            value={a.acknowledgedAt ? formatDateShort(a.acknowledgedAt) : null}
            warning={state === "wartet_zugang_ueberfaellig"}
          >
            {a.status === "versendet" ? (
              <form
                action={markAnzeigeAcknowledged}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="id" value={a.id} />
                <input
                  type="date"
                  name="acknowledgedAt"
                  defaultValue={today}
                  required
                  className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                >
                  Zugang bestätigt
                </button>
              </form>
            ) : null}
          </WorkflowStep>

          {/* Step 3: Antwort / Reaktion */}
          <WorkflowStep
            done={!!a.responseReceivedAt}
            label="Antwort eingegangen am"
            value={
              a.responseReceivedAt ? formatDateShort(a.responseReceivedAt) : null
            }
          >
            {a.status === "versendet" || a.status === "bestaetigt" ? (
              <form
                action={markAnzeigeResponded}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={a.id} />
                <input
                  type="date"
                  name="responseReceivedAt"
                  defaultValue={today}
                  required
                  className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                />
                <input
                  type="text"
                  name="responseSummary"
                  placeholder="Kurze Zusammenfassung der AG-Antwort"
                  maxLength={5000}
                  className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 focus:border-[color:var(--color-accent)] focus:outline-none flex-1 min-w-[240px]"
                />
                <label className="text-xs flex items-center gap-1.5 text-[color:var(--color-fg-muted)]">
                  <input type="checkbox" name="rejected" value="true" />
                  Zurückweisung
                </label>
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                >
                  Antwort erfassen
                </button>
              </form>
            ) : a.responseSummary ? (
              <p className="text-xs text-[color:var(--color-fg-muted)] italic">
                „{a.responseSummary}"
              </p>
            ) : null}
          </WorkflowStep>

          {/* Step 4: Erledigung */}
          <WorkflowStep
            done={a.status === "erledigt"}
            label="Status"
            value={
              a.status === "erledigt"
                ? "Erledigt"
                : a.status === "zurueckgewiesen"
                  ? "Zurückgewiesen — wartet auf Folgeentscheidung"
                  : null
            }
          >
            {a.status === "bestaetigt" || a.status === "zurueckgewiesen" ? (
              <form action={markAnzeigeResolved}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                >
                  Als erledigt markieren
                </button>
              </form>
            ) : null}
          </WorkflowStep>
        </div>
      </section>

      {a.notes && !a.notes.startsWith("[auto-vorgang") ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Interne Notizen
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
            {a.notes
              .split("\n")
              .filter((l) => !l.startsWith("[auto-vorgang"))
              .join("\n")}
          </p>
        </section>
      ) : null}

      {a.status === "entwurf" ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
          <form action={deleteAnzeige}>
            <input type="hidden" name="id" value={a.id} />
            <button
              type="submit"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Entwurf löschen
            </button>
          </form>
          <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
            Versendete Anzeigen bleiben dauerhaft erhalten (Beweissicherung).
          </p>
        </section>
      ) : null}
    </Container>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-[color:var(--color-fg)]">
        {children}
      </div>
    </div>
  );
}

function WorkflowStep({
  done,
  label,
  value,
  warning,
  children,
}: {
  done: boolean;
  label: string;
  value: string | null;
  warning?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={
        "flex items-start gap-3 p-3 rounded-md border " +
        (warning
          ? "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)]/30"
          : done
            ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)]/30"
            : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)]")
      }
    >
      <span
        className={
          "mt-0.5 inline-grid place-items-center w-5 h-5 rounded-full text-[11px] font-mono " +
          (done
            ? "bg-[color:var(--color-success)] text-[color:var(--color-bg)]"
            : "bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border)]")
        }
      >
        {done ? "✓" : "·"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[color:var(--color-fg-muted)] font-mono uppercase tracking-[0.12em]">
          {label}
        </div>
        {value ? (
          <div className="mt-0.5 text-sm text-[color:var(--color-fg)] font-medium">
            {value}
          </div>
        ) : null}
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}
