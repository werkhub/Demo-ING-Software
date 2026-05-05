/**
 * Queries für die Sub-Entitäten am Projekt: Nachträge, Kontakte, Beweissicherungs-
 * Checklisten, NU-Bescheinigungen. Bewusst getrennt von projekte.ts, um die
 * Hauptdomain übersichtlich zu halten.
 */
import "server-only";
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  computeComplianceStatus,
  type ComplianceStatus,
} from "@/lib/compliance/nu";
import type { Subcontractor, SubcontractorCertificate } from "@/db/schema";

/* ============== NACHTRÄGE ============== */

export async function getNachtraegeByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.nachtraege)
    .where(
      and(
        eq(schema.nachtraege.workspaceId, workspaceId),
        eq(schema.nachtraege.projectId, projectId)
      )
    )
    .orderBy(desc(schema.nachtraege.createdAt));
}

export async function getAllNachtraege() {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.nachtraege)
    .where(eq(schema.nachtraege.workspaceId, workspaceId))
    .orderBy(desc(schema.nachtraege.createdAt));
}

/* ============== KONTAKTE ============== */

export async function getContactsByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.projectContacts)
    .where(
      and(
        eq(schema.projectContacts.workspaceId, workspaceId),
        eq(schema.projectContacts.projectId, projectId)
      )
    )
    .orderBy(asc(schema.projectContacts.role), asc(schema.projectContacts.name));
}

/* ============== BEWEISSICHERUNG ============== */

export async function getBeweisChecklist(projectId: string, anlass: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.beweisChecklists)
    .where(
      and(
        eq(schema.beweisChecklists.workspaceId, workspaceId),
        eq(schema.beweisChecklists.projectId, projectId),
        eq(schema.beweisChecklists.anlass, anlass)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getBeweisChecklistsByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.beweisChecklists)
    .where(
      and(
        eq(schema.beweisChecklists.workspaceId, workspaceId),
        eq(schema.beweisChecklists.projectId, projectId)
      )
    )
    .orderBy(desc(schema.beweisChecklists.updatedAt));
}

/* ============== NU-COMPLIANCE ============== */

export async function getSubcontractor(
  id: string
): Promise<Subcontractor | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, id),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getCertificatesBySubcontractor(
  subcontractorId: string
): Promise<SubcontractorCertificate[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.workspaceId, workspaceId),
        eq(schema.subcontractorCertificates.subcontractorId, subcontractorId)
      )
    )
    .orderBy(
      asc(schema.subcontractorCertificates.kind),
      desc(schema.subcontractorCertificates.validUntil)
    );
}

export async function getCertificate(
  id: string
): Promise<SubcontractorCertificate | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.id, id),
        eq(schema.subcontractorCertificates.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Bescheinigungen, die in den nächsten N Tagen ablaufen — für Reminder/Cron
 * (kommt in eigenem Bauschritt, hier schon vorbereitet).
 */
export async function getExpiringCertificates(
  withinDays: number
): Promise<SubcontractorCertificate[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.workspaceId, workspaceId),
        lte(schema.subcontractorCertificates.validUntil, cutoffIso)
      )
    )
    .orderBy(asc(schema.subcontractorCertificates.validUntil));
}

/* ============== SICHERHEITEN ============== */

export async function getSecuritiesByProject(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.workspaceId, workspaceId),
        eq(schema.securities.projectId, projectId)
      )
    )
    .orderBy(desc(schema.securities.createdAt));
}

export async function getSecurity(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.id, id),
        eq(schema.securities.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Sicherheiten, deren explizites validUntil in den nächsten N Tagen liegt —
 * für Reminder/Cron. Achtung: berücksichtigt nur explizit gesetzte Daten;
 * Sicherheiten mit releaseTrigger != manuell und ohne expliziten Wert müssen
 * separat über die Projekt-Lebenszyklus-Daten gefunden werden.
 */
export async function getExpiringSecurities(withinDays: number) {
  const workspaceId = await getCurrentWorkspaceId();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return db
    .select()
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.workspaceId, workspaceId),
        lte(schema.securities.validUntil, cutoffIso)
      )
    )
    .orderBy(asc(schema.securities.validUntil));
}

/**
 * Compliance-Status für viele NUs in einem Rutsch — verwendet von der
 * NU-Listen-Seite. Liest alle Bescheinigungen der NUs einmal und teilt sie
 * dann pro NU auf, statt N+1-Queries.
 */
export async function getComplianceStatusForSubcontractors(
  nus: Subcontractor[]
): Promise<Map<string, ComplianceStatus>> {
  const workspaceId = await getCurrentWorkspaceId();
  const result = new Map<string, ComplianceStatus>();
  if (nus.length === 0) return result;

  const ids = nus.map((n) => n.id);
  const allCerts = await db
    .select()
    .from(schema.subcontractorCertificates)
    .where(
      and(
        eq(schema.subcontractorCertificates.workspaceId, workspaceId),
        inArray(schema.subcontractorCertificates.subcontractorId, ids)
      )
    );

  const grouped = new Map<string, SubcontractorCertificate[]>();
  for (const c of allCerts) {
    const list = grouped.get(c.subcontractorId) ?? [];
    list.push(c);
    grouped.set(c.subcontractorId, list);
  }

  for (const nu of nus) {
    const certs = grouped.get(nu.id) ?? [];
    result.set(nu.id, computeComplianceStatus(nu, certs));
  }
  return result;
}
