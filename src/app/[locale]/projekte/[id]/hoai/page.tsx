import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace, getCurrentWorkspaceId } from "@/lib/session";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import { ProjectHoaiForm } from "./hoai-form";
import {
  createKostenVersion,
  deleteKostenVersion,
} from "./kosten-versionen-actions";
import type { HoaiKostenAnlass } from "@/db/schema";

export const dynamic = "force-dynamic";

const ANLASS_LABEL: Record<HoaiKostenAnlass, string> = {
  planung_grundlage: "Planungsgrundlage",
  kostenanschlag: "Kostenanschlag",
  kostenfeststellung: "Kostenfeststellung",
  aenderung_ag: "Änderung AG",
  aenderung_planung: "Änderung Planung",
};

export default async function ProjectHoaiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, workspace] = await Promise.all([
    getProjectById(id),
    getCurrentWorkspace(),
  ]);
  if (!project) notFound();

  // HOAI-Felder sind nur für Ingenieurbüros relevant — bei anderen
  // Workspace-Typen direkt zurück zur Projekt-Detail-Seite.
  if (workspace.workspaceRole !== "ingenieurbuero") {
    redirect(`/projekte/${id}`);
  }

  const workspaceId = await getCurrentWorkspaceId();
  const versionen = await db
    .select()
    .from(schema.hoaiKostenVersionen)
    .where(
      and(
        eq(schema.hoaiKostenVersionen.workspaceId, workspaceId),
        eq(schema.hoaiKostenVersionen.projectId, id)
      )
    )
    .orderBy(desc(schema.hoaiKostenVersionen.effectiveAt));

  const today = new Date().toISOString().slice(0, 10);

  // Beauftragte LPs aus JSON parsen für Initialwert
  const initialLps: number[] = (() => {
    if (!project.hoaiBeauftragteLpsJson) return [];
    try {
      const parsed = JSON.parse(project.hoaiBeauftragteLpsJson);
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
    } catch {
      return [];
    }
  })();

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href={`/projekte/${id}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zum Projekt
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          HOAI-Honorar · {project.identifier}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          {project.name}
        </h1>
        <p className="mt-3 text-base text-[color:var(--color-fg-muted)]">
          Honorar nach HOAI 2021. Eingaben werden am Projekt gespeichert und
          die Honorarsumme als KPI in der Projekt-Liste angezeigt.
        </p>

        <ProjectHoaiForm
          projectId={project.id}
          initial={{
            leistungsbild: project.hoaiLeistungsbild,
            zone: project.hoaiHonorarzone,
            satz: project.hoaiSatz ?? "mittel",
            anrechenbareKostenCents:
              project.hoaiAnrechenbareKostenCents ?? null,
            beauftragteLps: initialLps,
            umbauPct: project.hoaiUmbauZuschlagPct ?? 0,
            nebenkostenPct: project.hoaiNebenkostenPct ?? 5,
            honorarsummeNettoCents:
              project.hoaiHonorarsummeNettoCents ?? null,
            berechnetAm: project.hoaiBerechnetAm,
          }}
        />

        <section className="mt-12 pt-10 border-t border-[color:var(--color-border)]">
          <h2 className="text-xl font-semibold tracking-tight">
            Anrechenbare-Kosten-Historie
          </h2>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
            § 6 I HOAI definiert die anrechenbaren Kosten als Honorar-Grundlage,
            § 10 II sieht Anpassung bei Kostenänderungen vor. Die Historie
            sichert den Nach-Honoraranspruch im Streit.
          </p>

          <details className="mt-6 border border-[color:var(--color-border)] rounded-md">
            <summary className="cursor-pointer px-5 py-3 text-sm font-medium hover:bg-[color:var(--color-bg-subtle)] transition-colors">
              + Neue Kostengrundlage
            </summary>
            <form
              action={async (formData) => {
                "use server";
                await createKostenVersion(null, formData);
              }}
              className="px-5 pb-5 pt-2 grid gap-3"
            >
              <input type="hidden" name="projectId" value={id} />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                    Stichtag
                  </span>
                  <input
                    type="date"
                    name="effectiveAt"
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
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                    Anrechenbare Kosten (€ netto)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="anrechenbareKostenEur"
                    required
                    className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                    Honorarsumme netto (€, optional)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    name="honorarsummeNettoEur"
                    placeholder="Berechnung über HOAI-Rechner"
                    className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Notiz
                </span>
                <input
                  type="text"
                  name="notes"
                  placeholder="z. B. Mehrkosten-Anordnung AG vom 12.03."
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                >
                  Version speichern
                </button>
              </div>
            </form>
          </details>

          <div className="mt-6">
            {versionen.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Noch keine Kostenversion erfasst.
              </p>
            ) : (
              <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                    <tr>
                      <th className="px-3 py-3 text-left">Stichtag</th>
                      <th className="px-3 py-3 text-left">Anlass</th>
                      <th className="px-3 py-3 text-right">Anrechenbar</th>
                      <th className="px-3 py-3 text-right">Honorar netto</th>
                      <th className="px-3 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionen.map((v) => (
                      <tr
                        key={v.id}
                        className="border-t border-[color:var(--color-border)]"
                      >
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {formatDateShort(v.effectiveAt)}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {ANLASS_LABEL[v.anlass]}
                          {v.notes ? (
                            <p className="text-[10px] text-[color:var(--color-fg-muted)] mt-0.5">
                              {v.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {fmtMoney(v.anrechenbareKostenCents / 100)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {v.honorarsummeNettoCents
                            ? fmtMoney(v.honorarsummeNettoCents / 100)
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <form action={deleteKostenVersion}>
                            <input type="hidden" name="id" value={v.id} />
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
          </div>
        </section>
      </div>
    </Container>
  );
}
