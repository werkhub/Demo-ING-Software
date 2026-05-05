import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { PrioritaetBadge } from "@/components/prioritaet-badge";
import { getMaengelByProject, getProjectById } from "@/db/queries";
import {
  GEWAEHRLEISTUNG_WARN_DAYS,
  MANGEL_PHASE_LABEL,
  MANGEL_STATUS_LABEL,
  daysUntilFrist,
  daysUntilGewaehrleistungEnd,
  gewaehrleistungEndState,
  mangelDeadlineState,
  mangelTitle,
} from "@/lib/maengel";
import { formatDateShort } from "@/lib/utils";
import type { MangelPhase, MangelStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

const PHASE_ORDER: MangelPhase[] = ["ausfuehrung", "abnahme", "gewaehrleistung"];

const STATUS_TONE: Record<MangelStatus, string> = {
  offen:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  in_bearbeitung:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  strittig:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  abgelehnt:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  behoben:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
};

function isMangelPhase(value: string | undefined): value is MangelPhase {
  return value === "ausfuehrung" || value === "abnahme" || value === "gewaehrleistung";
}

export default async function MaengelListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { id } = await params;
  const { phase: phaseRaw } = await searchParams;
  const phase = isMangelPhase(phaseRaw) ? phaseRaw : null;

  const project = await getProjectById(id);
  if (!project) notFound();

  const maengel = await getMaengelByProject(id, { phase });
  const gwlState = gewaehrleistungEndState(project);
  const gwlDays = daysUntilGewaehrleistungEnd(project);

  const counts = {
    total: maengel.length,
    offen: maengel.filter((m) => m.status === "offen").length,
    inBearbeitung: maengel.filter((m) => m.status === "in_bearbeitung").length,
    strittig: maengel.filter((m) => m.status === "strittig").length,
    behoben: maengel.filter((m) => m.status === "behoben").length,
  };

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Mängel
          </h1>
          <Link
            href={`/projekte/${id}/maengel/new${phase ? `?phase=${phase}` : ""}`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neuer Mangel
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Lifecycle-Verwaltung über alle Phasen — Bauausführung (§ 4 Abs. 7
          VOB/B), Abnahme (§ 12 VOB/B) und Gewährleistung (§ 13 Abs. 4 VOB/B
          / § 634a BGB).
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
        </div>
      </section>

      {project.warrantyEnd && gwlState !== "ok" ? (
        <section className="pb-6">
          <div
            className={
              "border rounded-md p-4 " +
              (gwlState === "expired"
                ? "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)]"
                : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)]")
            }
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
              Gewährleistung —{" "}
              {project.contractType === "vob_vertrag"
                ? "§ 13 Abs. 4 VOB/B"
                : "§ 634a BGB"}
            </p>
            <p className="mt-1 text-sm">
              {gwlState === "expired"
                ? `Verjährung am ${formatDateShort(project.warrantyEnd)} bereits eingetreten — Mängelansprüche nicht mehr geltend zu machen.`
                : `Endet am ${formatDateShort(project.warrantyEnd)} (in ${gwlDays} Tagen). Vorlauf: ${GEWAEHRLEISTUNG_WARN_DAYS} Tage.`}
            </p>
          </div>
        </section>
      ) : null}

      <section className="pb-6 flex items-center gap-2 flex-wrap">
        <PhaseFilter
          projectId={id}
          active={phase}
          counts={{ total: counts.total }}
        />
      </section>

      <section className="pb-6">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-5">
          <Stat label="Gesamt" value={counts.total} />
          <Stat label="Offen" value={counts.offen} tone="warning" />
          <Stat label="In Bearb." value={counts.inBearbeitung} />
          <Stat label="Strittig" value={counts.strittig} tone="critical" />
          <Stat label="Behoben" value={counts.behoben} />
        </div>
      </section>

      {maengel.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {phase
                ? `Noch kein Mangel in der Phase ${MANGEL_PHASE_LABEL[phase]}.`
                : "Noch kein Mangel erfasst."}
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {maengel.map((m) => {
              const dl = mangelDeadlineState(m);
              const days = daysUntilFrist(m);
              const headLine = mangelTitle(m);
              return (
                <li key={m.id} className="py-5">
                  <Link
                    href={`/projekte/${id}/maengel/${m.id}`}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]">
                            {MANGEL_PHASE_LABEL[m.phase]}
                          </span>
                          <PrioritaetBadge prioritaet={m.prioritaet} />
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[m.status]}`}
                          >
                            {MANGEL_STATUS_LABEL[m.status]}
                          </span>
                          {dl === "overdue" ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]">
                              ⚠ {days !== null ? Math.abs(days) : 0} T überfällig
                            </span>
                          ) : null}
                          {dl === "expiring" ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]">
                              Frist in {days} T
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                          {headLine}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          gemeldet {formatDateShort(m.gemeldetAm)}
                          {m.gemeldetVon ? ` · ${m.gemeldetVon}` : ""}
                          {m.kategorie ? ` · ${m.kategorie}` : ""}
                          {m.ortImBauwerk ? ` · ${m.ortImBauwerk}` : ""}
                          {m.fristsetzungDatum
                            ? ` · Frist ${formatDateShort(m.fristsetzungDatum)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}

function PhaseFilter({
  projectId,
  active,
  counts,
}: {
  projectId: string;
  active: MangelPhase | null;
  counts: { total: number };
}) {
  return (
    <>
      <FilterLink
        href={`/projekte/${projectId}/maengel`}
        active={active === null}
        label={`Alle (${counts.total})`}
      />
      {PHASE_ORDER.map((p) => (
        <FilterLink
          key={p}
          href={`/projekte/${projectId}/maengel?phase=${p}`}
          active={active === p}
          label={MANGEL_PHASE_LABEL[p]}
        />
      ))}
    </>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "text-xs px-3 py-1.5 rounded-full border transition-colors " +
        (active
          ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] border-[color:var(--color-fg)]"
          : "border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]")
      }
    >
      {label}
    </Link>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={
          "mt-1 text-xl font-semibold tracking-tight " +
          (tone === "critical"
            ? "text-[color:var(--color-critical)]"
            : tone === "warning"
              ? "text-[color:var(--color-warning)]"
              : "text-[color:var(--color-fg)]")
        }
      >
        {value}
      </p>
    </div>
  );
}
