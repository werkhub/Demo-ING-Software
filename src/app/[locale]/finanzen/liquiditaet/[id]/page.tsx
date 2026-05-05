import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  findEngeLiquiditaet,
  summarize,
} from "@/lib/liquiditaet/forecast";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Params = Promise<{ id: string }>;

export default async function LiquiditaetDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [szenario] = await db
    .select()
    .from(schema.liquiditaetSzenarien)
    .where(
      and(
        eq(schema.liquiditaetSzenarien.id, id),
        eq(schema.liquiditaetSzenarien.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!szenario) notFound();

  const rows = await db
    .select()
    .from(schema.liquiditaetZeitreihe)
    .where(eq(schema.liquiditaetZeitreihe.szenarioId, id))
    .orderBy(asc(schema.liquiditaetZeitreihe.datum));

  const summary = summarize(rows);
  const warning = findEngeLiquiditaet(rows, 14);

  // Tabellen-Filter: nur Tage mit Bewegung anzeigen
  const interestingRows = rows.filter(
    (r) => r.einnahmenCents > 0 || r.ausgabenCents > 0
  );

  // Sparkline-Daten — alle Punkte, normalisiert
  const minK = summary.kontostandMin;
  const maxK = summary.kontostandMax;
  const range = Math.max(1, maxK - minK);
  const sparkW = 600;
  const sparkH = 80;
  const points = rows.map((r, i) => {
    const x = (i / Math.max(1, rows.length - 1)) * sparkW;
    const y = sparkH - ((r.kontostandCents - minK) / range) * sparkH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · Liquidität
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {szenario.name}
        </h1>
        <p className="mt-2 text-base text-[color:var(--color-fg-muted)]">
          Basis: {szenario.basisdatum} · Horizont: {szenario.horizontTage} Tage ·
          Start-Saldo: {fmtCurrency(szenario.kontostandStartCents)}
        </p>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/finanzen/liquiditaet"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← Liste
        </Link>
        <Link
          href="/finanzen/liquiditaet/new"
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Neues Szenario
        </Link>
      </section>

      {warning ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          <strong>Liquiditäts-Engpass:</strong> Am {warning.datum} (in{" "}
          {warning.daysFromBasis} Tagen) sinkt der Kontostand auf{" "}
          {fmtCurrency(warning.kontostandCents)}. Maßnahme erforderlich.
        </div>
      ) : null}

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard
            label="Einnahmen Forecast"
            value={fmtCurrency(summary.einnahmenSumme)}
          />
          <StatCard
            label="Ausgaben Forecast"
            value={fmtCurrency(summary.ausgabenSumme)}
            tone={summary.ausgabenSumme > summary.einnahmenSumme ? "warning" : "default"}
          />
          <StatCard
            label="Kontostand min"
            value={fmtCurrency(summary.kontostandMin)}
            tone={summary.kontostandMin <= 0 ? "critical" : "default"}
          />
          <StatCard
            label="Kontostand Ende"
            value={fmtCurrency(summary.kontostandEnde)}
            tone="accent"
          />
        </StatGrid4>
      </section>

      {/* Sparkline */}
      {rows.length > 0 ? (
        <section className="mb-8 border border-[color:var(--color-border)] rounded-md p-6 bg-[color:var(--color-bg-subtle)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
            Kontostand-Verlauf
          </p>
          <svg
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            className="w-full h-20"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1={sparkH - ((0 - minK) / range) * sparkH}
              x2={sparkW}
              y2={sparkH - ((0 - minK) / range) * sparkH}
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              points={points.join(" ")}
            />
          </svg>
          <p className="mt-2 flex justify-between text-[10px] font-mono text-[color:var(--color-fg-muted)]">
            <span>{rows[0].datum}</span>
            <span>{rows[rows.length - 1].datum}</span>
          </p>
        </section>
      ) : null}

      {/* Bewegungstabelle */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bewegungen ({interestingRows.length} von {rows.length} Tagen)
        </h2>
        {interestingRows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
            Keine Bewegungen im Forecast-Zeitraum.
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Datum</th>
                  <th className="px-3 py-3 text-right">Einnahmen</th>
                  <th className="px-3 py-3 text-right">Ausgaben</th>
                  <th className="px-3 py-3 text-right">Saldo</th>
                  <th className="px-3 py-3 text-right">Kontostand</th>
                  <th className="px-3 py-3 text-left">Quelle</th>
                </tr>
              </thead>
              <tbody>
                {interestingRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{r.datum}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-success)]">
                      {r.einnahmenCents > 0 ? fmtCurrency(r.einnahmenCents) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-critical)]">
                      {r.ausgabenCents > 0 ? fmtCurrency(r.ausgabenCents) : "—"}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-xs ${
                        r.saldoCents > 0
                          ? "text-[color:var(--color-success)]"
                          : r.saldoCents < 0
                            ? "text-[color:var(--color-critical)]"
                            : "text-[color:var(--color-fg-muted)]"
                      }`}
                    >
                      {fmtCurrency(r.saldoCents)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-xs ${
                        r.kontostandCents <= 0
                          ? "text-[color:var(--color-critical)] font-semibold"
                          : ""
                      }`}
                    >
                      {fmtCurrency(r.kontostandCents)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[color:var(--color-fg-muted)]">
                      {r.kommentar ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {szenario.notes ? (
        <p className="mt-6 text-sm text-[color:var(--color-fg-muted)] whitespace-pre-line">
          {szenario.notes}
        </p>
      ) : null}
    </Container>
  );
}
