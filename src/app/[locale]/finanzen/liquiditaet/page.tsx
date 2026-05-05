import { Link } from "@/i18n/navigation";
import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { DeleteSzenarioButton } from "./delete-button";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export default async function LiquiditaetListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const szenarien = await db
    .select()
    .from(schema.liquiditaetSzenarien)
    .where(eq(schema.liquiditaetSzenarien.workspaceId, workspaceId))
    .orderBy(desc(schema.liquiditaetSzenarien.createdAt));

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · Liquidität
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Liquiditätsplanung
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Cashflow-Forecast aus offenen ARs, NU-Eingangsrechnungen und Lohn-
          Aggregaten. Frühwarnung bei Kontostand &le; 0 in den nächsten 14 Tagen.
        </p>
      </section>

      <section className="mb-6 flex items-center gap-3">
        <Link
          href="/finanzen/liquiditaet/new"
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Neues Szenario
        </Link>
        <Link
          href="/finanzen/datev"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          DATEV-Export
        </Link>
      </section>

      {szenarien.length === 0 ? (
        <section className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch kein Szenario erstellt.
          </p>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Erstellt</th>
                <th className="px-3 py-3 text-left">Name</th>
                <th className="px-3 py-3 text-left">Basis</th>
                <th className="px-3 py-3 text-right">Horizont</th>
                <th className="px-3 py-3 text-right">Startsaldo</th>
                <th className="px-3 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {szenarien.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-[color:var(--color-border)]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                    {s.createdAt.toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/finanzen/liquiditaet/${s.id}`}
                      className="hover:text-[color:var(--color-accent)]"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.basisdatum}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {s.horizontTage} Tage
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {fmtCurrency(s.kontostandStartCents)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DeleteSzenarioButton id={s.id} />
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
