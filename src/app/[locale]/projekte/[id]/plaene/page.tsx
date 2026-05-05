import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getPlaeneByProject, getProjectById } from "@/db/queries";
import {
  PLAN_STATUS_LABEL,
  PLAN_TYP_LABEL,
} from "@/lib/plaene";
import { formatDateShort } from "@/lib/utils";
import type { PlanTyp } from "@/db/schema";

export const dynamic = "force-dynamic";

const PLAN_TYPEN: ReadonlyArray<PlanTyp | "all"> = [
  "all",
  "architektur",
  "statik",
  "tga",
  "elektro",
  "sanitaer",
  "detail",
  "sonstiges",
];

export default async function PlaeneListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ typ?: string }>;
}) {
  const { id } = await params;
  const { typ } = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const filter = (PLAN_TYPEN as ReadonlyArray<string>).includes(typ ?? "")
    ? (typ as PlanTyp | "all")
    : "all";
  const plaene = await getPlaeneByProject(id, { planTyp: filter });

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Pläne
          </h1>
          <Link
            href={`/projekte/${id}/plaene/new`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neuer Plan
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Versionierte Plan-Ablage je Projekt mit Freigabe-Workflow. Jede neue
          Version startet die Freigabe von vorn — eine alte Freigabe gilt nicht
          für eine neue Version.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zum Projekt
          </Link>
        </div>
      </section>

      <section className="pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {PLAN_TYPEN.map((t) => {
            const active = filter === t;
            const label =
              t === "all" ? "Alle" : PLAN_TYP_LABEL[t] ?? t;
            const href =
              t === "all"
                ? `/projekte/${id}/plaene`
                : `/projekte/${id}/plaene?typ=${t}`;
            return (
              <Link
                key={t}
                href={href}
                className={
                  "font-mono text-[10px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors " +
                  (active
                    ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] border-[color:var(--color-fg)]"
                    : "border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] hover:border-[color:var(--color-fg)]")
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </section>

      {plaene.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {filter === "all"
                ? "Noch keine Pläne hinterlegt."
                : `Keine Pläne in Kategorie ${PLAN_TYP_LABEL[filter as PlanTyp]}.`}
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {plaene.map((p) => (
              <li key={p.id} className="py-5">
                <Link
                  href={`/projekte/${id}/plaene/${p.id}`}
                  className="block group"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-border)]">
                          {PLAN_TYP_LABEL[p.planTyp] ?? p.planTyp}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-border)]">
                          {PLAN_STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                        {p.planNr} — {p.bezeichnung}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {p.masstab ? `M ${p.masstab} · ` : ""}
                        {p.planerName ? `${p.planerName} · ` : ""}
                        {p.datum ? formatDateShort(p.datum) : "kein Datum"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
