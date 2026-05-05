import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { aggregateNachkalk, NACHKALK_WARN_LABEL } from "@/lib/nachkalk/aggregate";
import { createSnapshotRedirect } from "./actions";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const fmtPct = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(n);

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ snapshot?: string; error?: string }>;

export default async function NachkalkulationPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: projektId } = await params;
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) notFound();

  const [agg, snapshots] = await Promise.all([
    aggregateNachkalk(workspaceId, projektId),
    db
      .select()
      .from(schema.nachkalkulationSnapshots)
      .where(
        and(
          eq(schema.nachkalkulationSnapshots.workspaceId, workspaceId),
          eq(schema.nachkalkulationSnapshots.projektId, projektId)
        )
      )
      .orderBy(desc(schema.nachkalkulationSnapshots.createdAt))
      .limit(10),
  ]);

  const ueberSoll = agg.positionen.filter(
    (p) => p.warning === "kostenueberschreitung"
  ).length;
  const fruehwarnungen = agg.positionen.filter(
    (p) => p.warning === "fruehwarn"
  ).length;
  const dbProzent =
    agg.total.sollNettoCents > 0
      ? agg.total.deckungsbeitragCents / agg.total.sollNettoCents
      : 0;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Projekt {project.identifier} · Nachkalkulation
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Soll-Ist-Vergleich
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Live-Aggregation aus Stunden, Material-Bestellungen und NU-
          Eingangsrechnungen — pro LV-Position. Snapshots persistieren
          historische Stände.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}
      {sp.snapshot ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] px-4 py-3 text-sm text-[color:var(--color-success)]">
          Snapshot erstellt.
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/projekte/${projektId}`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← Projekt
        </Link>
        <form action={createSnapshotRedirect} className="inline">
          <input type="hidden" name="projektId" value={projektId} />
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            📸 Snapshot erstellen
          </button>
        </form>
        <a
          href={`/projekte/${projektId}/nachkalkulation/export`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ↓ CSV-Export
        </a>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard
            label="SOLL netto"
            value={fmtCurrency(agg.total.sollNettoCents)}
          />
          <StatCard
            label="IST gesamt"
            value={fmtCurrency(agg.total.istGesamtCents)}
            tone={
              agg.total.istGesamtCents > agg.total.sollNettoCents
                ? "warning"
                : "default"
            }
          />
          <StatCard
            label="Deckungsbeitrag"
            value={fmtCurrency(agg.total.deckungsbeitragCents)}
            tone={agg.total.deckungsbeitragCents < 0 ? "critical" : "accent"}
            caption={`${fmtPct(dbProzent)} vom SOLL`}
          />
          <StatCard
            label="Fertigstellungsgrad"
            value={fmtPct(agg.fertigstellungsgradPct)}
          />
        </StatGrid4>
      </section>

      <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)]">
        <div className="bg-[color:var(--color-bg)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Lohn-Aufwand
          </p>
          <p className="mt-3 text-2xl font-semibold font-mono">
            {fmtCurrency(agg.total.istLohnCents)}
          </p>
        </div>
        <div className="bg-[color:var(--color-bg)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Material-Aufwand
          </p>
          <p className="mt-3 text-2xl font-semibold font-mono">
            {fmtCurrency(agg.total.istMaterialCents)}
          </p>
        </div>
        <div className="bg-[color:var(--color-bg)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            NU-Aufwand
          </p>
          <p className="mt-3 text-2xl font-semibold font-mono">
            {fmtCurrency(agg.total.istNuCents)}
          </p>
        </div>
      </section>

      {(ueberSoll > 0 || fruehwarnungen > 0) ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-3 text-sm text-[color:var(--color-warning)]">
          {ueberSoll > 0 && (
            <span>
              <strong>{ueberSoll}</strong> LV-Position(en) mit Kostenüberschreitung.{" "}
            </span>
          )}
          {fruehwarnungen > 0 && (
            <span>
              <strong>{fruehwarnungen}</strong> Frühwarnung(en).
            </span>
          )}
        </div>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Soll-Ist je LV-Position ({agg.positionen.length})
        </h2>
        {agg.positionen.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
            Kein LV oder keine Positionen vorhanden. Erst LV importieren.
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">OZ</th>
                  <th className="px-3 py-3 text-left">Bezeichnung</th>
                  <th className="px-3 py-3 text-right">SOLL</th>
                  <th className="px-3 py-3 text-right">Lohn</th>
                  <th className="px-3 py-3 text-right">Material</th>
                  <th className="px-3 py-3 text-right">NU</th>
                  <th className="px-3 py-3 text-right">IST</th>
                  <th className="px-3 py-3 text-right">DB</th>
                  <th className="px-3 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {agg.positionen.map((p) => (
                  <tr
                    key={p.lvItemId}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {p.oz ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 max-w-[28ch] truncate">
                      {p.shortText}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.sollNettoCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {p.istLohnCents > 0 ? fmtCurrency(p.istLohnCents) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {p.istMaterialCents > 0
                        ? fmtCurrency(p.istMaterialCents)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {p.istNuCents > 0 ? fmtCurrency(p.istNuCents) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                      {fmtCurrency(p.istGesamtCents)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-xs ${
                        p.deckungsbeitragCents < 0
                          ? "text-[color:var(--color-critical)]"
                          : ""
                      }`}
                    >
                      {fmtCurrency(p.deckungsbeitragCents)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          p.warning === "kostenueberschreitung"
                            ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
                            : p.warning === "fruehwarn"
                              ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
                              : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
                        }`}
                      >
                        {NACHKALK_WARN_LABEL[p.warning]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {snapshots.length > 0 ? (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Snapshot-History
          </h2>
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Stichtag</th>
                  <th className="px-3 py-3 text-right">SOLL</th>
                  <th className="px-3 py-3 text-right">IST</th>
                  <th className="px-3 py-3 text-right">DB</th>
                  <th className="px-3 py-3 text-right">FG</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-3 py-2.5 font-mono text-xs">{s.stichtag}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(s.sollNettoCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(
                        s.istLohnCents + s.istMaterialCents + s.istNuCents
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-xs ${
                        s.deckungsbeitragCents < 0
                          ? "text-[color:var(--color-critical)]"
                          : ""
                      }`}
                    >
                      {fmtCurrency(s.deckungsbeitragCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtPct(s.fertigstellungsgradPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Container>
  );
}
