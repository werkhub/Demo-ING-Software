import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { withDerivedFields } from "./_internal";
import {
  computeComplianceStatus,
  daysUntilExpiry,
  EXPIRY_WARN_DAYS,
  pickLatestPerKind,
  requiredCertificateKinds,
} from "@/lib/compliance/nu";
import type {
  ProjectContact,
  Subcontractor,
  SubcontractorCertificate,
} from "@/db/schema";

export async function getProjects() {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.workspaceId, workspaceId))
    .orderBy(desc(schema.projects.createdAt));
}

export async function getProjectById(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, id), eq(schema.projects.workspaceId, workspaceId))
    )
    .limit(1);
  return row ?? null;
}

/**
 * Reichert Projekte mit aktuellen, abgeleiteten Stats an:
 * - openIssues: Anzahl offene Fristen
 * - criticalIssues: Anzahl mit urgency = critical (≤ 1 Tag)
 * - nextDeadline: nächste offene Frist (Datum + Task)
 */
export async function getProjectsWithStats() {
  const projects = await getProjects();
  if (projects.length === 0) return [];

  const workspaceId = await getCurrentWorkspaceId();
  const allFristen = await db
    .select()
    .from(schema.fristen)
    .where(
      and(
        eq(schema.fristen.workspaceId, workspaceId),
        eq(schema.fristen.completed, false)
      )
    );

  const byProject = new Map<string, typeof allFristen>();
  for (const f of allFristen) {
    if (!f.projectId) continue;
    if (!byProject.has(f.projectId)) byProject.set(f.projectId, []);
    byProject.get(f.projectId)!.push(f);
  }

  return projects.map((p) => {
    const fristen = byProject.get(p.id) ?? [];
    const enriched = fristen.map(withDerivedFields);
    const sorted = [...enriched].sort((a, b) => a.daysRemaining - b.daysRemaining);
    const next = sorted[0] ?? null;
    const criticalIssues = enriched.filter((f) => f.urgency === "critical").length;
    return {
      ...p,
      openIssues: enriched.length,
      criticalIssues,
      nextDeadline: next
        ? { task: next.task, deadline: next.deadline, daysRemaining: next.daysRemaining }
        : null,
    };
  });
}

/**
 * Reichert Projekte zusätzlich um:
 *   - Nachträge: Σ offene + Σ anerkannte (€) und Anzahl offene
 *   - Sicherheiten: Σ aktive (€), Anzahl, Anzahl mit Rückgabe ≤ 30 Tage
 *   - NU: Anzahl, Anzahl mit Compliance-Lücke, Anzahl mit Bescheinigung ≤ 14 Tage
 *   - Verträge: höchster Risk-Score
 *   - Kontakte: aufgelöst pro Rolle (ag_vertreter, architekt, bauleiter_ag, anwalt, sachverstaendiger)
 *
 * Bewusst getrennt von getProjectsWithStats — die Kachelansicht braucht die
 * teureren Aggregate nicht und soll schlank bleiben.
 */
export async function getProjectsTableRows() {
  const baseRows = await getProjectsWithStats();
  if (baseRows.length === 0) return [];

  const workspaceId = await getCurrentWorkspaceId();
  const projectIds = baseRows.map((p) => p.id);

  const [
    nachtraege,
    securities,
    subcontractors,
    contracts,
    contacts,
  ] = await Promise.all([
    db
      .select()
      .from(schema.nachtraege)
      .where(
        and(
          eq(schema.nachtraege.workspaceId, workspaceId),
          inArray(schema.nachtraege.projectId, projectIds)
        )
      ),
    db
      .select()
      .from(schema.securities)
      .where(
        and(
          eq(schema.securities.workspaceId, workspaceId),
          inArray(schema.securities.projectId, projectIds)
        )
      ),
    db
      .select()
      .from(schema.subcontractors)
      .where(
        and(
          eq(schema.subcontractors.workspaceId, workspaceId),
          inArray(schema.subcontractors.projectId, projectIds)
        )
      ),
    db
      .select()
      .from(schema.contracts)
      .where(
        and(
          eq(schema.contracts.workspaceId, workspaceId),
          inArray(schema.contracts.projectId, projectIds)
        )
      ),
    db
      .select()
      .from(schema.projectContacts)
      .where(
        and(
          eq(schema.projectContacts.workspaceId, workspaceId),
          inArray(schema.projectContacts.projectId, projectIds)
        )
      ),
  ]);

  // Bescheinigungen für Compliance-Auswertung der NUs
  const subcontractorIds = subcontractors.map((s) => s.id);
  const allCerts: SubcontractorCertificate[] =
    subcontractorIds.length > 0
      ? await db
          .select()
          .from(schema.subcontractorCertificates)
          .where(
            and(
              eq(schema.subcontractorCertificates.workspaceId, workspaceId),
              inArray(
                schema.subcontractorCertificates.subcontractorId,
                subcontractorIds
              )
            )
          )
      : [];

  const certsBySub = new Map<string, SubcontractorCertificate[]>();
  for (const c of allCerts) {
    const list = certsBySub.get(c.subcontractorId) ?? [];
    list.push(c);
    certsBySub.set(c.subcontractorId, list);
  }

  type ContactSummary = {
    role: ProjectContact["role"];
    name: string;
    organization: string | null;
    email: string | null;
    phone: string | null;
  };

  const RELEVANT_ROLES: ProjectContact["role"][] = [
    "ag_vertreter",
    "architekt",
    "bauleiter_ag",
    "anwalt",
    "sachverstaendiger",
  ];

  return baseRows.map((p) => {
    const projNachtraege = nachtraege.filter((n) => n.projectId === p.id);
    const nachtraegeOffen = projNachtraege.filter(
      (n) => n.status !== "anerkannt" && n.status !== "abgelehnt" && n.status !== "geschlossen"
    );
    const nachtraegeOffenSum = nachtraegeOffen.reduce((sum, n) => sum + (n.value ?? 0), 0);
    const nachtraegeAnerkanntSum = projNachtraege
      .filter((n) => n.status === "anerkannt")
      .reduce((sum, n) => sum + (n.value ?? 0), 0);

    const projSecurities = securities.filter((s) => s.projectId === p.id);
    const securitiesActive = projSecurities.filter((s) => s.status === "aktiv");
    const securitiesActiveSum = securitiesActive.reduce(
      (sum, s) => sum + (s.amount ?? 0),
      0
    );
    const today = new Date();
    const securitiesExpiring30d = securitiesActive.filter((s) => {
      if (!s.validUntil) return false;
      const days = daysUntilExpiry(s.validUntil, today);
      return !Number.isNaN(days) && days >= 0 && days <= 30;
    }).length;

    const projSubs: Subcontractor[] = subcontractors.filter(
      (s) => s.projectId === p.id
    );
    let subsBlocked = 0;
    let subsCriticalCompliance = 0;
    let subsCertExpiring = 0;
    for (const sub of projSubs) {
      if (sub.paymentReleaseBlocked) subsBlocked += 1;
      const certs = certsBySub.get(sub.id) ?? [];
      const status = computeComplianceStatus(sub, certs, today);
      if (status.level === "critical") subsCriticalCompliance += 1;
      // Pro NU: hat eine Pflicht-Bescheinigung, die ≤ EXPIRY_WARN_DAYS abläuft?
      const required = requiredCertificateKinds(sub);
      const latest = pickLatestPerKind(certs);
      for (const kind of required) {
        const c = latest.get(kind);
        if (!c) continue;
        const days = daysUntilExpiry(c.validUntil, today);
        if (!Number.isNaN(days) && days >= 0 && days <= EXPIRY_WARN_DAYS) {
          subsCertExpiring += 1;
          break;
        }
      }
    }

    const projContracts = contracts.filter((c) => c.projectId === p.id);
    const riskScoreMax = projContracts.reduce<number | null>((acc, c) => {
      if (c.riskScore === null || c.riskScore === undefined) return acc;
      if (acc === null) return c.riskScore;
      return c.riskScore > acc ? c.riskScore : acc;
    }, null);

    const projContacts = contacts.filter((c) => c.projectId === p.id);
    const contactsByRole: Partial<Record<ProjectContact["role"], ContactSummary>> = {};
    for (const role of RELEVANT_ROLES) {
      const found = projContacts.find((c) => c.role === role);
      if (found) {
        contactsByRole[role] = {
          role,
          name: found.name,
          organization: found.organization,
          email: found.email,
          phone: found.phone,
        };
      }
    }
    const totalContacts = projContacts.length;

    return {
      ...p,
      nachtraegeOffenCount: nachtraegeOffen.length,
      nachtraegeOffenSum,
      nachtraegeAnerkanntSum,
      securitiesActiveCount: securitiesActive.length,
      securitiesActiveSum,
      securitiesExpiring30d,
      subcontractorsCount: projSubs.length,
      subcontractorsBlocked: subsBlocked,
      subcontractorsCriticalCompliance: subsCriticalCompliance,
      subcontractorsCertExpiring: subsCertExpiring,
      riskScoreMax,
      contactsByRole,
      totalContacts,
    };
  });
}
