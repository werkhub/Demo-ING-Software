import { Container } from "@/components/container";
import { getCurrentWorkspace, getCurrentWorkspaceId } from "@/lib/session";
import {
  formatDateLong,
  greetingForHour,
} from "@/lib/utils";
import {
  formatDays,
  formatEur,
  formatPercent,
  getAllGfKpis,
  trendPercent,
} from "@/lib/kpi";
import { KpiCard } from "./KpiCard";

export async function GfDashboardView() {
  const [workspace, workspaceId] = await Promise.all([
    getCurrentWorkspace(),
    getCurrentWorkspaceId(),
  ]);
  const kpis = await getAllGfKpis(workspaceId);

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatDateLong(now);

  const auftragsbestandValue =
    kpis.auftragsbestand.value === null
      ? null
      : formatEur(kpis.auftragsbestand.value);

  const wcValue =
    kpis.workingCapital.value === null
      ? null
      : formatEur(kpis.workingCapital.value);

  const sicherheitenValue =
    kpis.sicherheitenVolumen.value === null
      ? null
      : formatEur(kpis.sicherheitenVolumen.value);

  const dso = kpis.forderungslaufzeit;
  const dsoValue = dso.value === null ? null : formatDays(dso.value);
  const dsoTrend = trendPercent(dso.value, dso.previous);

  const mq = kpis.maengelquote;
  const mqValue =
    mq.value === null
      ? null
      : `${(Math.round(mq.value * 100) / 100).toString().replace(".", ",")} / Abnahme`;
  const mqTrend = trendPercent(mq.value, mq.previous);

  const aus = kpis.auslastung;
  const ausValue = aus.value === null ? null : formatPercent(aus.value);
  const ausTrend = trendPercent(aus.value, aus.previous);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] flex items-center gap-2 flex-wrap">
          <span>{dateLabel}</span>
          <span aria-hidden>·</span>
          <span>Geschäftsführer-Sicht · {workspace.name ?? "Workspace"}</span>
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {greeting}.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)] leading-relaxed">
          Operative KPIs aus laufenden Projekten, offenen Rechnungen, Stunden
          und Abnahmen. Werte werden alle 5 Minuten aktualisiert.
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-12">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          <KpiCard
            label="Auftragsbestand"
            value={auftragsbestandValue}
            hint={
              kpis.auftragsbestand.activeProjects > 0
                ? `${kpis.auftragsbestand.activeProjects} laufende Projekte (Bauphase + Abnahme)`
                : "keine laufenden Projekte"
            }
            href="/projekte"
          />
          <KpiCard
            label="Working Capital"
            value={wcValue}
            hint={
              kpis.workingCapital.value === null
                ? undefined
                : `Forderungen ${formatEur(kpis.workingCapital.forderungenOffen)} · Verbindlichkeiten ${formatEur(kpis.workingCapital.verbindlichkeitenOffen)}`
            }
            href="/ausgangsrechnungen"
          />
          <KpiCard
            label="Sicherheiten-Volumen"
            value={sicherheitenValue}
            hint={
              kpis.sicherheitenVolumen.activeCount > 0
                ? `${kpis.sicherheitenVolumen.activeCount} aktive Sicherheiten`
                : "keine aktiven Sicherheiten"
            }
          />
          <KpiCard
            label="Forderungslaufzeit"
            value={dsoValue}
            hint={
              dso.sampleSize > 0
                ? `Ø über ${dso.sampleSize} bezahlte Rechnungen (90 Tage)`
                : "keine bezahlten Rechnungen in den letzten 90 Tagen"
            }
            trendPercent={dsoTrend}
            trendIntentForUp="bad"
            trendLabel="vs. Vorperiode (90 T)"
            sparkline={dso.sparkline}
            href="/ausgangsrechnungen"
          />
          <KpiCard
            label="Mängelquote"
            value={mqValue}
            hint={
              mq.abnahmenCount > 0
                ? `${mq.maengelCount} Mängel auf ${mq.abnahmenCount} Abnahmen (Quartal)`
                : "keine Abnahmen im aktuellen Quartal"
            }
            trendPercent={mqTrend}
            trendIntentForUp="bad"
            trendLabel="vs. Vorquartal"
            sparkline={mq.sparkline}
          />
          <KpiCard
            label="Auslastung"
            value={ausValue}
            hint={
              aus.activeMitarbeiter > 0 && aus.workdays > 0
                ? `${aus.bookedHours.toFixed(0)} h von ${(aus.activeMitarbeiter * aus.workdays * 8).toFixed(0)} h Soll`
                : "keine aktiven Mitarbeiter erfasst"
            }
            trendPercent={ausTrend}
            trendIntentForUp="good"
            trendLabel="vs. Vorquartal"
            sparkline={aus.sparkline}
            href="/stunden"
          />
        </div>
      </section>

      <section className="pb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Hinweis
        </p>
        <p className="mt-2 max-w-3xl text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
          Auftragsbestand, Working Capital und Sicherheiten-Volumen sind
          Stichtag-Werte ohne historischen Trend (kein Snapshot-Mechanismus).
          Forderungslaufzeit, Mängelquote und Auslastung vergleichen jeweils
          die aktuelle Periode mit der Vorperiode.
        </p>
      </section>
    </Container>
  );
}
