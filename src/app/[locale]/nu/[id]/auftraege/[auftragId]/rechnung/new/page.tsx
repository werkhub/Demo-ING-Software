import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId, getCurrentWorkspace } from "@/lib/session";
import {
  defaultBauabzugCents,
  isoDate,
} from "@/lib/nu-operations";
import { createNuRechnungRedirect } from "../../../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type Params = Promise<{ id: string; auftragId: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function NewNuRechnungPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: nuId, auftragId } = await params;
  const sp = await searchParams;
  const [workspaceId, workspace] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspace(),
  ]);
  const [auftrag, nu] = await Promise.all([
    db
      .select()
      .from(schema.nuAuftraege)
      .where(
        and(
          eq(schema.nuAuftraege.id, auftragId),
          eq(schema.nuAuftraege.workspaceId, workspaceId)
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

  const today = isoDate();
  const freistellungBis = nu.freistellungsbescheinigungGueltigBis;
  const freistellungOk = !!freistellungBis && freistellungBis >= today;
  const expectedBauabzug = workspace.bauabzugPflichtig
    ? defaultBauabzugCents(0, freistellungOk, true) // 0 weil Brutto noch nicht da
    : 0;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          NU · {nu.name} · Auftrag {auftrag.auftragsnr}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neue Eingangsrechnung
        </h1>
        <p className="mt-4 text-base text-[color:var(--color-fg-muted)]">
          Einbehalte werden automatisch aus den Auftrags-Konditionen berechnet.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <section className="mb-6 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-xs text-[color:var(--color-fg-muted)] space-y-1">
        <p>
          <strong>Sicherheitseinbehalt:</strong> {auftrag.sicherheitseinbehaltPct} %
          (Vertragserfüllung) ·{" "}
          <strong>Gewährleistung:</strong> {auftrag.gewaehrleistungseinbehaltPct} %
        </p>
        {workspace.bauabzugPflichtig ? (
          <p>
            <strong>§ 48 EStG:</strong>{" "}
            {freistellungOk
              ? "Freistellungsbescheinigung gültig bis " + freistellungBis + " — kein Bauabzug."
              : "Keine gültige Freistellung — Bauabzug 15 % wird automatisch vorgeschlagen."}
          </p>
        ) : null}
      </section>

      <form action={createNuRechnungRedirect} className="space-y-5 max-w-2xl">
        <input type="hidden" name="nuAuftragId" value={auftragId} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Rechnungs-Nr. *</label>
            <input
              name="rechnungsnr"
              required
              minLength={1}
              maxLength={60}
              className={inputClass}
              placeholder="z.B. 2026-001"
            />
          </div>
          <div>
            <label className={labelClass}>Rechnungsdatum *</label>
            <input
              name="rechnungsdatum"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Brutto € *</label>
            <input
              name="bruttoCents"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Netto € *</label>
            <input
              name="nettoCents"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>USt €</label>
            <input
              name="ustCents"
              type="number"
              step="0.01"
              min="0"
              defaultValue=""
              className={inputClass}
              placeholder="auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Skonto-Einbehalt €</label>
            <input
              name="einbehaltSkontoCents"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              Z.B. 2 % bei Zahlung in 14 Tagen
            </p>
          </div>
          <div>
            <label className={labelClass}>Bauabzug §48 €</label>
            <input
              name="bauabzugEinbehaltCents"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              placeholder={
                workspace.bauabzugPflichtig && !freistellungOk
                  ? "leer = 15% Default"
                  : "0"
              }
            />
            {workspace.bauabzugPflichtig && !freistellungOk ? (
              <p className="mt-1 text-[10px] text-[color:var(--color-warning)]">
                Bei Wert „0" wird 15 % vom Brutto automatisch einbehalten
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea
            name="notes"
            rows={2}
            maxLength={1000}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Rechnung erfassen
          </button>
          <Link
            href={`/nu/${nuId}/auftraege/${auftragId}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
        {/* expectedBauabzug ist Platzhalter — wir nutzen den Wert nicht direkt im Form, aber er ist ein Hint */}
        <input type="hidden" name="_expectedBauabzug" value={expectedBauabzug} />
      </form>
    </Container>
  );
}
