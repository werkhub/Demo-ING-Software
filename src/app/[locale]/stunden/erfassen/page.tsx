import { Link } from "@/i18n/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspace, getCurrentWorkspaceId } from "@/lib/session";
import { isoToday } from "@/lib/stunden";
import { LP_LABEL } from "@/lib/hoai/leistungsphasen";
import type { Leistungsphase } from "@/lib/hoai/types";
import { createStundenEintragRedirect } from "../actions";

const ALL_LPS: Leistungsphase[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type SearchParams = Promise<{
  ma?: string;
  projekt?: string;
  datum?: string;
}>;

export default async function StundenErfassenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const [workspaceId, workspace] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspace(),
  ]);
  const isIngenieurbuero = workspace.workspaceRole === "ingenieurbuero";
  const [aktiveMa, projekte] = await Promise.all([
    db
      .select()
      .from(schema.mitarbeiter)
      .where(
        and(
          eq(schema.mitarbeiter.workspaceId, workspaceId),
          eq(schema.mitarbeiter.aktiv, true)
        )
      )
      .orderBy(asc(schema.mitarbeiter.name)),
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

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Stunden · Erfassen
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Stunden buchen
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Tagesweise pro MA × Projekt. Optional LV-Position für Nachkalkulation.
        </p>
      </section>

      {aktiveMa.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Erst Mitarbeiter anlegen.
          </p>
          <Link
            href="/stunden/mitarbeiter/new"
            className="mt-4 inline-flex rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Mitarbeiter anlegen
          </Link>
        </div>
      ) : projekte.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Erst Projekt anlegen.
          </p>
          <Link
            href="/projekte/new"
            className="mt-4 inline-flex rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Projekt anlegen
          </Link>
        </div>
      ) : (
        <form action={createStundenEintragRedirect} className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mitarbeiter *</label>
              <select
                name="mitarbeiterId"
                required
                defaultValue={sp.ma ?? ""}
                className={inputClass}
              >
                <option value="">— wählen —</option>
                {aktiveMa.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.gewerk ? ` · ${m.gewerk}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Projekt *</label>
              <select
                name="projektId"
                required
                defaultValue={sp.projekt ?? ""}
                className={inputClass}
              >
                <option value="">— wählen —</option>
                {projekte.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Datum *</label>
              <input
                name="datum"
                type="date"
                required
                defaultValue={sp.datum ?? isoToday()}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stunden *</label>
              <input
                name="stunden"
                type="number"
                step="0.25"
                min="0"
                max="24"
                required
                defaultValue="8"
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
                &gt;12h/Tag erzeugt Plausi-Vorgang
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tätigkeit</label>
            <input
              name="taetigkeit"
              maxLength={200}
              placeholder="z.B. Mauerarbeiten EG, Putz BH 3"
              className={inputClass}
            />
          </div>

          {isIngenieurbuero ? (
            <div>
              <label className={labelClass}>Leistungsphase (HOAI)</label>
              <select name="leistungsphase" className={inputClass} defaultValue="">
                <option value="">— ohne LP-Bezug —</option>
                {ALL_LPS.map((lp) => (
                  <option key={lp} value={lp}>
                    {LP_LABEL[lp]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
                Buchung pro LP × Projekt — Beweis bei HOAI-Honorarstreit + Soll-Ist-Vergleich
              </p>
            </div>
          ) : (
            <div>
              <label className={labelClass}>LV-Position-ID (optional)</label>
              <input
                name="lvPositionId"
                maxLength={40}
                placeholder="lv-..."
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
                Wenn gesetzt: fließt in Nachkalkulation pro LV-Position
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>Notizen</label>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Buchen
            </button>
            <Link
              href="/stunden"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      )}
    </Container>
  );
}
