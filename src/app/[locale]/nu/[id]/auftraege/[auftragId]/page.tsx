import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  NU_AUFTRAG_STATUS_LABEL,
  NU_RECHNUNG_STATUS_LABEL,
  NU_SICHERHEITSART_LABEL,
  NU_VERTRAGSTYP_LABEL,
  calcKontoSaldo,
  daysUntil,
} from "@/lib/nu-operations";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

const fmtPct = (n: number) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) +
  " %";

type Params = Promise<{ id: string; auftragId: string }>;
type SearchParams = Promise<{ created?: string }>;

export default async function NuAuftragDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: nuId, auftragId } = await params;
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const [auftrag, nu] = await Promise.all([
    db
      .select()
      .from(schema.nuAuftraege)
      .where(
        and(
          eq(schema.nuAuftraege.id, auftragId),
          eq(schema.nuAuftraege.workspaceId, workspaceId),
          eq(schema.nuAuftraege.nuId, nuId)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(schema.subcontractors)
      .where(
        and(
          eq(schema.subcontractors.id, nuId),
          eq(schema.subcontractors.workspaceId, workspaceId)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);
  if (!auftrag || !nu) notFound();

  const [project, lvPositionen, rechnungen, kontoEintraege] = await Promise.all([
    db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        identifier: schema.projects.identifier,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, auftrag.projektId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(schema.nuAuftraegeLv)
      .where(eq(schema.nuAuftraegeLv.nuAuftragId, auftragId))
      .orderBy(asc(schema.nuAuftraegeLv.sortIndex)),
    db
      .select()
      .from(schema.nuEingangsrechnungen)
      .where(
        and(
          eq(schema.nuEingangsrechnungen.workspaceId, workspaceId),
          eq(schema.nuEingangsrechnungen.nuAuftragId, auftragId)
        )
      )
      .orderBy(desc(schema.nuEingangsrechnungen.rechnungsdatum)),
    db
      .select()
      .from(schema.nuSicherheitsKonto)
      .where(
        and(
          eq(schema.nuSicherheitsKonto.workspaceId, workspaceId),
          eq(schema.nuSicherheitsKonto.nuAuftragId, auftragId)
        )
      )
      .orderBy(desc(schema.nuSicherheitsKonto.buchungDatum)),
  ]);

  const saldo = calcKontoSaldo(kontoEintraege);
  const summeRechnungen = rechnungen.reduce(
    (s, r) => s + r.bruttoCents,
    0
  );
  const offenStrittig = rechnungen.filter(
    (r) => r.status === "eingegangen" || r.status === "strittig"
  ).length;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          NU · {nu.name} · Auftrag
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {auftrag.auftragsnr}
        </h1>
        <p className="mt-2 text-base text-[color:var(--color-fg-muted)]">
          {auftrag.gewerk ? `${auftrag.gewerk} · ` : ""}
          {project ? `${project.identifier} ${project.name}` : "—"}
        </p>
      </section>

      {sp.created ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] px-4 py-3 text-sm text-[color:var(--color-success)]">
          Rechnung erfasst.
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/nu/${nuId}/auftraege`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← Aufträge
        </Link>
        <Link
          href={`/nu/${nuId}/auftraege/${auftragId}/rechnung/new`}
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Eingangsrechnung erfassen
        </Link>
        <Link
          href={`/nu/${nuId}/sicherheiten`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          Sicherheits-Konto
        </Link>
      </section>

      {/* Konditionen */}
      <section className="mb-8 border border-[color:var(--color-border)] rounded-md p-6 bg-[color:var(--color-bg-subtle)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Konditionen
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">Vertragstyp</p>
            <p className="font-medium mt-1">
              {NU_VERTRAGSTYP_LABEL[auftrag.vertragstyp]}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">Status</p>
            <p className="font-medium mt-1">
              {NU_AUFTRAG_STATUS_LABEL[auftrag.status]}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">
              Auftragssumme netto
            </p>
            <p className="font-medium mt-1 font-mono">
              {fmtCurrency(auftrag.auftragssummeNettoCents)}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">USt-Satz</p>
            <p className="font-medium mt-1 font-mono">{fmtPct(auftrag.ustSatzPct)}</p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">
              Sicherheitseinbehalt
            </p>
            <p className="font-medium mt-1 font-mono">
              {fmtPct(auftrag.sicherheitseinbehaltPct)}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">
              Gewährleistungseinbehalt
            </p>
            <p className="font-medium mt-1 font-mono">
              {fmtPct(auftrag.gewaehrleistungseinbehaltPct)}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">Vertragsstrafe</p>
            <p className="font-medium mt-1 font-mono">
              {fmtPct(auftrag.vertragsstrafePct)}
            </p>
          </div>
          <div>
            <p className="text-[color:var(--color-fg-muted)] text-xs">Leistungszeit</p>
            <p className="font-medium mt-1 font-mono text-xs">
              {auftrag.leistungsBeginn ?? "—"} bis {auftrag.leistungsEnde ?? "—"}
            </p>
          </div>
        </div>
        {auftrag.notes ? (
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)] whitespace-pre-line">
            {auftrag.notes}
          </p>
        ) : null}
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label="Rechnungen" value={rechnungen.length} />
          <StatCard
            label="Offen / strittig"
            value={offenStrittig}
            tone={offenStrittig > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Brutto-Summe"
            value={fmtCurrency(summeRechnungen)}
          />
          <StatCard
            label="Konto-Saldo offen"
            value={fmtCurrency(saldo.offenCents)}
            tone="accent"
          />
        </StatGrid4>
      </section>

      {/* Rechnungen */}
      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Eingangsrechnungen
        </h2>
        {rechnungen.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Rechnungen erfasst.
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Nr.</th>
                  <th className="px-3 py-3 text-left">Datum</th>
                  <th className="px-3 py-3 text-right">Brutto</th>
                  <th className="px-3 py-3 text-right">Sicherheit</th>
                  <th className="px-3 py-3 text-right">Gewährleistung</th>
                  <th className="px-3 py-3 text-right">Bauabzug</th>
                  <th className="px-3 py-3 text-right">Auszahlung</th>
                  <th className="px-3 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rechnungen.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{r.rechnungsnr}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {r.rechnungsdatum}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(r.bruttoCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {fmtCurrency(r.einbehaltSicherheitCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {fmtCurrency(r.einbehaltGewaehrleistungCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {r.bauabzugEinbehaltCents > 0
                        ? fmtCurrency(r.bauabzugEinbehaltCents)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                      {fmtCurrency(r.ausgezahltCents)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {NU_RECHNUNG_STATUS_LABEL[r.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Konto-Einträge */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Sicherheits-Konto
        </h2>
        {kontoEintraege.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Einbehalte gebucht.
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Buchung</th>
                  <th className="px-3 py-3 text-left">Art</th>
                  <th className="px-3 py-3 text-right">Einbehalten</th>
                  <th className="px-3 py-3 text-left">Fällig</th>
                  <th className="px-3 py-3 text-left">Tage</th>
                  <th className="px-3 py-3 text-left">Freigegeben</th>
                </tr>
              </thead>
              <tbody>
                {kontoEintraege.map((k) => {
                  const tage = k.faelligAm ? daysUntil(k.faelligAm) : null;
                  return (
                    <tr
                      key={k.id}
                      className="border-t border-[color:var(--color-border)]"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {k.buchungDatum}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {NU_SICHERHEITSART_LABEL[k.art]}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {fmtCurrency(k.einbehaltenerBetragCents)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {k.faelligAm ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {tage !== null ? (
                          <span
                            className={
                              tage < 0
                                ? "text-[color:var(--color-critical)]"
                                : tage < 30
                                  ? "text-[color:var(--color-warning)]"
                                  : "text-[color:var(--color-fg-muted)]"
                            }
                          >
                            {tage > 0 ? `${tage}d` : tage === 0 ? "heute" : `${-tage}d zu`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {k.freigegebenAm
                          ? `✓ ${k.freigegebenAm.toLocaleDateString("de-DE")}`
                          : "offen"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* LV (falls vorhanden) */}
      {lvPositionen.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Auftrags-LV ({lvPositionen.length} Positionen)
          </h2>
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Pos</th>
                  <th className="px-3 py-3 text-left">Bezeichnung</th>
                  <th className="px-3 py-3 text-right">Menge</th>
                  <th className="px-3 py-3 text-left">Einheit</th>
                  <th className="px-3 py-3 text-right">EP</th>
                  <th className="px-3 py-3 text-right">GP</th>
                </tr>
              </thead>
              <tbody>
                {lvPositionen.map((p) => (
                  <tr key={p.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-3 py-2.5 font-mono text-xs">{p.posNr}</td>
                    <td className="px-3 py-2.5">{p.bezeichnung}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {p.menge}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{p.einheit}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.einzelpreisCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.gesamtpreisCents)}
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
