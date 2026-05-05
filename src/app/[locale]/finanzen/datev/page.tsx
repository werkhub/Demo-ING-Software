import { Link } from "@/i18n/navigation";
import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspace, getCurrentWorkspaceId } from "@/lib/session";
import { DeleteExportButton } from "./delete-button";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const ART_LABEL: Record<string, string> = {
  verkauf: "Verkauf",
  einkauf_nu: "NU-Einkauf",
  lohn: "Lohn",
};

type SearchParams = Promise<{ created?: string; error?: string }>;

export default async function DatevExportListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const [workspaceId, workspace] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspace(),
  ]);

  const exports_ = await db
    .select()
    .from(schema.datevExports)
    .where(eq(schema.datevExports.workspaceId, workspaceId))
    .orderBy(desc(schema.datevExports.createdAt));

  const totalSumCents = exports_.reduce((s, x) => s + x.summeCents, 0);
  const totalBuchungen = exports_.reduce(
    (s, x) => s + x.anzahlBuchungen,
    0
  );

  const datevConfigured =
    workspace.datevBeraterNr !== null &&
    workspace.datevBeraterNr !== undefined &&
    workspace.datevMandantNr !== null &&
    workspace.datevMandantNr !== undefined;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · DATEV-Export
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          DATEV-Buchungsstapel
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          EXTF-Format (Buchungsstapel v7) für DATEV-Import. ANSI/CP1252-encoded,
          SKR03 oder SKR04. Exportiert Verkauf (ARs) und Lohn (Stunden
          monatlich aggregiert).
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}
      {sp.created ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] px-4 py-3 text-sm text-[color:var(--color-success)]">
          Export erstellt. Download in der Liste unten.
        </div>
      ) : null}

      {!datevConfigured ? (
        <section className="mb-8 border border-dashed border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] rounded-md p-6">
          <p className="text-sm text-[color:var(--color-warning)] font-semibold">
            DATEV-Stammdaten unvollständig
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
            Berater-Nr. und Mandant-Nr. müssen in den Workspace-Einstellungen
            gesetzt sein, bevor Exporte möglich sind.
          </p>
          <Link
            href="/workspace#datev"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            → Workspace konfigurieren
          </Link>
        </section>
      ) : null}

      <section className="mb-6 flex items-center gap-3">
        <Link
          href="/finanzen/datev/new"
          className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
            datevConfigured
              ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white"
              : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] cursor-not-allowed pointer-events-none"
          }`}
        >
          + Neuer Export
        </Link>
        <span className="text-xs text-[color:var(--color-fg-muted)]">
          Berater-Nr. {workspace.datevBeraterNr ?? "—"} · Mandant-Nr.{" "}
          {workspace.datevMandantNr ?? "—"} · Kontenrahmen{" "}
          {(workspace.datevKontenrahmen ?? "skr03").toUpperCase()}
        </span>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label="Exporte" value={exports_.length} />
          <StatCard label="Buchungen total" value={totalBuchungen} />
          <StatCard
            label="Volumen"
            value={fmtCurrency(totalSumCents)}
            tone="accent"
          />
          <StatCard
            label="Letzter Export"
            value={
              exports_[0]?.createdAt
                ? exports_[0].createdAt.toLocaleDateString("de-DE")
                : "—"
            }
          />
        </StatGrid4>
      </section>

      {exports_.length === 0 ? (
        <section className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Exporte erstellt.
          </p>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Datum</th>
                <th className="px-3 py-3 text-left">Art</th>
                <th className="px-3 py-3 text-left">Zeitraum</th>
                <th className="px-3 py-3 text-left">SKR</th>
                <th className="px-3 py-3 text-right">Buchungen</th>
                <th className="px-3 py-3 text-right">Summe</th>
                <th className="px-3 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {exports_.map((x) => (
                <tr
                  key={x.id}
                  className="border-t border-[color:var(--color-border)]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                    {x.createdAt.toLocaleDateString("de-DE")}{" "}
                    {x.createdAt.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5">{ART_LABEL[x.art] ?? x.art}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {x.zeitraumVon} – {x.zeitraumBis}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs uppercase">
                    {x.kontenrahmen}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {x.anzahlBuchungen}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {fmtCurrency(x.summeCents)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/datev/${x.id}/download`}
                        className="rounded-full bg-[color:var(--color-fg)] px-3 py-1 text-[10px] uppercase tracking-wider text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                      >
                        Download
                      </a>
                      <DeleteExportButton id={x.id} />
                    </div>
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
