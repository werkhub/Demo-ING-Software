import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjectById } from "@/db/queries";
import { formatDateShort } from "@/lib/utils";
import {
  createBemusterung,
  deleteBemusterung,
  recordAgDecision,
} from "./actions";
import type {
  BemusterungAgEntscheidung,
  BemusterungStatus,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BemusterungStatus, string> = {
  entwurf: "Entwurf",
  vorgelegt: "Vorgelegt",
  entschieden: "Entschieden",
};

const STATUS_TONE: Record<BemusterungStatus, string> = {
  entwurf:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  vorgelegt:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  entschieden:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
};

const DECISION_LABEL: Record<BemusterungAgEntscheidung, string> = {
  offen: "ausstehend",
  ausgewaehlt: "ausgewählt",
  abgelehnt: "abgelehnt",
  alternative: "Alternative gewünscht",
};

const DECISION_TONE: Record<BemusterungAgEntscheidung, string> = {
  offen: "text-[color:var(--color-fg-muted)]",
  ausgewaehlt: "text-[color:var(--color-success)]",
  abgelehnt: "text-[color:var(--color-critical)]",
  alternative: "text-[color:var(--color-warning)]",
};

export default async function BemusterungListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const rows = await db
    .select()
    .from(schema.bemusterungen)
    .where(
      and(
        eq(schema.bemusterungen.workspaceId, workspaceId),
        eq(schema.bemusterungen.projectId, id)
      )
    )
    .orderBy(desc(schema.bemusterungen.datum));

  const today = new Date().toISOString().slice(0, 10);
  const offen = rows.filter((b) => b.agEntscheidung === "offen").length;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Bemusterung
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Materialien und Oberflächen mit AG-Entscheidung beweissicher
          dokumentieren — klassische LP5/LP8-Aufgabe. Ohne Protokoll Streit
          über &bdquo;so wollte ich das nicht&ldquo;.
        </p>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            {rows.length} Bemusterung{rows.length === 1 ? "" : "en"}
            {offen > 0 ? ` · ${offen} ausstehend` : ""}
          </p>
        </div>
      </section>

      <section className="pb-10">
        <details
          open={rows.length === 0}
          className="border border-[color:var(--color-border)] rounded-md"
        >
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-[color:var(--color-bg-subtle)] transition-colors">
            + Neue Bemusterung
          </summary>
          <form
            action={async (formData) => {
              "use server";
              await createBemusterung(null, formData);
            }}
            className="px-5 pb-5 pt-2 grid gap-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Datum
                </span>
                <input
                  type="date"
                  name="datum"
                  defaultValue={today}
                  required
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Gewerk
                </span>
                <input
                  type="text"
                  name="gewerk"
                  required
                  placeholder="z. B. Bodenbelag, Sanitär"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Raum / Bauteil
                </span>
                <input
                  type="text"
                  name="raumBauteil"
                  placeholder="z. B. EG, Fassade Süd"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Material / Oberfläche
              </span>
              <input
                type="text"
                name="material"
                required
                placeholder="z. B. Eichenparkett geölt"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Hersteller
                </span>
                <input
                  type="text"
                  name="hersteller"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Artikel-Nr.
                </span>
                <input
                  type="text"
                  name="artikelNr"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Farbe / Variante
                </span>
                <input
                  type="text"
                  name="farbeVariante"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Empfehlung an AG (optional)
              </span>
              <textarea
                name="empfehlung"
                rows={2}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Notizen
              </span>
              <textarea
                name="notes"
                rows={2}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                Vorlegen
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="pb-16">
        {rows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Bemusterung dokumentiert.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => (
              <li
                key={b.id}
                className="border border-[color:var(--color-border)] rounded-md p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      {formatDateShort(b.datum)} · {b.gewerk}
                      {b.raumBauteil ? ` · ${b.raumBauteil}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium">{b.material}</p>
                    <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
                      {[b.hersteller, b.artikelNr, b.farbeVariante]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <span
                    className={`inline-block font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                {b.empfehlung ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-[color:var(--color-fg-muted)]">
                    Empfehlung: {b.empfehlung}
                  </p>
                ) : null}

                <div className="mt-3 pt-3 border-t border-[color:var(--color-border)] flex flex-wrap items-end gap-2">
                  <form
                    action={recordAgDecision}
                    className="flex flex-wrap items-end gap-2 flex-1"
                  >
                    <input type="hidden" name="id" value={b.id} />
                    <label className="block">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        AG-Entscheidung
                      </span>
                      <select
                        name="agEntscheidung"
                        defaultValue={b.agEntscheidung}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      >
                        {Object.entries(DECISION_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        Entscheider
                      </span>
                      <input
                        type="text"
                        name="agEntscheiderName"
                        defaultValue={b.agEntscheiderName ?? ""}
                        placeholder="Name"
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        Datum
                      </span>
                      <input
                        type="date"
                        name="agEntscheidungDatum"
                        defaultValue={b.agEntscheidungDatum ?? ""}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      />
                    </label>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]"
                    >
                      Speichern
                    </button>
                    <span
                      className={`text-xs ml-2 ${DECISION_TONE[b.agEntscheidung]}`}
                    >
                      Aktuell: {DECISION_LABEL[b.agEntscheidung]}
                    </span>
                  </form>
                  <form action={deleteBemusterung}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                    >
                      Löschen
                    </button>
                  </form>
                </div>

                {b.notes ? (
                  <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)] italic">
                    {b.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
