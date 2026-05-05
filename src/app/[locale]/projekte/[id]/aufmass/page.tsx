import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { AufmassStatusBadge } from "@/components/aufmass-status-badge";
import {
  getAufmasseByProject,
  getLvByProject,
  getProjectById,
} from "@/db/queries";
import { fmtMoney, formatDateShort, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AufmassListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const lv = await getLvByProject(id);
  const aufmasse = await getAufmasseByProject(id);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Aufmaß
          </h1>
          {lv ? (
            <Link
              href={`/projekte/${id}/aufmass/new`}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + Neues Aufmaß
            </Link>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Mengenermittlung der erbrachten Leistung pro LV-Position mit
          REB-23.003-Formelsprache. Snapshot der LV-EP zum Aufmaßzeitpunkt —
          spätere LV-Änderungen wirken sich nicht rückwirkend aus.
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

      {!lv ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg)]">
              Noch kein LV — Aufmaß setzt ein importiertes LV voraus.
            </p>
            <Link
              href={`/projekte/${id}/lv`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              → Zum LV
            </Link>
          </div>
        </section>
      ) : aufmasse.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch kein Aufmaß angelegt.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {aufmasse.map((a) => (
              <li key={a.id} className="py-5">
                <Link
                  href={`/projekte/${id}/aufmass/${a.id}`}
                  className="block group"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                          {a.name}
                        </p>
                        <AufmassStatusBadge status={a.status} />
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {a.periodStart || a.periodEnd ? (
                          <>
                            Periode {formatDateShort(a.periodStart)} —{" "}
                            {formatDateShort(a.periodEnd)} ·{" "}
                          </>
                        ) : null}
                        angelegt {timeAgo(a.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-medium">
                        {fmtMoney(a.totalApprovedNet)}
                      </p>
                      {a.totalNet !== a.totalApprovedNet ? (
                        <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                          Brutto-erfasst {fmtMoney(a.totalNet)}
                        </p>
                      ) : null}
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
