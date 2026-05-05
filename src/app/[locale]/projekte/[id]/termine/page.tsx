import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjectById } from "@/db/queries";
import { daysUntilDeadline, formatDateShort } from "@/lib/utils";
import {
  createMeilenstein,
  deleteMeilenstein,
  updateMeilensteinStatus,
} from "./actions";
import type { MeilensteinStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<MeilensteinStatus, string> = {
  geplant: "Geplant",
  laufend: "Laufend",
  erreicht: "Erreicht",
  verzoegert: "Verzögert",
  abgesagt: "Abgesagt",
};

const STATUS_TONE: Record<MeilensteinStatus, string> = {
  geplant:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  laufend:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  erreicht:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  verzoegert:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  abgesagt:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

function abweichungLabel(soll: string, ist: string | null): string {
  if (!ist) return "—";
  const sollDays = daysUntilDeadline(soll, new Date(ist + "T00:00:00"));
  // sollDays = soll - ist; Verzug = ist - soll = -sollDays
  const verzug = -sollDays;
  if (verzug === 0) return "pünktlich";
  if (verzug < 0) return `${Math.abs(verzug)} Tage vorzeitig`;
  return `${verzug} Tage Verzug`;
}

export default async function MeilensteineListPage({
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
    .from(schema.meilensteine)
    .where(
      and(
        eq(schema.meilensteine.workspaceId, workspaceId),
        eq(schema.meilensteine.projectId, id)
      )
    )
    .orderBy(asc(schema.meilensteine.sollDatum));

  const offen = rows.filter(
    (m) => m.status === "geplant" || m.status === "laufend"
  ).length;
  const verzoegert = rows.filter((m) => m.status === "verzoegert").length;
  const erreicht = rows.filter((m) => m.status === "erreicht").length;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Termine
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Bauterminplan auf Meilenstein-Ebene mit Soll-/Ist-Vergleich. Bewusst
          schlank — kein Vorgänger/Nachfolger-Modell, kein kritischer Pfad.
          Für detaillierte Terminplanung siehe MS Project / Asta Powerproject.
        </p>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            {rows.length} Meilenstein{rows.length === 1 ? "" : "e"} · {offen}{" "}
            offen · {erreicht} erreicht{verzoegert > 0
              ? ` · `
              : ""}
            {verzoegert > 0 ? (
              <span className="text-[color:var(--color-critical)]">
                {verzoegert} verzögert
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <section className="pb-10">
        <details
          open={rows.length === 0}
          className="border border-[color:var(--color-border)] rounded-md"
        >
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-[color:var(--color-bg-subtle)] transition-colors">
            + Neuer Meilenstein
          </summary>
          <form
            action={async (formData) => {
              "use server";
              await createMeilenstein(null, formData);
            }}
            className="px-5 pb-5 pt-2 grid gap-3"
          >
            <input type="hidden" name="projectId" value={id} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Bezeichnung
                </span>
                <input
                  type="text"
                  name="bezeichnung"
                  required
                  placeholder="z. B. Rohbau-Fertigstellung, Dichtigkeit Dach"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Soll-Datum
                </span>
                <input
                  type="date"
                  name="sollDatum"
                  required
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Beschreibung
              </span>
              <textarea
                name="beschreibung"
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
                Meilenstein anlegen
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="pb-16">
        {rows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch kein Meilenstein erfasst.
            </p>
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Bezeichnung</th>
                  <th className="px-3 py-3 text-left">Soll</th>
                  <th className="px-3 py-3 text-left">Ist / Abweichung</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-[color:var(--color-border)] align-top"
                  >
                    <td className="px-3 py-3">
                      <p className="font-medium">{m.bezeichnung}</p>
                      {m.beschreibung ? (
                        <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
                          {m.beschreibung}
                        </p>
                      ) : null}
                      {m.status === "verzoegert" && m.verzoegerungGrund ? (
                        <p className="text-[11px] text-[color:var(--color-critical)] mt-1 italic">
                          Grund: {m.verzoegerungGrund}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {formatDateShort(m.sollDatum)}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {m.istDatum ? (
                        <>
                          <p>{formatDateShort(m.istDatum)}</p>
                          <p className="text-[10px] text-[color:var(--color-fg-muted)]">
                            {abweichungLabel(m.sollDatum, m.istDatum)}
                          </p>
                        </>
                      ) : (
                        <span className="text-[color:var(--color-fg-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <form
                        action={updateMeilensteinStatus}
                        className="flex flex-wrap items-center gap-1"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <select
                          name="status"
                          defaultValue={m.status}
                          className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                        >
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          name="istDatum"
                          defaultValue={m.istDatum ?? ""}
                          className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs w-[130px]"
                          title="Ist-Datum (bei status=erreicht; sonst optional)"
                        />
                        <input
                          type="text"
                          name="verzoegerungGrund"
                          defaultValue={m.verzoegerungGrund ?? ""}
                          placeholder="Grund (bei verzögert)"
                          className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs flex-1 min-w-[120px]"
                        />
                        <button
                          type="submit"
                          className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]"
                        >
                          Speichern
                        </button>
                      </form>
                      <span
                        className={`mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[m.status]}`}
                      >
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <form action={deleteMeilenstein}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                        >
                          Löschen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}
