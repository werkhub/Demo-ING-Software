import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  AbnahmeKindBadge,
  BeurteilungBadge,
} from "@/components/abnahme-state-badge";
import { PrioritaetBadge } from "@/components/prioritaet-badge";
import {
  getAbnahme,
  getMaengelByAbnahme,
  getProjectById,
} from "@/db/queries";
import {
  ABNAHME_KIND_LEGAL_BASIS,
  computeWarrantyEnd,
  parseAttendees,
  vertragsstrafeAtRisk,
} from "@/lib/abnahme";
import {
  MANGEL_STATUS_LABEL,
  daysUntilFrist,
  mangelDeadlineState,
  mangelTitle,
} from "@/lib/maengel";
import { formatDateShort } from "@/lib/utils";
import { MangelForm } from "../mangel-form";
import {
  deleteAbnahme,
  deleteMangel,
  updateMangelStatus,
} from "../abnahme-actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "behoben", label: "Behoben" },
  { value: "abgelehnt", label: "Abgelehnt" },
  { value: "strittig", label: "Strittig" },
];

const DEADLINE_TONE: Record<string, string> = {
  ok: "text-[color:var(--color-fg-muted)]",
  expiring: "text-[color:var(--color-warning)]",
  overdue: "text-[color:var(--color-critical)] font-semibold",
  done: "text-[color:var(--color-fg-muted)] line-through",
};

export default async function AbnahmeDetailPage({
  params,
}: {
  params: Promise<{ id: string; abnahmeId: string }>;
}) {
  const { id, abnahmeId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const abnahme = await getAbnahme(abnahmeId);
  if (!abnahme) notFound();
  if (abnahme.projectId !== project.id) notFound();

  const maengel = await getMaengelByAbnahme(abnahmeId);
  const attendees = parseAttendees(abnahme.attendees);
  const vsRisk = vertragsstrafeAtRisk({
    kind: abnahme.kind,
    vertragsstrafeAgreed: abnahme.vertragsstrafeAgreed,
    vertragsstrafeReserved: abnahme.vertragsstrafeReserved,
  });

  const warranty = computeWarrantyEnd(
    abnahme.abnahmeDate,
    project.contractType
  );

  const overdueCount = maengel.filter(
    (m) => mangelDeadlineState(m) === "overdue"
  ).length;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              Abnahme am {formatDateShort(abnahme.abnahmeDate)}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {ABNAHME_KIND_LEGAL_BASIS[abnahme.kind]}
              {abnahme.abnahmeOrt ? ` · ${abnahme.abnahmeOrt}` : ""}
              {abnahme.scope ? ` · ${abnahme.scope}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <AbnahmeKindBadge kind={abnahme.kind} size="md" />
              <BeurteilungBadge
                beurteilung={abnahme.gesamtbeurteilung}
                size="md"
              />
            </div>
            <Link
              href={`/projekte/${id}/abnahme`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zurück zur Liste
            </Link>
          </div>
        </div>
      </section>

      {vsRisk ? (
        <section className="pb-6">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
              Vertragsstrafe verfällt — § 11 Abs. 4 VOB/B
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-fg)]">
              Die Vertragsstrafe wurde vereinbart, bei dieser Abnahme aber
              <strong> nicht vorbehalten</strong>. Sie verfällt unwiderruflich.
              Ein kritischer Vorgang wurde angelegt.
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          <Tile label="Abnahme-Datum" value={formatDateShort(abnahme.abnahmeDate)} />
          <Tile
            label="Gewährleistung bis"
            value={
              warranty
                ? formatDateShort(warranty)
                : project.contractType
                  ? "—"
                  : "Vertragstyp fehlt"
            }
            subtitle={
              project.contractType === "vob_vertrag"
                ? "§ 13 Abs. 4 VOB/B · 4 J."
                : project.contractType
                  ? "§ 634a BGB · 5 J."
                  : undefined
            }
          />
          <Tile
            label="Mängel"
            value={
              maengel.length === 0
                ? "0"
                : `${maengel.length} (${overdueCount} überfällig)`
            }
            tone={overdueCount > 0 ? "critical" : "default"}
          />
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Teilnehmer
            </p>
            {attendees.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-muted)] italic">
                Keine Teilnehmer erfasst.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {attendees.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    <span className="font-medium text-[color:var(--color-fg)]">
                      {p.name}
                    </span>
                    {p.role ? (
                      <span className="text-[color:var(--color-fg-muted)]">
                        {" "}
                        · {p.role}
                      </span>
                    ) : null}
                    {p.signed ? (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-success)]">
                        ✓ unterschrieben
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Vertragsstrafe & Übergabe
            </p>
            <dl className="space-y-2 text-sm">
              <Row
                label="Vertragsstrafe vereinbart"
                value={abnahme.vertragsstrafeAgreed ? "Ja" : "Nein"}
              />
              {abnahme.vertragsstrafeAgreed ? (
                <Row
                  label="Vorbehalt erklärt"
                  value={
                    abnahme.vertragsstrafeReserved ? (
                      <span className="text-[color:var(--color-success)]">
                        Ja
                      </span>
                    ) : (
                      <span className="text-[color:var(--color-critical)]">
                        Nein — verfällt!
                      </span>
                    )
                  }
                />
              ) : null}
              <Row
                label="Übergabeunterlagen"
                value={
                  abnahme.handoverComplete ? "Vollständig" : "Unvollständig"
                }
              />
            </dl>
            {abnahme.vertragsstrafeReservationText ? (
              <div className="mt-3 border-l-2 border-[color:var(--color-success)] pl-3 py-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                  Wortlaut Vorbehalt
                </p>
                <p className="text-xs text-[color:var(--color-fg-muted)] italic mt-0.5 whitespace-pre-wrap">
                  „{abnahme.vertragsstrafeReservationText}"
                </p>
              </div>
            ) : null}
            {abnahme.handoverNotes ? (
              <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] italic">
                {abnahme.handoverNotes}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
              Mängelliste
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {maengel.length === 0
                ? "Keine Mängel"
                : `${maengel.length} Mangel${maengel.length > 1 ? "/Mängel" : ""}`}
            </h2>
          </div>
        </div>

        {maengel.length > 0 ? (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)] mb-6">
            {maengel.map((m) => {
              const dl = mangelDeadlineState(m);
              const days = daysUntilFrist(m);
              const headLine = mangelTitle(m);
              const restLines = m.beschreibung.split("\n").slice(1).join("\n");
              return (
                <li key={m.id} className="py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[color:var(--color-fg)]">
                          {headLine}
                        </p>
                        <PrioritaetBadge prioritaet={m.prioritaet} />
                        {dl === "overdue" ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]">
                            ⚠ {days !== null ? Math.abs(days) : 0} T überfällig
                          </span>
                        ) : null}
                        {dl === "expiring" ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]">
                            in {days} T
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {m.kategorie ? `${m.kategorie} · ` : ""}
                        {m.ortImBauwerk ? `${m.ortImBauwerk} · ` : ""}
                        {m.fristsetzungDatum ? (
                          <span className={DEADLINE_TONE[dl]}>
                            Frist {formatDateShort(m.fristsetzungDatum)}
                          </span>
                        ) : (
                          "keine Frist"
                        )}
                        {m.behobenAm
                          ? ` · behoben am ${formatDateShort(m.behobenAm)}`
                          : ""}
                      </p>
                      {restLines ? (
                        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
                          {restLines}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <form
                        action={updateMangelStatus}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <select
                          name="status"
                          defaultValue={m.status}
                          className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 focus:border-[color:var(--color-accent)] focus:outline-none"
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
                      <form action={deleteMangel}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          aria-label="Mangel löschen"
                          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </div>
                  {m.status !== "offen" ? (
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-fg-muted)]">
                      {MANGEL_STATUS_LABEL[m.status]}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        <MangelForm abnahmeId={abnahme.id} />
      </section>

      {abnahme.notes && !abnahme.notes.startsWith("[auto-vorgang") ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Interne Notizen
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
            {abnahme.notes
              .split("\n")
              .filter((l) => !l.startsWith("[auto-vorgang"))
              .join("\n")}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-6 pb-16 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`/projekte/${id}/abnahme/${abnahmeId}/print`}
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            🖨 Druck-Protokoll ↗
          </Link>
        </div>
        <form action={deleteAbnahme}>
          <input type="hidden" name="id" value={abnahme.id} />
          <button
            type="submit"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
          >
            Abnahme löschen
          </button>
        </form>
      </section>
    </Container>
  );
}

function Tile({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "critical";
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold tracking-tight ${
          tone === "critical"
            ? "text-[color:var(--color-critical)]"
            : "text-[color:var(--color-fg)]"
        }`}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[color:var(--color-fg)]">{value}</dd>
    </div>
  );
}
