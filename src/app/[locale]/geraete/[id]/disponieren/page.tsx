import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { isoToday, KATEGORIE_LABEL } from "@/lib/geraete";
import { createDisposition } from "../../actions";

export const dynamic = "force-dynamic";

export default async function DisponierenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [geraet] = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.id, id),
        eq(schema.geraete.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!geraet) notFound();

  const projekte = await db
    .select({
      id: schema.projects.id,
      identifier: schema.projects.identifier,
      name: schema.projects.name,
    })
    .from(schema.projects)
    .where(eq(schema.projects.workspaceId, workspaceId))
    .orderBy(asc(schema.projects.identifier));

  if (projekte.length === 0) {
    redirect("/projekte/new");
  }

  const today = isoToday();
  const inEinerWoche = isoToday(7);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {KATEGORIE_LABEL[geraet.kategorie]} · {geraet.bezeichnung}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Disposition anlegen
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          Reservierung des Geräts auf ein Projekt für ein Datums-Fenster.
          Überlappungen mit aktiven Dispositionen werden geblockt.
        </p>
        <div className="mt-3">
          <Link
            href={`/geraete/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Gerät
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <form action={createDisposition} className="space-y-6 max-w-2xl">
          <input type="hidden" name="geraetId" value={geraet.id} />

          <div>
            <label
              htmlFor="projektId"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Projekt
            </label>
            <select
              id="projektId"
              name="projektId"
              required
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              {projekte.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.identifier} · {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="vonDatum"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Von Datum
              </label>
              <input
                id="vonDatum"
                name="vonDatum"
                type="date"
                required
                defaultValue={today}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="bisDatum"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Bis Datum
              </label>
              <input
                id="bisDatum"
                name="bisDatum"
                type="date"
                required
                defaultValue={inEinerWoche}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="vonZeit"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Von Zeit (optional)
              </label>
              <input
                id="vonZeit"
                name="vonZeit"
                type="time"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="bisZeit"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Bis Zeit (optional)
              </label>
              <input
                id="bisZeit"
                name="bisZeit"
                type="time"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="status"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="geplant"
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              <option value="geplant">Geplant</option>
              <option value="aktiv">Aktiv (Gerät ist auf Baustelle)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Notizen
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={2000}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Disposition anlegen
            </button>
          </div>
        </form>
      </section>
    </Container>
  );
}
