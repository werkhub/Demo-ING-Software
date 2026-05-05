import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { addLieferscheinRedirect } from "../../actions";
import { LsPositionenEditor } from "./ls-positionen-editor";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string; bestellungId?: string }>;

export default async function NewLieferscheinPage({
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

  const offeneBestellungen = await db
    .select()
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.workspaceId, workspaceId),
        eq(schema.bestellungen.projektId, projektId)
      )
    )
    .orderBy(desc(schema.bestellungen.datum));

  const initialBestellungId =
    sp.bestellungId &&
    offeneBestellungen.some((b) => b.id === sp.bestellungId)
      ? sp.bestellungId
      : "";

  const positionen = initialBestellungId
    ? await db
        .select()
        .from(schema.bestellungenPositionen)
        .where(
          eq(schema.bestellungenPositionen.bestellungId, initialBestellungId)
        )
        .orderBy(asc(schema.bestellungenPositionen.sortIndex))
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
          {project.identifier} · Lieferschein
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Wareneingang erfassen
        </h1>
        <p className="mt-4 text-base text-[color:var(--color-fg-muted)]">
          Lieferschein kann mit einer Bestellung verknüpft oder eigenständig
          erfasst werden.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <form action={addLieferscheinRedirect} className="space-y-6 max-w-4xl">
        <input type="hidden" name="projektId" value={projektId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>LS-Nr. *</label>
            <input
              name="lsNr"
              required
              minLength={1}
              maxLength={60}
              className={inputClass}
              placeholder="z.B. LS-2026-001"
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

        <div>
          <label className={labelClass}>Bestellung (optional)</label>
          <select
            name="bestellungId"
            className={inputClass}
            defaultValue={initialBestellungId}
          >
            <option value="">— ohne Bestellung —</option>
            {offeneBestellungen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bestellnummer} · {b.lieferantName} ({b.datum})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Lieferant *</label>
            <input
              name="lieferantName"
              required
              minLength={2}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Angenommen von</label>
            <input
              name="angenommenVon"
              maxLength={120}
              className={inputClass}
              placeholder="Name Polier"
            />
          </div>
        </div>

        <LsPositionenEditor
          bestellpositionen={positionen.map((p) => ({
            id: p.id,
            posNr: p.posNr,
            bezeichnung: p.bezeichnung,
            menge: p.menge,
            einheit: p.einheit,
          }))}
        />

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" rows={2} maxLength={2000} className={inputClass} />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Lieferschein erfassen
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
