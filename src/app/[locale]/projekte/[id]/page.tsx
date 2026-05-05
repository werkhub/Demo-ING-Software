import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { getAuditContext, logRead } from "@/lib/audit/log";
import { AuditHistoryLink } from "@/components/audit/audit-history-link";
import {
  getBautagebuchByProject,
  getContactsByProject,
  getFristenByProject,
  getNachtraegeByProject,
  getProjectById,
  getQueriesByProject,
  getSecuritiesByProject,
  getVorgaengeByProject,
} from "@/db/queries";
import {
  fmtMoney,
  formatDateShort,
  timeAgo,
  urgencyClasses,
  urgencyLabel,
} from "@/lib/utils";
import { deleteProject } from "../actions";
import { deleteFrist, toggleFristCompleted } from "@/app/[locale]/fristen/actions";
import { deleteNachtrag } from "./nachtrag-actions";
import { deleteContact } from "./contact-actions";
import { NachtragForm } from "./nachtrag-form";
import { ContactForm } from "./contact-form";
import {
  CATEGORY_LABEL,
  WEATHER_LABEL,
} from "@/app/[locale]/bautagebuch/constants";
import type { ProjectStatus, ContractType } from "@/db/schema";
import {
  VORGANG_CATEGORY_LABEL,
  VORGANG_STATUS_LABEL,
  VORGANG_STATUS_TONE,
} from "@/lib/vorgang";
import { RiskScorePill } from "@/components/vorgang/RiskScorePill";
import { PhasenStepper } from "@/components/projekt/PhasenStepper";
import { AbnahmeSection } from "./abnahme-section";
import { SicherheitenSection } from "./sicherheiten-section";
import { LpSollIstSection } from "./lp-soll-ist-section";

export const dynamic = "force-dynamic";

const statusClass: Record<ProjectStatus, string> = {
  Geplant:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  Bauphase:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  Abnahme:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  Gewährleistung:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  Abgeschlossen:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const contractTypeLabel: Record<ContractType, string> = {
  bgb_werkvertrag: "BGB-Werkvertrag",
  vob_vertrag: "VOB-Vertrag",
  verbraucherbauvertrag: "Verbraucherbauvertrag (§ 650i BGB)",
};

const nachtragStatusLabel: Record<string, string> = {
  entwurf: "Entwurf",
  angekuendigt: "Angekündigt",
  eingereicht: "Eingereicht",
  anerkannt: "Anerkannt",
  abgelehnt: "Abgelehnt",
  geschlossen: "Geschlossen",
};

const contactRoleLabel: Record<string, string> = {
  ag_vertreter: "AG-Vertreter",
  architekt: "Architekt",
  fachplaner: "Fachplaner",
  bauleiter_ag: "Bauleiter AG",
  nachunternehmer: "Nachunternehmer",
  sachverstaendiger: "Sachverständiger",
  anwalt: "Anwalt",
  sonstiges: "Sonstiges",
};

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const workspace = await getCurrentWorkspace();
  const isIngenieurbuero = workspace.workspaceRole === "ingenieurbuero";

  // Sensitive-Read-Logging: nur bei vertraulichen Projekten —
  // siehe schema.projects.vertraulich.
  if (project.vertraulich) {
    const userId = await getCurrentUserId();
    await logRead({
      workspaceId,
      entityType: "project",
      entityId: project.id,
      ctx: await getAuditContext(userId),
      reason: "Vertrauliches Projekt",
    });
  }
  const [
    fristen,
    bautagebuch,
    queries,
    nachtraege,
    contacts,
    vorgaenge,
    contracts,
    rechnungen,
    securities,
  ] = await Promise.all([
    getFristenByProject(id),
    getBautagebuchByProject(id, 10),
    getQueriesByProject(id, 10),
    getNachtraegeByProject(id),
    getContactsByProject(id),
    getVorgaengeByProject(id),
    db
      .select()
      .from(schema.contracts)
      .where(
        and(
          eq(schema.contracts.workspaceId, workspaceId),
          eq(schema.contracts.projectId, id)
        )
      ),
    db
      .select()
      .from(schema.rechnungen)
      .where(
        and(
          eq(schema.rechnungen.workspaceId, workspaceId),
          eq(schema.rechnungen.projectId, id)
        )
      ),
    getSecuritiesByProject(id),
  ]);

  const openFristen = fristen
    .filter((f) => !f.completed)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
  const offeneNachtraege = nachtraege.filter(
    (n) => n.status !== "geschlossen" && n.status !== "abgelehnt"
  );
  const nachtragsVolumen = offeneNachtraege.reduce((s, n) => s + n.value, 0);

  const offeneVorgaenge = vorgaenge.filter(
    (v) => v.status !== "abgeschlossen" && v.status !== "archiviert"
  );
  const fristenKritisch = openFristen.filter((f) => f.urgency === "critical").length;
  const fristenWarn = openFristen.filter((f) => f.urgency === "warning").length;
  const vorgangScore = Math.min(100, offeneVorgaenge.length * 15);
  const fristScore = Math.min(100, fristenKritisch * 30 + fristenWarn * 10);
  const maengelScore = Math.min(
    100,
    offeneVorgaenge.filter((v) => v.category === "maengelruege").length * 25
  );
  const rechnungAnomalieScore = rechnungen.length === 0
    ? 0
    : Math.min(100, Math.round(rechnungen.reduce((s, r) => s + r.anomalyScore, 0) / rechnungen.length));
  const overallRisk = Math.round(
    0.3 * fristScore + 0.25 * vorgangScore + 0.2 * maengelScore + 0.25 * rechnungAnomalieScore
  );

  const contractsByKind = {
    hauptvertrag: contracts.filter((c) => c.kind === "hauptvertrag"),
    nachtragsvertrag: contracts.filter((c) => c.kind === "nachtragsvertrag"),
    buergschaft: contracts.filter((c) => c.kind === "buergschaft"),
    vereinbarung: contracts.filter((c) => c.kind === "vereinbarung"),
  };

  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href="/projekte"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Alle Projekte
        </Link>

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              {project.identifier}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
              {project.name}
            </h1>
            <p className="mt-2 text-base text-[color:var(--color-fg-muted)]">
              {project.ag}
              {project.siteAddress ? (
                <>
                  {" · "}
                  <span className="font-mono text-sm">{project.siteAddress}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-1 ${statusClass[project.status]}`}
            >
              {project.status}
            </span>
            {isIngenieurbuero ? (
              <Link
                href={`/projekte/${id}/hoai`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → HOAI
              </Link>
            ) : null}
            {isIngenieurbuero ? (
              <Link
                href={`/projekte/${id}/bauwerke`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → Bauwerke
              </Link>
            ) : null}
            {isIngenieurbuero ? (
              <Link
                href={`/projekte/${id}/subplaner`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → Subplaner
              </Link>
            ) : null}
            <Link
              href={`/projekte/${id}/lv`}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              → LV
            </Link>
            {!isIngenieurbuero ? (
              <Link
                href={`/projekte/${id}/aufmass`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → Aufmaß
              </Link>
            ) : null}
            <Link
              href={`/projekte/${id}/ausgangsrechnungen`}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              → Rechnungen
            </Link>
            {!isIngenieurbuero ? (
              <Link
                href={`/projekte/${id}/material`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → Material
              </Link>
            ) : null}
            <Link
              href={`/projekte/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              Bearbeiten
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <PhasenStepper projectId={id} currentStatus={project.status} />
      </section>

      <section className="pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-3">
          Werkzeuge
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projekte/${id}/termine`}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            → Termine
          </Link>
          <Link
            href={`/projekte/${id}/medien`}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            → Medien
          </Link>
          <Link
            href={`/projekte/${id}/sachverstaendige`}
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            → Sachverständige
          </Link>
          {isIngenieurbuero ? (
            <>
              <Link
                href={`/projekte/${id}/hinweise`}
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                → Hinweise
              </Link>
              <Link
                href={`/projekte/${id}/bemusterung`}
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                → Bemusterung
              </Link>
            </>
          ) : null}
        </div>
      </section>

      {isIngenieurbuero ? (
        <LpSollIstSection workspaceId={workspaceId} project={project} />
      ) : null}

      <section className="pb-8">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
          <Stat label="Auftragsvolumen" value={fmtMoney(project.value)} />
          <Stat
            label="Fortschritt"
            value={`${Math.round(project.progress * 100)} %`}
          />
          <Stat
            label="Offene Fristen"
            value={String(openFristen.length)}
            critical={openFristen.some((f) => f.urgency === "critical")}
          />
          <Stat
            label="Nachträge offen"
            value={
              offeneNachtraege.length === 0
                ? "—"
                : `${offeneNachtraege.length} · ${fmtMoney(nachtragsVolumen)}`
            }
          />
        </div>
      </section>

      {project.status === "Abnahme" ? (
        <AbnahmeSection
          projectId={id}
          abnahmeDate={project.abnahmeDate}
          warrantyEnd={project.warrantyEnd}
          contractType={project.contractType as ContractType | null}
          fristen={openFristen.map((f) => ({
            id: f.id,
            task: f.task,
            deadline: f.deadline,
            legalBasis: f.legalBasis,
            daysRemaining: f.daysRemaining,
            urgency: f.urgency,
          }))}
          abnahmeMaengelVorgaenge={vorgaenge
            .filter((v) => v.category === "maengelruege")
            .map((v) => ({
              id: v.id,
              title: v.title,
              status: v.status,
              category: v.category,
              riskScore: v.riskScore,
              dueDate: v.dueDate,
              createdAt: v.createdAt,
            }))}
        />
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-2 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold tracking-tight">
          Mängelmanagement
        </h2>
        <Link
          href={`/projekte/${id}/maengel`}
          className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          → Mängel-Liste
        </Link>
      </section>

      <SicherheitenSection project={project} securities={securities} />

      <section className="grid gap-12 md:grid-cols-3 pb-12">
        {/* === LINKE SPALTE: Fakten === */}
        <div className="md:col-span-1 space-y-8">
          <FactsBlock title="Vertrag">
            <Fact label="Vertragsgrundlage">
              {project.contractType
                ? contractTypeLabel[project.contractType as ContractType]
                : "—"}
            </Fact>
            <Fact label="Vertragsdatum">{formatDateShort(project.contractDate)}</Fact>
            <Fact label="Vertragsstrafe">
              {project.penaltyClauseAgreed ? "ja" : "nein"}
            </Fact>
            <Fact label="Sicherheitseinbehalt">
              {project.securityRetentionPercent !== null &&
              project.securityRetentionPercent !== undefined
                ? `${project.securityRetentionPercent} %`
                : "—"}
            </Fact>
          </FactsBlock>

          <FactsBlock title="Termine">
            <Fact label="Geplante Fertigstellung">
              {formatDateShort(project.plannedCompletion)}
            </Fact>
            <Fact label="Tatsächliche Abnahme">
              {formatDateShort(project.abnahmeDate)}
            </Fact>
            <Fact label="Ende Gewährleistung">
              {formatDateShort(project.warrantyEnd)}
            </Fact>
          </FactsBlock>

          <FactsBlock title="Beteiligte">
            {contacts.length === 0 ? (
              <p className="text-xs text-[color:var(--color-fg-muted)] italic">
                Noch keine Kontakte erfasst.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {contacts.map((c) => (
                  <li
                    key={c.id}
                    className="border-l-2 border-[color:var(--color-border)] pl-3 group/contact"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                        {contactRoleLabel[c.role] ?? c.role}
                      </p>
                      <form action={deleteContact}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          aria-label="Kontakt löschen"
                          className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] opacity-0 group-hover/contact:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                    <p className="mt-1 font-medium">{c.name}</p>
                    {c.organization ? (
                      <p className="text-xs text-[color:var(--color-fg-muted)]">
                        {c.organization}
                      </p>
                    ) : null}
                    {c.email || c.phone ? (
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-1 font-mono">
                        {c.email}
                        {c.email && c.phone ? " · " : ""}
                        {c.phone}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <ContactForm projectId={id} />
            </div>
          </FactsBlock>

          {project.notes ? (
            <FactsBlock title="Notizen">
              <p className="text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap leading-relaxed">
                {project.notes}
              </p>
            </FactsBlock>
          ) : null}
        </div>

        {/* === RECHTE SPALTE === */}
        <div className="md:col-span-2 space-y-12">
          <Block title={`Offene Fristen · ${openFristen.length}`}>
            {openFristen.length === 0 ? (
              <EmptyState text="Keine offenen Fristen für dieses Projekt." />
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {openFristen.map((f) => (
                  <li
                    key={f.id}
                    className="py-4 flex items-center gap-4 flex-wrap"
                  >
                    <div
                      className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 inline-block shrink-0 ${urgencyClasses(f.urgency)}`}
                    >
                      {urgencyLabel(f.daysRemaining)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.task}</p>
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
                        {formatDateShort(f.deadline)}
                        {f.legalBasis ? (
                          <>
                            {" · "}
                            <span className="font-mono">{f.legalBasis}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <form action={toggleFristCompleted}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white text-xs px-3 py-1 transition-colors"
                        >
                          Erledigen
                        </button>
                      </form>
                      <form action={deleteFrist}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          aria-label="Frist löschen"
                          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Link
                href="/fristen"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
              >
                Frist anlegen → /fristen
              </Link>
            </div>
          </Block>

          <Block title={`Nachträge · ${nachtraege.length}`}>
            {nachtraege.length === 0 ? (
              <EmptyState text="Keine Nachträge erfasst." />
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {nachtraege.map((n) => (
                  <li key={n.id} className="py-3 group/nt">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium">{n.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                          {nachtragStatusLabel[n.status] ?? n.status}
                        </span>
                        <form action={deleteNachtrag}>
                          <input type="hidden" name="id" value={n.id} />
                          <button
                            type="submit"
                            aria-label="Nachtrag löschen"
                            className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] opacity-0 group-hover/nt:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                      {fmtMoney(n.value)}
                      {n.legalBasis ? (
                        <>
                          {" · "}
                          <span className="font-mono">{n.legalBasis}</span>
                        </>
                      ) : null}
                    </p>
                    {n.description ? (
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {n.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <NachtragForm projectId={id} />
            </div>
          </Block>

          <Block title={`Bautagebuch · ${bautagebuch.length} Einträge`}>
            {bautagebuch.length === 0 ? (
              <EmptyState text="Noch keine Bautagebuch-Einträge." />
            ) : (
              <BautagebuchByDay entries={bautagebuch} />
            )}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Link
                href={`/projekte/${id}/bautagebuch`}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
              >
                Witterung & Fotos →
              </Link>
              <Link
                href="/bautagebuch"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                Neuer Eintrag → /bautagebuch
              </Link>
              <Link
                href={`/bautagebuch/print?project=${id}`}
                target="_blank"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                Druckansicht ↗
              </Link>
            </div>
          </Block>

          <Block title={`Anfragen an Recht-Assistent · ${queries.length}`}>
            {queries.length === 0 ? (
              <EmptyState text="Noch keine Anfragen zu diesem Projekt." />
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {queries.map((q) => (
                  <li key={q.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                        {q.category ?? "Allgemein"}
                      </span>
                      <span className="text-xs text-[color:var(--color-fg-muted)]">
                        {timeAgo(q.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{q.question}</p>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </section>

      <section className="pb-12 border-t border-[color:var(--color-border)] pt-10">
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Vorgänge zu diesem Projekt · {vorgaenge.length}
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/vorgaenge?projectId=${id}`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              Liste filtern →
            </Link>
            <Link
              href="/vorgaenge/new"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
            >
              Neu anlegen
            </Link>
          </div>
        </div>
        {vorgaenge.length === 0 ? (
          <EmptyState text="Noch keine Vorgänge in diesem Projekt." />
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {vorgaenge.slice(0, 8).map((v) => (
              <li key={v.id}>
                <Link
                  href={`/vorgaenge/${v.id}`}
                  className="flex items-center gap-3 py-3 group"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] w-28 shrink-0">
                    {VORGANG_CATEGORY_LABEL[v.category]}
                  </span>
                  <p className="flex-1 text-sm text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors truncate">
                    {v.title}
                  </p>
                  {v.dueDate ? (
                    <span className="text-[11px] text-[color:var(--color-fg-muted)] shrink-0">
                      {formatDateShort(v.dueDate)}
                    </span>
                  ) : null}
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 shrink-0 ${VORGANG_STATUS_TONE[v.status]}`}
                  >
                    {VORGANG_STATUS_LABEL[v.status]}
                  </span>
                  <RiskScorePill score={v.riskScore} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {vorgaenge.length > 8 ? (
          <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-3 text-center">
            +{vorgaenge.length - 8} weitere — siehe Vorgangs-Liste.
          </p>
        ) : null}
      </section>

      <section className="pb-12">
        <h2 className="text-xl font-semibold tracking-tight mb-5">
          Vertragslage · {contracts.length}
        </h2>
        {contracts.length === 0 ? (
          <EmptyState text="Noch keine Verträge erfasst." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <ContractGroup title="Hauptvertrag" items={contractsByKind.hauptvertrag} />
            <ContractGroup
              title="Nachtragsverträge"
              items={contractsByKind.nachtragsvertrag}
            />
            <ContractGroup
              title="Bürgschaften"
              items={contractsByKind.buergschaft}
            />
            <ContractGroup
              title="Vereinbarungen"
              items={contractsByKind.vereinbarung}
            />
          </div>
        )}
        <p className="mt-4">
          <Link
            href="/vertrag"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
          >
            Vertrag scannen → /vertrag
          </Link>
        </p>
      </section>

      <section className="pb-12">
        <h2 className="text-xl font-semibold tracking-tight mb-5">
          Risiko-Indikator
        </h2>
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-5">
          <RiskTile label="Frist-Druck" score={fristScore} />
          <RiskTile label="Vorgangsstau" score={vorgangScore} />
          <RiskTile label="Mängel" score={maengelScore} />
          <RiskTile label="Rechnung-Anomalien" score={rechnungAnomalieScore} />
          <RiskTile label="Gesamt" score={overallRisk} highlight />
        </div>
        <p className="mt-3 text-[11px] italic text-[color:var(--color-fg-muted)]">
          Heuristische Aggregation aus offenen Fristen, offenen Vorgängen,
          Mängelrügen und Anomalie-Score der Eingangsrechnungen. Ersetzt keine
          juristische Bewertung.
        </p>
      </section>

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-10">
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors">
            Gefahrenzone — Projekt löschen
          </summary>
          <div className="mt-4 max-w-md">
            <p className="text-sm text-[color:var(--color-fg-muted)] mb-3">
              Löscht das Projekt unwiderruflich. Verknüpfte Fristen, Bautagebuch-Einträge,
              Nachträge und Kontakte werden mit gelöscht.
            </p>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={project.id} />
              <button
                type="submit"
                className="text-sm rounded-full border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] px-4 py-2 hover:bg-[color:var(--color-critical)] hover:text-white transition-colors"
              >
                Projekt unwiderruflich löschen
              </button>
            </form>
          </div>
        </details>
      </section>
    </Container>
  );
}

function Stat({
  label,
  value,
  critical,
}: {
  label: string;
  value: string;
  critical?: boolean;
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          critical
            ? "text-[color:var(--color-critical)]"
            : "text-[color:var(--color-fg)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
        {title}
      </p>
      {children}
    </section>
  );
}

function FactsBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-3">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm border-b border-[color:var(--color-border)] pb-2">
      <span className="text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
        {label}
      </span>
      <span className="text-[color:var(--color-fg)] text-right">{children}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm text-[color:var(--color-fg-muted)] py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
      {text}
    </p>
  );
}

function RiskTile({
  label,
  score,
  highlight,
}: {
  label: string;
  score: number;
  highlight?: boolean;
}) {
  const tone =
    score >= 70
      ? "text-[color:var(--color-critical)]"
      : score >= 40
        ? "text-[color:var(--color-warning)]"
        : score >= 15
          ? "text-[color:var(--color-accent)]"
          : "text-[color:var(--color-fg-muted)]";
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${highlight ? "text-[color:var(--color-fg)] font-semibold" : "text-[color:var(--color-fg-muted)]"}`}
      >
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>
        {score}
      </p>
    </div>
  );
}

function ContractGroup({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; signedAt?: string | null; riskScore: number | null }[];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-2">
        {title} · {items.length}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-[color:var(--color-fg-muted)] italic">
          —
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {items.map((c) => (
            <li
              key={c.id}
              className="py-2.5 flex items-baseline justify-between gap-3"
            >
              <p className="text-sm font-medium truncate">{c.title}</p>
              <div className="flex items-center gap-2 shrink-0">
                {c.signedAt ? (
                  <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                    {c.signedAt}
                  </span>
                ) : null}
                {typeof c.riskScore === "number" ? (
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${
                      c.riskScore >= 60
                        ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
                        : c.riskScore >= 30
                          ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
                          : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
                    }`}
                  >
                    {c.riskScore}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type BautagebuchEntryMin = {
  id: string;
  authorName: string;
  text: string;
  category: keyof typeof CATEGORY_LABEL;
  entryDate: string;
  weatherCondition: keyof typeof WEATHER_LABEL | null;
  temperatureCelsius: number | null;
  staffHoursOwn: number | null;
  staffHoursSubcontractors: number | null;
  triggerLabel: string | null;
  urgency: "critical" | "warning" | "info";
  createdAt: Date;
};

function BautagebuchByDay({ entries }: { entries: BautagebuchEntryMin[] }) {
  const groups = entries.reduce<Map<string, BautagebuchEntryMin[]>>((acc, e) => {
    if (!acc.has(e.entryDate)) acc.set(e.entryDate, []);
    acc.get(e.entryDate)!.push(e);
    return acc;
  }, new Map());

  const sortedDays = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {sortedDays.map((day) => {
        const dayEntries = groups.get(day)!;
        const totalHours = dayEntries.reduce(
          (s, e) => s + (e.staffHoursOwn ?? 0) + (e.staffHoursSubcontractors ?? 0),
          0
        );
        return (
          <div key={day}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg)] font-medium">
                {formatDateShort(day)}
              </p>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                {dayEntries.length} {dayEntries.length === 1 ? "Eintrag" : "Einträge"}
                {totalHours > 0 ? ` · ${totalHours} h` : ""}
              </span>
            </div>
            <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {dayEntries.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-sm px-1.5 py-0.5">
                        {CATEGORY_LABEL[e.category]}
                      </span>
                      <span className="text-[11px] text-[color:var(--color-fg-muted)]">
                        {e.authorName}
                      </span>
                      {e.weatherCondition ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                          {WEATHER_LABEL[e.weatherCondition]}
                          {e.temperatureCelsius !== null
                            ? ` · ${e.temperatureCelsius} °C`
                            : ""}
                        </span>
                      ) : null}
                    </div>
                    {e.triggerLabel ? (
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${urgencyClasses(e.urgency)}`}
                      >
                        {e.triggerLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-snug whitespace-pre-wrap">{e.text}</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
