import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjectById } from "@/db/queries";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  createHinweis,
  deleteHinweis,
  updateHinweisAgReaktion,
  updateHinweisStatus,
} from "./actions";
import type {
  HinweisAnlass,
  HinweisAgReaktion,
  HinweisForm,
  HinweisStatus,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const ANLASS_LABEL: Record<HinweisAnlass, string> = {
  kostensteigerung: "Kostensteigerung",
  planungsaenderung: "Planungsänderung",
  materialwahl: "Materialwahl",
  risiko: "Risiko",
  terminverzug: "Terminverzug",
  sonstiges: "Sonstiges",
};

const FORM_LABEL: Record<HinweisForm, string> = {
  muendlich: "mündlich",
  schriftlich: "schriftlich",
  email: "E-Mail",
};

const STATUS_LABEL: Record<HinweisStatus, string> = {
  entwurf: "Entwurf",
  erteilt: "Erteilt",
  nachverfolgt: "Nachverfolgt",
  geschlossen: "Geschlossen",
};

const STATUS_TONE: Record<HinweisStatus, string> = {
  entwurf: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  erteilt: "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  nachverfolgt: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  geschlossen: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
};

const REAKTION_LABEL: Record<HinweisAgReaktion, string> = {
  keine: "ausstehend",
  akzeptiert: "akzeptiert",
  abgelehnt: "abgelehnt",
  in_bearbeitung: "in Bearbeitung",
};

const REAKTION_TONE: Record<HinweisAgReaktion, string> = {
  keine: "text-[color:var(--color-fg-muted)]",
  akzeptiert: "text-[color:var(--color-success)]",
  abgelehnt: "text-[color:var(--color-critical)]",
  in_bearbeitung: "text-[color:var(--color-warning)]",
};

export default async function HinweiseListPage({
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
    .from(schema.hinweise)
    .where(
      and(
        eq(schema.hinweise.workspaceId, workspaceId),
        eq(schema.hinweise.projectId, id)
      )
    )
    .orderBy(desc(schema.hinweise.datum));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Hinweispflicht
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Architekten-Hinweispflicht (§ 650p BGB) beweissicher dokumentieren —
          Kostensteigerungen, Planungsfehler-Risiken, ungeeignete Materialien.
          Ohne dokumentierten Hinweis greift im Streit die Vermutung
          schlechter Beratung.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
        </div>
      </section>

      <section className="pb-10">
        <details
          open={rows.length === 0}
          className="border border-[color:var(--color-border)] rounded-md"
        >
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-[color:var(--color-bg-subtle)] transition-colors">
            + Neuer Hinweis
          </summary>
          <form
            action={async (formData) => {
              "use server";
              await createHinweis(null, formData);
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
                  Anlass
                </span>
                <select
                  name="anlass"
                  required
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(ANLASS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Form
                </span>
                <select
                  name="form"
                  required
                  defaultValue="schriftlich"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(FORM_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Empfänger
                </span>
                <input
                  type="text"
                  name="empfaengerName"
                  required
                  placeholder="z. B. Müller (AG-Vertreter)"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Empfänger-Rolle (optional)
                </span>
                <input
                  type="text"
                  name="empfaengerRolle"
                  placeholder="z. B. AG, AG-Vertreter, Bauherr"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Wortlaut/Zusammenfassung des Hinweises
              </span>
              <textarea
                name="wortlaut"
                required
                rows={4}
                placeholder="Welcher Hinweis wurde mit welchem Inhalt erteilt? — Pflichtfeld für die Beweiskette."
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Potentielle Kostenwirkung (€ netto, optional)
              </span>
              <input
                type="number"
                step="0.01"
                name="potentialKostenwirkungEur"
                placeholder="0,00"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Notizen (intern)
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
                Hinweis speichern
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="pb-16">
        {rows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch kein Hinweis dokumentiert. Erfasse erteilte Hinweise oben.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((h) => (
              <li
                key={h.id}
                className="border border-[color:var(--color-border)] rounded-md p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      {formatDateShort(h.datum)} · {ANLASS_LABEL[h.anlass]} ·{" "}
                      {FORM_LABEL[h.form]}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      An: {h.empfaengerName}
                      {h.empfaengerRolle ? (
                        <span className="text-[color:var(--color-fg-muted)] font-normal">
                          {" "}
                          · {h.empfaengerRolle}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`inline-block font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[h.status]}`}
                  >
                    {STATUS_LABEL[h.status]}
                  </span>
                </div>
                <p className="text-sm text-[color:var(--color-fg)] whitespace-pre-wrap">
                  {h.wortlaut}
                </p>
                {h.potentialKostenwirkungCents ? (
                  <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
                    Mögliche Kostenwirkung:{" "}
                    {fmtMoney(h.potentialKostenwirkungCents / 100)}
                  </p>
                ) : null}

                <div className="mt-3 pt-3 border-t border-[color:var(--color-border)] grid gap-3 md:grid-cols-2">
                  <form action={updateHinweisAgReaktion} className="space-y-2">
                    <input type="hidden" name="id" value={h.id} />
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      AG-Reaktion ·{" "}
                      <span className={REAKTION_TONE[h.agReaktion]}>
                        {REAKTION_LABEL[h.agReaktion]}
                      </span>
                      {h.agReaktionDatum ? (
                        <span className="text-[color:var(--color-fg-muted)]">
                          {" "}
                          · {formatDateShort(h.agReaktionDatum)}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex gap-2 items-center">
                      <select
                        name="agReaktion"
                        defaultValue={h.agReaktion}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      >
                        {Object.entries(REAKTION_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        name="agReaktionDatum"
                        defaultValue={h.agReaktionDatum ?? ""}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]"
                      >
                        Speichern
                      </button>
                    </div>
                    <input
                      type="text"
                      name="agReaktionText"
                      defaultValue={h.agReaktionText ?? ""}
                      placeholder="AG-Antwort kurz festhalten…"
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                    />
                  </form>

                  <div className="flex flex-col gap-2 items-end justify-start">
                    <form action={updateHinweisStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={h.id} />
                      <select
                        name="status"
                        defaultValue={h.status}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]"
                      >
                        Status setzen
                      </button>
                    </form>
                    <form action={deleteHinweis}>
                      <input type="hidden" name="id" value={h.id} />
                      <button
                        type="submit"
                        className="text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                      >
                        Löschen
                      </button>
                    </form>
                  </div>
                </div>

                {h.notes ? (
                  <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)] italic">
                    {h.notes}
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
