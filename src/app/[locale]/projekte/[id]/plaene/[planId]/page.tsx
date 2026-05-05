import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  getFreigabenByVersion,
  getPlan,
  getProjectById,
  getVersionsByPlan,
} from "@/db/queries";
import {
  FREIGABE_STATUS_LABEL,
  PLAN_STATUS_LABEL,
  PLAN_TYP_LABEL,
  aggregateFreigabeStatus,
} from "@/lib/plaene";
import { formatDateShort } from "@/lib/utils";
import { updateFreigabe, deleteFreigabe, deletePlan } from "../actions";
import type { FreigabeStatus } from "@/db/schema";
import { PlanVersandSection } from "./versand-section";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const plan = await getPlan(planId);
  if (!plan || plan.projektId !== id) notFound();

  const versionen = await getVersionsByPlan(planId);
  const aktuelle = versionen.find((v) => v.id === plan.aktuelleVersionId);
  const freigaben = aktuelle ? await getFreigabenByVersion(aktuelle.id) : [];
  const agg = aggregateFreigabeStatus(
    freigaben.map((f) => f.freigabeStatus as FreigabeStatus)
  );

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-border)]">
                {PLAN_TYP_LABEL[plan.planTyp] ?? plan.planTyp}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-border)]">
                {PLAN_STATUS_LABEL[plan.status]}
              </span>
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tighter">
              {plan.planNr} — {plan.bezeichnung}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {plan.masstab ? `M ${plan.masstab} · ` : ""}
              {plan.planerName ? `${plan.planerName} · ` : ""}
              {plan.datum ? formatDateShort(plan.datum) : "kein Datum"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/projekte/${id}/plaene/${plan.id}/version/new`}
              className="rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + Neue Version
            </Link>
            {aktuelle ? (
              <Link
                href={`/projekte/${id}/plaene/${plan.id}/freigabe/new`}
                className="rounded-full border border-[color:var(--color-fg)] px-4 py-2 text-sm hover:bg-[color:var(--color-fg)] hover:text-[color:var(--color-bg)] transition-colors"
              >
                + Freigabe anfordern
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/plaene`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zur Plan-Liste
          </Link>
        </div>
      </section>

      <section className="pb-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Versionen
        </h2>
        {versionen.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
            Keine Version hochgeladen.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {versionen.map((v) => {
              const isCurrent = v.id === plan.aktuelleVersionId;
              const fileUrl = `/api/uploads/plaene/${plan.workspaceId}/${plan.id}/v${v.versionNr}/${encodeURIComponent(v.filename)}`;
              const indexBadgeTone =
                v.indexKategorie === "entwurf"
                  ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
                  : "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]";
              return (
                <li key={v.id} className="py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center justify-center font-mono text-xs font-semibold border rounded-md px-2.5 py-1 min-w-[2.5rem] text-center ${indexBadgeTone}`}
                        title={
                          v.indexKategorie === "entwurf"
                            ? "Entwurfsstand (Vorab-Version)"
                            : "Freigegebener Stand"
                        }
                      >
                        {v.indexLabel ?? `v${v.versionNr}`}
                      </span>
                      {isCurrent ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] border-[color:var(--color-accent)]">
                          aktuell
                        </span>
                      ) : null}
                      <span className="text-[color:var(--color-fg)]">{v.filename}</span>
                    </p>
                    <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                      {v.datum ? formatDateShort(v.datum) + " · " : ""}
                      {(v.sizeBytes / 1024).toFixed(0)} kB
                      {v.kommentar ? ` · ${v.kommentar}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projekte/${id}/plaene/${plan.id}/versand/new?versionId=${v.id}`}
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      → Versand
                    </Link>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[color:var(--color-accent)] hover:underline"
                    >
                      öffnen ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {aktuelle ? (
        <section className="pb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              Freigaben (v{aktuelle.versionNr})
            </h2>
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              {agg.zugestimmt}/{agg.total} zugestimmt
              {agg.abgelehnt > 0 ? ` · ${agg.abgelehnt} abgelehnt` : ""}
              {agg.offen > 0 ? ` · ${agg.offen} offen` : ""}
            </p>
          </div>
          {freigaben.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Freigaben angefordert.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {freigaben.map((f) => (
                <li key={f.id} className="py-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {f.freigabeDurchName ?? f.freigabeDurchUserId ?? "Unbekannt"}
                        {f.freigabeRolle ? ` · ${f.freigabeRolle}` : ""}
                      </p>
                      <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                        Status: {FREIGABE_STATUS_LABEL[f.freigabeStatus as FreigabeStatus]}
                        {f.freigabeDatum
                          ? ` · ${formatDateShort(f.freigabeDatum)}`
                          : ""}
                      </p>
                      {f.freigabeKommentar ? (
                        <p className="mt-1 text-xs">{f.freigabeKommentar}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <form action={updateFreigabe} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={f.id} />
                        <select
                          name="freigabeStatus"
                          defaultValue={f.freigabeStatus}
                          className="text-xs border border-[color:var(--color-border)] rounded-sm px-2 py-1 bg-transparent"
                        >
                          <option value="offen">Offen</option>
                          <option value="zugestimmt">Zugestimmt</option>
                          <option value="abgelehnt">Abgelehnt</option>
                          <option value="zurueckgestellt">Zurückgestellt</option>
                        </select>
                        <input
                          name="freigabeKommentar"
                          defaultValue={f.freigabeKommentar ?? ""}
                          placeholder="Kommentar"
                          className="text-xs border border-[color:var(--color-border)] rounded-sm px-2 py-1 bg-transparent w-44"
                        />
                        <button
                          type="submit"
                          className="text-xs underline hover:text-[color:var(--color-accent)]"
                        >
                          speichern
                        </button>
                      </form>
                      <form action={deleteFreigabe}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-xs text-[color:var(--color-critical)] hover:underline"
                        >
                          löschen
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <PlanVersandSection
        workspaceId={plan.workspaceId}
        planId={plan.id}
        projectId={id}
        versionLabels={
          new Map(
            versionen.map((v) => [
              v.id,
              v.indexLabel ?? `v${v.versionNr}`,
            ])
          )
        }
      />

      {plan.notes ? (
        <section className="pb-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Notizen
          </h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{plan.notes}</p>
        </section>
      ) : null}

      <section className="pb-16">
        <form action={deletePlan}>
          <input type="hidden" name="id" value={plan.id} />
          <button
            type="submit"
            className="text-xs text-[color:var(--color-critical)] hover:underline"
          >
            Plan komplett löschen
          </button>
        </form>
      </section>
    </Container>
  );
}
