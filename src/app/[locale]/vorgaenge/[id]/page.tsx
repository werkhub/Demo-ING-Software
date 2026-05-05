import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { eq, and, ne } from "drizzle-orm";
import { Container } from "@/components/container";
import {
  getBautagebuchByProject,
  getFristen,
  getProjectById,
  getProjects,
  getRechnungen,
  getVorgangAuditLog,
  getVorgangById,
  getVorgangCitations,
  getVorgangDocuments,
  getVorgangDrafts,
  getVorgangLinks,
  getVorgangSteps,
} from "@/db/queries";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { getAuditContext, logRead } from "@/lib/audit/log";
import { AuditHistoryLink } from "@/components/audit/audit-history-link";
import { formatDateShort } from "@/lib/utils";
import {
  VORGANG_CATEGORY_LABEL,
  VORGANG_STATUS_LABEL,
  VORGANG_STATUS_TONE,
} from "@/lib/vorgang";
import { RiskScorePill } from "@/components/vorgang/RiskScorePill";
import { CitationBadge } from "@/components/vorgang/CitationBadge";
import {
  VorgangTabs,
  VORGANG_TAB_KEYS,
  type VorgangTabKey,
} from "@/components/vorgang/VorgangTabs";
import { resolveTabKey } from "@/components/ui/tab-nav";
import { VorgangDocumentsPanel } from "@/components/vorgang/VorgangDocumentsPanel";
import { VorgangAnalysePanel } from "@/components/vorgang/VorgangAnalysePanel";
import { VorgangEmpfehlungPanel } from "@/components/vorgang/VorgangEmpfehlungPanel";
import { VorgangEntwurfEditor } from "@/components/vorgang/VorgangEntwurfEditor";
import { VorgangVerknuepfungen } from "@/components/vorgang/VorgangVerknuepfungen";
import { VorgangVerlauf } from "@/components/vorgang/VorgangVerlauf";
import {
  deleteVorgang,
  setVorgangStatus,
} from "../actions";
import type { VorgangLinkKind, VorgangStatus } from "@/db/schema";

export const dynamic = "force-dynamic";


export default async function VorgangDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = resolveTabKey<VorgangTabKey>(sp.tab, VORGANG_TAB_KEYS, "uebersicht");

  const vorgang = await getVorgangById(id);
  if (!vorgang) notFound();

  // Sensitive-Read-Logging: nur bei HinSchG-Vorgängen — siehe schema.vorgaenge.hinschg.
  if (vorgang.hinschg) {
    const userId = await getCurrentUserId();
    await logRead({
      workspaceId: vorgang.workspaceId,
      entityType: "vorgang",
      entityId: vorgang.id,
      ctx: await getAuditContext(userId),
      reason: "HinSchG-Vorgang",
    });
  }

  const [
    documents,
    steps,
    citations,
    drafts,
    auditLog,
    links,
    project,
    allProjects,
    fristenAll,
    rechnungenAll,
  ] = await Promise.all([
    getVorgangDocuments(id),
    getVorgangSteps(id),
    getVorgangCitations(id),
    getVorgangDrafts(id),
    getVorgangAuditLog(id),
    getVorgangLinks(id),
    vorgang.projectId ? getProjectById(vorgang.projectId) : Promise.resolve(null),
    getProjects(),
    getFristen(undefined, { includeCompleted: false }),
    getRechnungen({ limit: 50 }),
  ]);

  // Bautagebuch-Optionen abhängig vom Projekt (oder leer, wenn Vorgang projektlos)
  const bautagebuchOptions = vorgang.projectId
    ? await getBautagebuchByProject(vorgang.projectId, 100)
    : [];

  // Vertragsoptionen aus contracts
  const workspaceId = await getCurrentWorkspaceId();
  const contracts = await db
    .select({
      id: schema.contracts.id,
      title: schema.contracts.title,
      kind: schema.contracts.kind,
      projectId: schema.contracts.projectId,
    })
    .from(schema.contracts)
    .where(eq(schema.contracts.workspaceId, workspaceId));

  // Andere Vorgänge (für vorgang→vorgang Verlinkung)
  const otherVorgaenge = await db
    .select({
      id: schema.vorgaenge.id,
      title: schema.vorgaenge.title,
    })
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.workspaceId, workspaceId),
        ne(schema.vorgaenge.id, id)
      )
    )
    .limit(200);

  const linkOptions: Record<VorgangLinkKind, { id: string; label: string }[]> = {
    project: allProjects.map((p) => ({
      id: p.id,
      label: `${p.identifier} · ${p.name}`,
    })),
    contract: contracts.map((c) => ({
      id: c.id,
      label: `${c.title} · ${c.kind}`,
    })),
    bautagebuch: bautagebuchOptions.map((b) => ({
      id: b.id,
      label: `${b.entryDate} · ${b.text.slice(0, 60)}`,
    })),
    frist: fristenAll
      .filter((f) => !vorgang.projectId || f.projectId === vorgang.projectId)
      .map((f) => ({
        id: f.id,
        label: `${f.deadline} · ${f.task}`,
      })),
    vorgang: otherVorgaenge.map((v) => ({ id: v.id, label: v.title })),
    rechnung: rechnungenAll.map((r) => ({
      id: r.id,
      label: `${r.supplierName}${r.invoiceDate ? ` · ${r.invoiceDate}` : ""}`,
    })),
  };

  const counts: Partial<Record<VorgangTabKey, number>> = {
    dokumente: documents.length,
    analyse: steps.length,
    empfehlung: steps.filter((s) => s.kind === "empfehlung").length,
    entwurf: drafts.filter((d) => d.status !== "verworfen").length,
    verknuepfungen: links.length,
    verlauf: auditLog.length,
  };

  const offenerEntwurf = drafts.find((d) => d.status === "entwurf") ?? null;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <Link
          href="/vorgaenge"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Alle Vorgänge
        </Link>

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] flex items-center gap-2 flex-wrap">
              <span>{vorgang.id}</span>
              <span aria-hidden>·</span>
              <span>{VORGANG_CATEGORY_LABEL[vorgang.category]}</span>
              {project ? (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/projekte/${project.id}`}
                    className="hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    {project.identifier}
                  </Link>
                </>
              ) : null}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
              {vorgang.title}
            </h1>
            {vorgang.dueDate ? (
              <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
                Bearbeitungsfrist: {formatDateShort(vorgang.dueDate)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RiskScorePill score={vorgang.riskScore} size="md" reason="Aggregat aus Frist, Kategorie, Citations" />
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-1 ${VORGANG_STATUS_TONE[vorgang.status]}`}
            >
              {VORGANG_STATUS_LABEL[vorgang.status]}
            </span>
            <Link
              href={`/vorgaenge/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              Bearbeiten
            </Link>
            <AuditHistoryLink entityType="vorgang" entityId={id} />
          </div>
        </div>
      </section>

      <VorgangTabs vorgangId={id} active={activeTab} counts={counts} />

      <section className="pt-8 pb-16">
        {activeTab === "uebersicht" ? (
          <UebersichtTab
            vorgangId={id}
            currentStatus={vorgang.status}
            citations={citations}
            steps={steps}
          />
        ) : null}
        {activeTab === "dokumente" ? (
          <VorgangDocumentsPanel vorgangId={id} documents={documents} />
        ) : null}
        {activeTab === "analyse" ? (
          <VorgangAnalysePanel steps={steps} />
        ) : null}
        {activeTab === "empfehlung" ? (
          <VorgangEmpfehlungPanel steps={steps} />
        ) : null}
        {activeTab === "entwurf" ? (
          <VorgangEntwurfEditor vorgangId={id} draft={offenerEntwurf} />
        ) : null}
        {activeTab === "verknuepfungen" ? (
          <VorgangVerknuepfungen
            vorgangId={id}
            links={links}
            options={linkOptions}
          />
        ) : null}
        {activeTab === "verlauf" ? <VorgangVerlauf entries={auditLog} /> : null}
      </section>

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-8">
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors">
            Gefahrenzone — Vorgang löschen
          </summary>
          <div className="mt-4 max-w-md">
            <p className="text-sm text-[color:var(--color-fg-muted)] mb-3">
              Löscht den Vorgang inkl. aller Dokumente, Analyse-Steps, Entwürfe und
              Verknüpfungen. Nicht rückgängig zu machen.
            </p>
            <form action={deleteVorgang}>
              <input type="hidden" name="id" value={vorgang.id} />
              <button
                type="submit"
                className="text-sm rounded-full border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] px-4 py-2 hover:bg-[color:var(--color-critical)] hover:text-white transition-colors"
              >
                Vorgang unwiderruflich löschen
              </button>
            </form>
          </div>
        </details>
      </section>
    </Container>
  );
}

function UebersichtTab({
  vorgangId,
  currentStatus,
  citations,
  steps,
}: {
  vorgangId: string;
  currentStatus: VorgangStatus;
  citations: { id: string; sourceKind: "bgb" | "hoai" | "vob" | "urteil" | "intern"; sourceRef: string; sourceText: string | null }[];
  steps: { id: string }[];
}) {
  const statusOptions: VorgangStatus[] = [
    "offen",
    "in_bearbeitung",
    "wartet_auf_anwalt",
    "abgeschlossen",
    "archiviert",
  ];
  return (
    <div className="grid gap-10 md:grid-cols-3">
      <div className="md:col-span-2 space-y-8">
        <Block title="Status">
          <form
            action={setVorgangStatus}
            className="flex items-center gap-3 flex-wrap"
          >
            <input type="hidden" name="id" value={vorgangId} />
            <select
              name="status"
              defaultValue={currentStatus}
              className="text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {VORGANG_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors"
            >
              Status setzen
            </button>
          </form>
        </Block>
        <Block title="Quick-Citations">
          {citations.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] italic">
              Noch keine Citations erfasst.
            </p>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {citations.map((c) => (
                <CitationBadge
                  key={c.id}
                  kind={c.sourceKind}
                  ref={c.sourceRef}
                  snippet={c.sourceText}
                />
              ))}
            </div>
          )}
        </Block>
        <Block title="Analyse-Stand">
          {steps.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] italic">
              Noch keine Analyse durchgeführt. Auf Tab „Dokumente" Klassifikation anstoßen.
            </p>
          ) : (
            <p className="text-sm text-[color:var(--color-fg)]">
              {steps.length}{" "}
              {steps.length === 1 ? "Analyse-Schritt erfasst" : "Analyse-Schritte erfasst"} —
              Details auf Tab „Analyse".
            </p>
          )}
        </Block>
      </div>
      <div className="space-y-6">
        <Block title="Quick-Actions">
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href={`/vorgaenge/${vorgangId}?tab=dokumente`}
                className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                → Dokument hochladen / klassifizieren
              </Link>
            </li>
            <li>
              <Link
                href={`/vorgaenge/${vorgangId}?tab=entwurf`}
                className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                → Antwort-Entwurf bearbeiten
              </Link>
            </li>
            <li>
              <Link
                href={`/vorgaenge/${vorgangId}?tab=verknuepfungen`}
                className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                → Mit Projekt / Vertrag / Frist verknüpfen
              </Link>
            </li>
          </ul>
        </Block>
      </div>
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
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
        {title}
      </p>
      {children}
    </section>
  );
}
