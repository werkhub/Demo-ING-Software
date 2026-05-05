import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  ArKindBadge,
  ArStatusBadge,
} from "@/components/ar-status-badge";
import {
  getAusgangsrechnungenByProject,
  getProjectById,
} from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import { HoaiSchlussButton } from "./hoai-schluss-button";

export const dynamic = "force-dynamic";

export default async function ArProjectListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const [project, workspace] = await Promise.all([
    getProjectById(id),
    getCurrentWorkspace(),
  ]);
  if (!project) notFound();
  const rechnungen = await getAusgangsrechnungenByProject(id);

  // HOAI-Schlussrechnung-Button nur für Ingenieurbüros + bei vollständiger
  // HOAI-Konfig sichtbar.
  const isIngenieurbuero = workspace.workspaceRole === "ingenieurbuero";
  const hoaiKonfigOk =
    !!project.hoaiLeistungsbild &&
    !!project.hoaiHonorarzone &&
    !!project.hoaiAnrechenbareKostenCents &&
    !!project.hoaiBeauftragteLpsJson;
  const hoaiButtonDisabledReason = !hoaiKonfigOk
    ? "HOAI-Konfig am Projekt unvollständig (Leistungsbild, Zone, Kosten, LPs benötigt)."
    : null;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Ausgangsrechnungen
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {isIngenieurbuero ? (
              <HoaiSchlussButton
                projektId={id}
                disabledReason={hoaiButtonDisabledReason}
              />
            ) : null}
            <Link
              href={`/projekte/${id}/ausgangsrechnungen/new`}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + Neue Rechnung
            </Link>
          </div>
        </div>

        {sp.error ? (
          <div className="mt-4 rounded-md border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)] px-4 py-2 text-sm text-[color:var(--color-danger)]">
            {sp.error}
          </div>
        ) : null}
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Abschlags- und Schlussrechnungen mit Aufmaß-Bezug. Rechnungsnummern
          sind workspace-weit fortlaufend und unveränderbar (§ 14 UStG).
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

      {rechnungen.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Rechnungen erstellt.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {rechnungen.map((r) => (
              <li key={r.id} className="py-5">
                <Link
                  href={`/projekte/${id}/ausgangsrechnungen/${r.id}`}
                  className="block group"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm text-[color:var(--color-fg)]">
                          {r.number}
                        </p>
                        <ArKindBadge kind={r.kind} abschlagNo={r.abschlagNo} />
                        <ArStatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                        {r.subjectLine ?? "(ohne Betreff)"}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        Rechnungsdatum {formatDateShort(r.invoiceDate)}
                        {r.dueDate
                          ? ` · fällig ${formatDateShort(r.dueDate)}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-medium">
                        {fmtMoney(r.payoutGross)}
                      </p>
                      {r.paidAmount && r.paidAmount > 0 ? (
                        <p className="font-mono text-[10px] text-[color:var(--color-success)]">
                          {fmtMoney(r.paidAmount)} bezahlt
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
