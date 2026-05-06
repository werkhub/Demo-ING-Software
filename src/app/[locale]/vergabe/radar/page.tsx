import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { db, schema } from "@/db";
import { getCurrentWorkspace } from "@/lib/session";
import { parseDisciplines } from "@/lib/workspace/disciplines";
import { TENDER_FEED_ITEMS } from "@/lib/vergabe/feed-mock";
import { RadarClient } from "./radar-client";

export const dynamic = "force-dynamic";

export default async function VergabeRadarPage() {
  const workspace = await getCurrentWorkspace();
  const [watchRows, hiddenRows] = await Promise.all([
    db
      .select({ id: schema.tenderFeedWatch.tenderItemId })
      .from(schema.tenderFeedWatch)
      .where(eq(schema.tenderFeedWatch.workspaceId, workspace.id)),
    db
      .select({ id: schema.tenderFeedHidden.tenderItemId })
      .from(schema.tenderFeedHidden)
      .where(eq(schema.tenderFeedHidden.workspaceId, workspace.id)),
  ]);

  const auto = {
    disciplines: parseDisciplines(workspace.disciplinesJson),
    clientFocus: workspace.clientFocus ?? null,
  };

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Vergabe · Radar · Demo
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Ausschreibungs-Radar
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Kuratierte Treffer aus den großen Vergabe-Plattformen, automatisch
          gefiltert nach den Disziplinen und dem Auftraggeber-Schwerpunkt
          deines Workspaces. Ein Klick übernimmt einen Treffer in die
          Ausschreibungs-Analyse.
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <RadarClient
        items={TENDER_FEED_ITEMS}
        watchedIds={watchRows.map((r) => r.id)}
        hiddenIds={hiddenRows.map((r) => r.id)}
        auto={auto}
      />

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Status
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Demo-Datensatz mit 18 fiktiven Treffern, geformt wie reale
            Plattform-Daten. Refresh randomisiert die Reihenfolge und
            aktualisiert den Zeitstempel — echte Anbindung an TED, DTVP,
            eVergabe, Subreport, Bayern, NRW folgt in Phase 1 (mit
            plattform-konformer Daten-Quelle).
          </p>
        </div>
      </section>
    </Container>
  );
}
