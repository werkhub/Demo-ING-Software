import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { isoDate } from "@/lib/nu-operations";
import { createNuAuftragRedirect } from "../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function NewNuAuftragPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: nuId } = await params;
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const [nu, projekte] = await Promise.all([
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
    db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        identifier: schema.projects.identifier,
      })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId))
      .orderBy(asc(schema.projects.name)),
  ]);
  if (!nu) notFound();

  const today = isoDate();
  const freistellungBis = nu.freistellungsbescheinigungGueltigBis;
  const freistellungOk = !!freistellungBis && freistellungBis >= today;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          NU · {nu.name} · Neuer Auftrag
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neuer NU-Auftrag
        </h1>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      {!freistellungOk ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-3 text-sm text-[color:var(--color-warning)]">
          <strong>§ 48 EStG-Hinweis:</strong> Keine gültige Freistellungs-
          bescheinigung für diesen NU. Beim Anlegen wird automatisch ein
          Vorgang zur Bauabzug-Prüfung erstellt. Bauabzug 15 % auf
          Bruttovergütung wird bei Eingangsrechnungen vorgeschlagen.
          {freistellungBis ? (
            <span className="block mt-1 font-mono text-[10px]">
              Letzte Bescheinigung galt bis {freistellungBis}.
            </span>
          ) : null}
        </div>
      ) : null}

      <form action={createNuAuftragRedirect} className="space-y-5 max-w-2xl">
        <input type="hidden" name="nuId" value={nuId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Auftrags-Nr. *</label>
            <input
              name="auftragsnr"
              required
              minLength={1}
              maxLength={60}
              placeholder="z.B. NU-2026-0042"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Auftragsdatum *</label>
            <input
              name="auftragsdatum"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Projekt *</label>
          <select name="projektId" required className={inputClass} defaultValue="">
            <option value="">— Projekt wählen —</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.identifier} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Gewerk</label>
          <input
            name="gewerk"
            maxLength={80}
            placeholder={nu.gewerk ?? "z.B. Trockenbau"}
            defaultValue={nu.gewerk ?? ""}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Auftragssumme netto € *</label>
            <input
              name="auftragssummeNettoCents"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>USt % *</label>
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
          <div>
            <label className={labelClass}>Vertragstyp</label>
            <select name="vertragstyp" className={inputClass} defaultValue="vob">
              <option value="vob">VOB-Vertrag</option>
              <option value="bgb">BGB-Werkvertrag</option>
              <option value="werkvertrag">Werkvertrag (gemischt)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Sicherheitseinbehalt %</label>
            <input
              name="sicherheitseinbehaltPct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={5}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              Vertragserfüllung — wird je Rechnung gebucht
            </p>
          </div>
          <div>
            <label className={labelClass}>Gewährleistungseinbehalt %</label>
            <input
              name="gewaehrleistungseinbehaltPct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vertragsstrafe %</label>
            <input
              name="vertragsstrafePct"
              type="number"
              step="0.01"
              min="0"
              max="10"
              defaultValue={0}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Leistungsbeginn</label>
            <input name="leistungsBeginn" type="date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Leistungsende</label>
            <input name="leistungsEnde" type="date" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Auftrag anlegen
          </button>
          <Link
            href={`/nu/${nuId}/auftraege`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Container>
  );
}
