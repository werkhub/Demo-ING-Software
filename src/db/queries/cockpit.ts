/**
 * Cross-Domain-Aggregationen fürs Dashboard, die explizit aus mehreren Domänen
 * lesen. Wenn eine Funktion mehr als eine Domain anfasst, gehört sie hier rein —
 * die Domain-Files bleiben single-table-fokussiert.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getFristen } from "./fristen";
import { withDerivedFields } from "./_internal";

/* ============== DASHBOARD-LEGACY-STATS ============== */

/**
 * Wird auf der alten Dashboard-Sicht weiter genutzt. Aggregiert offene Anfragen,
 * aktive Nachträge, kritische Fristen und Projektzahlen.
 */
export async function getDashboardStats() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, fristen, queries, nachtraege] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId)),
    getFristen(),
    db
      .select()
      .from(schema.queries)
      .where(eq(schema.queries.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.nachtraege)
      .where(eq(schema.nachtraege.workspaceId, workspaceId)),
  ]);

  const criticalFristen = fristen.filter((f) => f.urgency === "critical").length;

  const offeneNachtraege = nachtraege.filter(
    (n) => n.status !== "geschlossen" && n.status !== "abgelehnt"
  );
  const nachtragVolume = offeneNachtraege.reduce((s, n) => s + n.value, 0);
  const activeNachtraege = offeneNachtraege.length;

  const activeProjects = projects.filter((p) => p.status !== "Abgeschlossen").length;

  return {
    openQueries: queries.length,
    activeNachtraege,
    nachtragVolume,
    criticalFristen,
    totalFristen: fristen.length,
    totalProjects: projects.length,
    activeProjects,
  };
}

/* ============== COCKPIT (UC2) ============== */

export async function getCockpitStats() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, fristen, vorgaenge] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId)),
    getFristen(),
    db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, workspaceId)),
  ]);

  const aktiveProjekte = projects.filter((p) => p.status !== "Abgeschlossen").length;
  const offeneVorgaenge = vorgaenge.filter(
    (v) => v.status !== "abgeschlossen" && v.status !== "archiviert"
  ).length;
  const fristenKritisch = fristen.filter((f) => f.daysRemaining <= 14).length;
  const highRiskVorgaenge = vorgaenge.filter(
    (v) =>
      v.riskScore >= 60 &&
      v.status !== "abgeschlossen" &&
      v.status !== "archiviert"
  ).length;

  return {
    aktiveProjekte,
    offeneVorgaenge,
    fristenKritisch,
    highRiskVorgaenge,
  };
}

/**
 * Risk-Heatmap pro Projekt — aggregiert aus Fristen, Vorgängen und
 * Subcontractor-Pass-Through-Status.
 */
export async function getProjektRiskMatrix() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, fristen, vorgaenge, subs] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.fristen)
      .where(
        and(
          eq(schema.fristen.workspaceId, workspaceId),
          eq(schema.fristen.completed, false)
        )
      ),
    db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.workspaceId, workspaceId)),
  ]);

  return projects.map((p) => {
    const projFristen = fristen
      .filter((f) => f.projectId === p.id)
      .map(withDerivedFields);
    const projVorgaenge = vorgaenge.filter(
      (v) =>
        v.projectId === p.id &&
        v.status !== "abgeschlossen" &&
        v.status !== "archiviert"
    );
    const projSubs = subs.filter((s) => s.projectId === p.id);

    const fristCritical = projFristen.filter((f) => f.urgency === "critical").length;
    const fristWarn = projFristen.filter((f) => f.urgency === "warning").length;
    const fristScore = Math.min(100, fristCritical * 30 + fristWarn * 10);
    const vorgangScore = Math.min(100, projVorgaenge.length * 15);

    const luckenSubs = projSubs.filter(
      (s) =>
        s.passThroughStatus === "klausel_fehlend" ||
        s.passThroughStatus === "konfliktig"
    ).length;
    const vertragsluecken =
      projSubs.length === 0
        ? 0
        : Math.min(100, Math.round((luckenSubs / projSubs.length) * 100));

    const maengel = projVorgaenge.filter((v) => v.category === "maengelruege").length;
    const maengelScore = Math.min(100, maengel * 25);

    const overall = Math.round(
      0.35 * fristScore +
        0.25 * vorgangScore +
        0.2 * vertragsluecken +
        0.2 * maengelScore
    );

    return {
      id: p.id,
      identifier: p.identifier,
      name: p.name,
      status: p.status,
      fristScore,
      vorgangScore,
      vertragsluecken,
      maengelScore,
      overall,
    };
  });
}

/**
 * Letzte Aktivitäten Workspace-weit. Zieht aus 5 Tabellen, sortiert nach Zeit.
 */
export async function getActivityFeed(limit = 50) {
  const workspaceId = await getCurrentWorkspaceId();
  const [bautagebuch, queries, vorgaenge, rechnungen, audit] = await Promise.all([
    db
      .select()
      .from(schema.bautagebuchEntries)
      .where(eq(schema.bautagebuchEntries.workspaceId, workspaceId))
      .orderBy(desc(schema.bautagebuchEntries.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.queries)
      .where(eq(schema.queries.workspaceId, workspaceId))
      .orderBy(desc(schema.queries.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, workspaceId))
      .orderBy(desc(schema.vorgaenge.createdAt))
      .limit(limit),
    db
      .select()
      .from(schema.rechnungen)
      .where(eq(schema.rechnungen.workspaceId, workspaceId))
      .orderBy(desc(schema.rechnungen.uploadedAt))
      .limit(limit),
    db
      .select({
        id: schema.vorgangAuditLog.id,
        vorgangId: schema.vorgangAuditLog.vorgangId,
        action: schema.vorgangAuditLog.action,
        createdAt: schema.vorgangAuditLog.createdAt,
      })
      .from(schema.vorgangAuditLog)
      .innerJoin(
        schema.vorgaenge,
        eq(schema.vorgangAuditLog.vorgangId, schema.vorgaenge.id)
      )
      .where(eq(schema.vorgaenge.workspaceId, workspaceId))
      .orderBy(desc(schema.vorgangAuditLog.createdAt))
      .limit(limit),
  ]);

  type Activity = {
    id: string;
    when: Date;
    kind: "bautagebuch" | "anfrage" | "vorgang" | "rechnung" | "audit";
    title: string;
    detail: string;
    href: string;
  };

  const items: Activity[] = [];
  for (const e of bautagebuch) {
    items.push({
      id: `bt_${e.id}`,
      when: e.createdAt,
      kind: "bautagebuch",
      title: "Bautagebuch-Eintrag",
      detail: e.text.slice(0, 120),
      href: `/bautagebuch`,
    });
  }
  for (const q of queries) {
    items.push({
      id: `q_${q.id}`,
      when: q.createdAt,
      kind: "anfrage",
      title: "Anfrage Recht-Assistent",
      detail: q.question.slice(0, 120),
      href: `/recht-assistent`,
    });
  }
  for (const v of vorgaenge) {
    items.push({
      id: `v_${v.id}`,
      when: v.createdAt,
      kind: "vorgang",
      title: `Vorgang angelegt · ${v.category}`,
      detail: v.title,
      href: `/vorgaenge/${v.id}`,
    });
  }
  for (const r of rechnungen) {
    items.push({
      id: `r_${r.id}`,
      when: r.uploadedAt,
      kind: "rechnung",
      title: `Rechnung · ${r.supplierName}`,
      detail: `${r.status} · Anomalien: ${r.anomalyCount}`,
      href: `/rechnungen/${r.id}`,
    });
  }
  for (const a of audit) {
    items.push({
      id: `a_${a.id}`,
      when: a.createdAt,
      kind: "audit",
      title: `Vorgang · ${a.action}`,
      detail: a.action,
      href: `/vorgaenge/${a.vorgangId}`,
    });
  }
  items.sort((a, b) => b.when.getTime() - a.when.getTime());
  return items.slice(0, limit);
}
