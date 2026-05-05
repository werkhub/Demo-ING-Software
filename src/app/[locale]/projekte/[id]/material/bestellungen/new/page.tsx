import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { createBestellungRedirect } from "../../actions";
import { PositionenEditor } from "./positionen-editor";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function NewBestellungPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: projektId } = await params;
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) notFound();

  const lvForProject = await db
    .select({ id: schema.lv.id })
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.workspaceId, workspaceId),
        eq(schema.lv.projectId, projektId)
      )
    )
    .limit(1);

  const lvOptions = lvForProject.length
    ? await db
        .select({
          id: schema.lvItems.id,
          oz: schema.lvItems.oz,
          shortText: schema.lvItems.shortText,
        })
        .from(schema.lvItems)
        .where(
          and(
            eq(schema.lvItems.lvId, lvForProject[0].id),
            eq(schema.lvItems.kind, "position")
          )
        )
        .orderBy(asc(schema.lvItems.sortIndex))
    : [];

  const today = new Date().toISOString().slice(0, 10);

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
          {project.identifier} · Neue Bestellung
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Bestellung anlegen
        </h1>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <form action={createBestellungRedirect} className="space-y-6 max-w-4xl">
        <input type="hidden" name="projektId" value={projektId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Bestellnummer *</label>
            <input
              name="bestellnummer"
              required
              minLength={1}
              maxLength={60}
              placeholder="z.B. BE-2026-0042"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Datum *</label>
            <input
              name="datum"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Lieferant *</label>
            <input
              name="lieferantName"
              required
              minLength={2}
              maxLength={200}
              placeholder="Firma XY GmbH"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>USt %</label>
            <input
              name="ustSatzPct"
              type="number"
              step="0.01"
              min="0"
              max="30"
              defaultValue={19}
              className={inputClass}
            />
          </div>
        </div>

        <PositionenEditor
          lvOptions={lvOptions.map((o) => ({
            id: o.id,
            oz: o.oz,
            shortText: o.shortText,
          }))}
        />

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" rows={3} maxLength={2000} className={inputClass} />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Bestellung anlegen
          </button>
          <Link
            href={`/projekte/${projektId}/material`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Container>
  );
}
