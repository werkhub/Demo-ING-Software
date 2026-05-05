import { Link } from "@/i18n/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  LOHNART_LABEL,
  effectiveStundensatzCents,
} from "@/lib/stunden";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export default async function MitarbeiterListePage() {
  const workspaceId = await getCurrentWorkspaceId();
  const ma = await db
    .select()
    .from(schema.mitarbeiter)
    .where(eq(schema.mitarbeiter.workspaceId, workspaceId))
    .orderBy(asc(schema.mitarbeiter.aktiv), asc(schema.mitarbeiter.name));

  const aktive = ma.filter((m) => m.aktiv);
  const inaktive = ma.filter((m) => !m.aktiv);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Stunden · Stamm-Mitarbeiter
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Mitarbeiter
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {ma.length} Datensätze · {aktive.length} aktiv · {inaktive.length}{" "}
          inaktiv
        </p>
      </section>

      <section className="mb-6 flex items-center gap-3">
        <Link
          href="/stunden/mitarbeiter/new"
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Neuer Mitarbeiter
        </Link>
        <Link
          href="/stunden"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          → Wochen-Übersicht
        </Link>
      </section>

      {ma.length === 0 ? (
        <section className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch kein Mitarbeiter angelegt.
          </p>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Name</th>
                <th className="px-3 py-3 text-left">Pers.-Nr.</th>
                <th className="px-3 py-3 text-left">Gewerk</th>
                <th className="px-3 py-3 text-left">Lohnart</th>
                <th className="px-3 py-3 text-right">Eff. Stundensatz</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ma.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/stunden/mitarbeiter/${m.id}/edit`}
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)] font-mono text-xs">
                    {m.personalnummer ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)]">
                    {m.gewerk ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">{LOHNART_LABEL[m.lohnart]}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {fmtCurrency(effectiveStundensatzCents(m))}/h
                  </td>
                  <td className="px-3 py-2.5">
                    {m.aktiv ? (
                      <span className="rounded-full bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border border-[color:var(--color-success-border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                        aktiv
                      </span>
                    ) : (
                      <span className="rounded-full bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                        inaktiv
                      </span>
                    )}
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
