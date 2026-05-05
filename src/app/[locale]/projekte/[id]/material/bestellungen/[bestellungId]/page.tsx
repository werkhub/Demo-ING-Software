import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  BESTELLUNG_STATUS_LABEL,
  LIEFERSCHEIN_STATUS_LABEL,
} from "@/lib/material";
import { matchBestellungMitLieferscheinen } from "@/lib/material/match";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Params = Promise<{ id: string; bestellungId: string }>;

export default async function BestellungDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id: projektId, bestellungId } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [bestellung] = await db
    .select()
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.id, bestellungId),
        eq(schema.bestellungen.workspaceId, workspaceId),
        eq(schema.bestellungen.projektId, projektId)
      )
    )
    .limit(1);
  if (!bestellung) notFound();

  const [positionen, lieferscheineRows] = await Promise.all([
    db
      .select()
      .from(schema.bestellungenPositionen)
      .where(eq(schema.bestellungenPositionen.bestellungId, bestellungId))
      .orderBy(asc(schema.bestellungenPositionen.sortIndex)),
    db
      .select()
      .from(schema.lieferscheine)
      .where(
        and(
          eq(schema.lieferscheine.workspaceId, workspaceId),
          eq(schema.lieferscheine.bestellungId, bestellungId)
        )
      )
      .orderBy(desc(schema.lieferscheine.datum)),
  ]);

  const lspsAll = lieferscheineRows.length
    ? await db
        .select()
        .from(schema.lieferscheinePositionen)
        .where(eq(schema.lieferscheinePositionen.workspaceId, workspaceId))
    : [];
  const lspsByLs = new Map<string, typeof schema.lieferscheinePositionen.$inferSelect[]>();
  for (const p of lspsAll) {
    if (!lspsByLs.has(p.lsId)) lspsByLs.set(p.lsId, []);
    lspsByLs.get(p.lsId)!.push(p);
  }

  const lspsForThisBestellung = lieferscheineRows
    .flatMap((l) => lspsByLs.get(l.id) ?? [])
    .map((p) => ({
      bestellposId: p.bestellposId,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
    }));

  const abgleich = matchBestellungMitLieferscheinen(
    positionen.map((p) => ({
      id: p.id,
      posNr: p.posNr,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
      einzelpreisCents: p.einzelpreisCents,
      gesamtpreisCents: p.gesamtpreisCents,
    })),
    lspsForThisBestellung
  );

  const geliefertJePos = new Map<string, number>();
  for (const lp of lspsForThisBestellung) {
    if (!lp.bestellposId) continue;
    geliefertJePos.set(
      lp.bestellposId,
      (geliefertJePos.get(lp.bestellposId) ?? 0) + lp.menge
    );
  }

  return (
    <Container>
      <section className="pt-14 pb-10">
        <Link
          href={`/projekte/${projektId}/material`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← Material
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bestellung
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {bestellung.bestellnummer}
        </h1>
        <p className="mt-2 text-base text-[color:var(--color-fg-muted)]">
          {bestellung.lieferantName} · {bestellung.datum}
        </p>
      </section>

      <section className="mb-8 border border-[color:var(--color-border)] rounded-md p-6 bg-[color:var(--color-bg-subtle)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Fact label="Status">
            {BESTELLUNG_STATUS_LABEL[bestellung.status]}
          </Fact>
          <Fact label="Summe netto">
            <span className="font-mono">
              {fmtCurrency(bestellung.summeNettoCents)}
            </span>
          </Fact>
          <Fact label="USt">{bestellung.ustSatzPct} %</Fact>
          <Fact label="Lieferscheine">{lieferscheineRows.length}</Fact>
        </div>
        {bestellung.notes ? (
          <p className="mt-4 text-xs text-[color:var(--color-fg-muted)] whitespace-pre-line">
            {bestellung.notes}
          </p>
        ) : null}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Positionen ({positionen.length})
        </h2>
        <div className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Pos</th>
                <th className="px-3 py-3 text-left">Bezeichnung</th>
                <th className="px-3 py-3 text-right">Best.-Menge</th>
                <th className="px-3 py-3 text-left">Einheit</th>
                <th className="px-3 py-3 text-right">Geliefert</th>
                <th className="px-3 py-3 text-right">EP</th>
                <th className="px-3 py-3 text-right">GP</th>
                <th className="px-3 py-3 text-left">LV</th>
              </tr>
            </thead>
            <tbody>
              {positionen.map((p) => {
                const geliefert = geliefertJePos.get(p.id) ?? 0;
                const tone =
                  geliefert >= p.menge * 0.98
                    ? "text-[color:var(--color-success)]"
                    : geliefert > 0
                      ? "text-[color:var(--color-warning)]"
                      : "text-[color:var(--color-fg-muted)]";
                return (
                  <tr
                    key={p.id}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">{p.posNr}</td>
                    <td className="px-3 py-2.5">{p.bezeichnung}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {p.menge}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{p.einheit}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs ${tone}`}>
                      {geliefert}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.einzelpreisCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.gesamtpreisCents)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                      {p.lvPositionId ? "✓" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!abgleich.complete ? (
          <p className="mt-3 text-xs text-[color:var(--color-warning)]">
            Lieferung unvollständig: {abgleich.missingMengen.length} fehlende /{" "}
            {abgleich.surplusMengen.length} überschüssige Position
            {abgleich.missingMengen.length + abgleich.surplusMengen.length === 1
              ? ""
              : "en"}{" "}
            außerhalb 2-%-Toleranz.
          </p>
        ) : (
          <p className="mt-3 text-xs text-[color:var(--color-success)]">
            ✓ Vollständig geliefert (innerhalb 2-%-Toleranz).
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Lieferscheine zu dieser Bestellung
        </h2>
        {lieferscheineRows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Lieferscheine.
            <span className="block mt-2">
              <Link
                href={`/projekte/${projektId}/material/lieferscheine/new?bestellungId=${bestellungId}`}
                className="text-[color:var(--color-accent)] hover:underline text-xs"
              >
                + Lieferschein erfassen
              </Link>
            </span>
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">LS-Nr.</th>
                  <th className="px-3 py-3 text-left">Datum</th>
                  <th className="px-3 py-3 text-left">Angenommen von</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-right">Positionen</th>
                </tr>
              </thead>
              <tbody>
                {lieferscheineRows.map((l) => (
                  <tr key={l.id} className="border-t border-[color:var(--color-border)]">
                    <td className="px-3 py-2.5 font-mono text-xs">{l.lsNr}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {l.datum}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{l.angenommenVon ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {LIEFERSCHEIN_STATUS_LABEL[l.status]}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {(lspsByLs.get(l.id) ?? []).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[color:var(--color-fg-muted)] text-xs">{label}</p>
      <p className="font-medium mt-1">{children}</p>
    </div>
  );
}
