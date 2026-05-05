import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjectById } from "@/db/queries";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  createSachverstaendiger,
  deleteSachverstaendiger,
  updateSachverstaendigenStatus,
} from "./actions";
import type {
  SachverstaendigenAnlass,
  SachverstaendigenRechtsgrundlage,
  SachverstaendigenStatus,
  SachverstaendigenKostenTraeger,
} from "@/db/schema";

export const dynamic = "force-dynamic";

const ANLASS_LABEL: Record<SachverstaendigenAnlass, string> = {
  maengelstreit: "Mängelstreit",
  aufmassstreit: "Aufmaßstreit",
  baufortschritt: "Baufortschritt",
  baumangel: "Baumangel",
  sonstiges: "Sonstiges",
};

const RECHTSGRUNDLAGE_LABEL: Record<SachverstaendigenRechtsgrundlage, string> = {
  paragraph_485_zpo: "§ 485 ZPO (selbständiges Beweisverfahren)",
  privatauftrag: "Privatauftrag",
  gerichtsbeauftragt: "gerichtsbeauftragt",
  sonstiges: "Sonstiges",
};

const STATUS_LABEL: Record<SachverstaendigenStatus, string> = {
  angefragt: "Angefragt",
  beauftragt: "Beauftragt",
  gutachten_erhalten: "Gutachten erhalten",
  geschlossen: "Geschlossen",
};

const STATUS_TONE: Record<SachverstaendigenStatus, string> = {
  angefragt:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  beauftragt:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  gutachten_erhalten:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  geschlossen:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
};

const KOSTEN_TRAEGER_LABEL: Record<SachverstaendigenKostenTraeger, string> = {
  ag: "AG",
  an: "AN",
  geteilt: "geteilt",
  streit: "strittig",
};

export default async function SachverstaendigeListPage({
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
    .from(schema.sachverstaendige)
    .where(
      and(
        eq(schema.sachverstaendige.workspaceId, workspaceId),
        eq(schema.sachverstaendige.projectId, id)
      )
    )
    .orderBy(desc(schema.sachverstaendige.createdAt));

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Sachverständige
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Sachverständigen-Beauftragung dokumentieren — Privatgutachten,
          selbständiges Beweisverfahren (§ 485 ZPO) oder Gerichtsbeauftragung.
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
            + Neue Sachverständigen-Akte
          </summary>
          <form
            action={async (formData) => {
              "use server";
              await createSachverstaendiger(null, formData);
            }}
            className="px-5 pb-5 pt-2 grid gap-3"
          >
            <input type="hidden" name="projectId" value={id} />

            <div className="grid gap-3 md:grid-cols-2">
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
                  Rechtsgrundlage
                </span>
                <select
                  name="rechtsgrundlage"
                  required
                  defaultValue="privatauftrag"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                >
                  {Object.entries(RECHTSGRUNDLAGE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                Fragestellung
              </span>
              <textarea
                name="fragestellung"
                required
                rows={3}
                placeholder="Was soll der Sachverständige beantworten?"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Sachverständiger (Name)
                </span>
                <input
                  type="text"
                  name="sachverstaendigerName"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Organisation
                </span>
                <input
                  type="text"
                  name="sachverstaendigerOrganization"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  E-Mail
                </span>
                <input
                  type="email"
                  name="sachverstaendigerEmail"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Telefon
                </span>
                <input
                  type="tel"
                  name="sachverstaendigerPhone"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Beauftragt am
                </span>
                <input
                  type="date"
                  name="beauftragtAm"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Frist Gutachten
                </span>
                <input
                  type="date"
                  name="fristGutachten"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Kosten geschätzt (€)
                </span>
                <input
                  type="number"
                  step="0.01"
                  name="kostenGeschaetztEur"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                  Kostenträger
                </span>
                <select
                  name="kostenTraeger"
                  className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {Object.entries(KOSTEN_TRAEGER_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                Akte anlegen
              </button>
            </div>
          </form>
        </details>
      </section>

      <section className="pb-16">
        {rows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Sachverständigen-Akte erfasst.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((s) => (
              <li
                key={s.id}
                className="border border-[color:var(--color-border)] rounded-md p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      {ANLASS_LABEL[s.anlass]} · {RECHTSGRUNDLAGE_LABEL[s.rechtsgrundlage]}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {s.sachverstaendigerName ?? "—"}
                      {s.sachverstaendigerOrganization ? (
                        <span className="text-[color:var(--color-fg-muted)] font-normal">
                          {" "}
                          · {s.sachverstaendigerOrganization}
                        </span>
                      ) : null}
                    </p>
                    {(s.sachverstaendigerEmail || s.sachverstaendigerPhone) ? (
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
                        {[s.sachverstaendigerEmail, s.sachverstaendigerPhone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-block font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[s.status]}`}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>

                <p className="mt-2 text-sm whitespace-pre-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    Fragestellung
                  </span>
                  <br />
                  {s.fragestellung}
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-4 text-[11px] text-[color:var(--color-fg-muted)]">
                  <span>
                    Beauftragt: {formatDateShort(s.beauftragtAm)}
                  </span>
                  <span>
                    Frist: {formatDateShort(s.fristGutachten)}
                  </span>
                  <span>
                    Kosten:{" "}
                    {s.kostenGeschaetztCents
                      ? fmtMoney(s.kostenGeschaetztCents / 100)
                      : "—"}
                  </span>
                  <span>
                    Träger:{" "}
                    {s.kostenTraeger ? KOSTEN_TRAEGER_LABEL[s.kostenTraeger] : "—"}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-[color:var(--color-border)] flex flex-wrap items-end gap-2">
                  <form
                    action={updateSachverstaendigenStatus}
                    className="flex flex-wrap items-end gap-2 flex-1"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <label className="block">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        Status
                      </span>
                      <select
                        name="status"
                        defaultValue={s.status}
                        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block flex-1 min-w-[200px]">
                      <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        Ergebnis-Zusammenfassung (optional)
                      </span>
                      <input
                        type="text"
                        name="ergebnisZusammenfassung"
                        defaultValue={s.ergebnisZusammenfassung ?? ""}
                        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs"
                      />
                    </label>
                    <button
                      type="submit"
                      className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]"
                    >
                      Speichern
                    </button>
                  </form>
                  <form action={deleteSachverstaendiger}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                    >
                      Löschen
                    </button>
                  </form>
                </div>

                {s.notes ? (
                  <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)] italic">
                    {s.notes}
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
