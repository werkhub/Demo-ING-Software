import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import {
  LEISTUNGSBEREICH_LABEL,
  SUBPLANER_STATUS_COLOR,
  SUBPLANER_STATUS_LABEL,
} from "@/lib/subplaner/meta";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import { updateSubplanerStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_FLOW: Record<string, Array<{ value: string; label: string }>> = {
  angefragt: [
    { value: "beauftragt", label: "→ beauftragt" },
    { value: "storniert", label: "stornieren" },
  ],
  beauftragt: [
    { value: "abgeschlossen", label: "→ abgeschlossen" },
    { value: "storniert", label: "stornieren" },
  ],
  abgeschlossen: [],
  storniert: [{ value: "angefragt", label: "reaktivieren" }],
};

export default async function SubplanerListPage({
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
  if (workspace.workspaceRole !== "ingenieurbuero") {
    redirect(`/projekte/${id}`);
  }

  const vergaben = await db
    .select()
    .from(schema.subplanerVergaben)
    .where(eq(schema.subplanerVergaben.projektId, id));

  const summeBeauftragt = vergaben
    .filter((v) => v.status !== "storniert" && v.vergabeSummeCents !== null)
    .reduce((s, v) => s + (v.vergabeSummeCents ?? 0), 0);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Subplaner-Vergabe
          </h1>
          <Link
            href={`/projekte/${id}/subplaner/new`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neue Vergabe
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Fachplaner-Leistungen, die an externe Büros vergeben werden
          (Tragwerk, TGA, Brandschutz, Vermessung, Geotechnik, Schall).
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

      {vergaben.length > 0 ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-2">
          <p className="text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              Vergabesumme aktiv
            </span>
            <span className="ml-3 font-mono">
              {fmtMoney(summeBeauftragt / 100)}
            </span>
          </p>
        </section>
      ) : null}

      {vergaben.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Subplaner vergeben.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16 pt-6">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {vergaben.map((v) => {
              const lps = (() => {
                if (!v.lpReferenzJson) return null;
                try {
                  const arr = JSON.parse(v.lpReferenzJson);
                  return Array.isArray(arr) ? (arr as number[]) : null;
                } catch {
                  return null;
                }
              })();
              return (
                <li key={v.id} className="py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[color:var(--color-fg)]">
                          {v.fachplanerName}
                        </p>
                        <span className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                          {LEISTUNGSBEREICH_LABEL[v.leistungsbereich] ??
                            v.leistungsbereich}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${SUBPLANER_STATUS_COLOR[v.status]}`}
                        >
                          {SUBPLANER_STATUS_LABEL[v.status]}
                        </span>
                        {lps && lps.length > 0 ? (
                          <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                            LP {lps.join(", ")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {v.fachplanerKontakt
                          ? `${v.fachplanerKontakt} · `
                          : ""}
                        {v.vergabeDatum
                          ? `Vergabe ${formatDateShort(v.vergabeDatum)}`
                          : "ohne Vergabedatum"}
                        {v.vergabeSummeCents !== null
                          ? ` · ${fmtMoney(v.vergabeSummeCents / 100)}`
                          : ""}
                      </p>
                      {v.notes ? (
                        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] whitespace-pre-line">
                          {v.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {(STATUS_FLOW[v.status] ?? []).map((opt) => (
                        <form
                          key={opt.value}
                          action={updateSubplanerStatus}
                          className="inline"
                        >
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="status" value={opt.value} />
                          <button
                            type="submit"
                            className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-[11px] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                          >
                            {opt.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}
