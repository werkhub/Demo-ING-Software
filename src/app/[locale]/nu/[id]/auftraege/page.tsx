import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  NU_AUFTRAG_STATUS_LABEL,
  NU_VERTRAGSTYP_LABEL,
} from "@/lib/nu-operations";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Params = Promise<{ id: string }>;

export default async function NuAuftraegeListPage({ params }: { params: Params }) {
  const { id: nuId } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [nu] = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, nuId),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!nu) notFound();

  const auftraege = await db
    .select()
    .from(schema.nuAuftraege)
    .where(
      and(
        eq(schema.nuAuftraege.workspaceId, workspaceId),
        eq(schema.nuAuftraege.nuId, nuId)
      )
    )
    .orderBy(desc(schema.nuAuftraege.auftragsdatum));

  // Aggregierte Stats: Gesamt-Volumen + offene + laufende
  const total = auftraege.reduce((s, a) => s + a.auftragssummeNettoCents, 0);
  const laufend = auftraege.filter((a) => a.status === "laufend").length;
  const fertig = auftraege.filter((a) => a.status === "fertig").length;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          NU · {nu.name}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Aufträge
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Operative Auftragsabwicklung: Vertrags-Konditionen, Eingangsrechnungen,
          Sicherheits-Konto.
        </p>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/nu/${nuId}`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← Zurück zum NU-Detail
        </Link>
        <Link
          href={`/nu/${nuId}/auftraege/new`}
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Neuer Auftrag
        </Link>
        <Link
          href={`/nu/${nuId}/sicherheiten`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          Sicherheits-Konto
        </Link>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label="Aufträge" value={auftraege.length} />
          <StatCard label="Laufend" value={laufend} />
          <StatCard label="Fertig" value={fertig} />
          <StatCard label="Volumen netto" value={fmtCurrency(total)} tone="accent" />
        </StatGrid4>
      </section>

      {auftraege.length === 0 ? (
        <section className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Aufträge angelegt.
          </p>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Auftrags-Nr.</th>
                <th className="px-3 py-3 text-left">Datum</th>
                <th className="px-3 py-3 text-left">Gewerk</th>
                <th className="px-3 py-3 text-left">Vertragstyp</th>
                <th className="px-3 py-3 text-right">Summe netto</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {auftraege.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    <Link
                      href={`/nu/${nuId}/auftraege/${a.id}`}
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      {a.auftragsnr}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                    {a.auftragsdatum}
                  </td>
                  <td className="px-3 py-2.5">{a.gewerk ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {NU_VERTRAGSTYP_LABEL[a.vertragstyp]}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {fmtCurrency(a.auftragssummeNettoCents)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </Container>
  );
}

function StatusBadge({ status }: { status: keyof typeof NU_AUFTRAG_STATUS_LABEL }) {
  const tone =
    status === "laufend"
      ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]"
      : status === "fertig"
        ? "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
        : status === "gekuendigt"
          ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
          : "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      {NU_AUFTRAG_STATUS_LABEL[status]}
    </span>
  );
}
