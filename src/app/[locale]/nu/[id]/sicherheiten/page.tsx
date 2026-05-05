import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  NU_SICHERHEITSART_LABEL,
  calcKontoSaldo,
  daysUntil,
} from "@/lib/nu-operations";
import { FreigebenButton } from "./freigeben-button";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Params = Promise<{ id: string }>;

export default async function NuSicherheitenPage({ params }: { params: Params }) {
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

  // Alle Konto-Einträge des NU (über alle Aufträge)
  const auftraege = await db
    .select({ id: schema.nuAuftraege.id, auftragsnr: schema.nuAuftraege.auftragsnr })
    .from(schema.nuAuftraege)
    .where(
      and(
        eq(schema.nuAuftraege.workspaceId, workspaceId),
        eq(schema.nuAuftraege.nuId, nuId)
      )
    )
    .orderBy(asc(schema.nuAuftraege.auftragsdatum));
  const auftragMap = new Map(auftraege.map((a) => [a.id, a.auftragsnr]));

  const eintraege = await Promise.all(
    auftraege.map((a) =>
      db
        .select()
        .from(schema.nuSicherheitsKonto)
        .where(
          and(
            eq(schema.nuSicherheitsKonto.workspaceId, workspaceId),
            eq(schema.nuSicherheitsKonto.nuAuftragId, a.id)
          )
        )
    )
  ).then((arr) => arr.flat());

  // Sortierung: offen zuerst, dann nach Fälligkeit aufsteigend
  eintraege.sort((a, b) => {
    if (!a.freigegebenAm && b.freigegebenAm) return -1;
    if (a.freigegebenAm && !b.freigegebenAm) return 1;
    return (a.faelligAm ?? "9999").localeCompare(b.faelligAm ?? "9999");
  });

  const saldo = calcKontoSaldo(eintraege);
  const offen = eintraege.filter((e) => !e.freigegebenAm);
  const fallig30 = offen.filter(
    (e) => e.faelligAm && daysUntil(e.faelligAm) <= 30
  ).length;
  const ueberfaellig = offen.filter(
    (e) => e.faelligAm && daysUntil(e.faelligAm) < 0
  ).length;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          NU · {nu.name}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Sicherheits-Konto
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Über alle Aufträge gebuchte Einbehalte (Vertragserfüllung +
          Gewährleistung).
        </p>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/nu/${nuId}/auftraege`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← Aufträge
        </Link>
        <Link
          href={`/nu/${nuId}`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          NU-Detail
        </Link>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label="Einträge gesamt" value={saldo.count} />
          <StatCard
            label="Offen"
            value={fmtCurrency(saldo.offenCents)}
            tone="accent"
          />
          <StatCard
            label="Fällig ≤ 30 Tage"
            value={fallig30}
            tone={fallig30 > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Überfällig"
            value={ueberfaellig}
            tone={ueberfaellig > 0 ? "critical" : "default"}
          />
        </StatGrid4>
      </section>

      {eintraege.length === 0 ? (
        <section className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Keine Einbehalte gebucht.
          </p>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Auftrag</th>
                <th className="px-3 py-3 text-left">Buchung</th>
                <th className="px-3 py-3 text-left">Art</th>
                <th className="px-3 py-3 text-right">Einbehalten</th>
                <th className="px-3 py-3 text-left">Fällig</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {eintraege.map((k) => {
                const tage = k.faelligAm ? daysUntil(k.faelligAm) : null;
                return (
                  <tr
                    key={k.id}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <Link
                        href={`/nu/${nuId}/auftraege/${k.nuAuftragId}`}
                        className="hover:text-[color:var(--color-accent)]"
                      >
                        {auftragMap.get(k.nuAuftragId) ?? k.nuAuftragId.slice(-6)}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{k.buchungDatum}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {NU_SICHERHEITSART_LABEL[k.art]}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(k.einbehaltenerBetragCents)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {k.faelligAm ?? "—"}
                      {tage !== null ? (
                        <span
                          className={`ml-2 ${
                            tage < 0
                              ? "text-[color:var(--color-critical)]"
                              : tage < 30
                                ? "text-[color:var(--color-warning)]"
                                : "text-[color:var(--color-fg-muted)]"
                          }`}
                        >
                          ({tage > 0 ? `+${tage}d` : tage === 0 ? "heute" : `${tage}d`})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {k.freigegebenAm
                        ? `✓ Freigegeben (${fmtCurrency(k.freigabeBetragCents ?? 0)})`
                        : "Offen"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!k.freigegebenAm ? (
                        <FreigebenButton
                          id={k.id}
                          maxCents={k.einbehaltenerBetragCents}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </Container>
  );
}
