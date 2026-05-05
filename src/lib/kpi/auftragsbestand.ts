/**
 * KPI: Auftragsbestand — Summe der Auftragsvolumina aller laufenden Projekte.
 *
 * „Laufend" = Projekte, die noch operative Leistung tragen
 * (Bauphase + Abnahme). Gewährleistung zählt nicht, weil Leistung
 * erbracht und i.d.R. abgerechnet ist; Geplant zählt nicht, weil
 * der Auftrag noch nicht erteilt wurde. Abgeschlossen offensichtlich nicht.
 */
import { eq } from "drizzle-orm";
import type { Project } from "@/db/schema";
import { db, schema } from "@/db";
import { kpiKey, withCache } from "./cache";

const ACTIVE_STATUS: Project["status"][] = ["Bauphase", "Abnahme"];

export type AuftragsbestandResult = {
  /** EUR, gerundet auf ganze Euro. Null wenn keine Projekte erfasst. */
  value: number | null;
  /** Anzahl Projekte, die in den Wert eingehen. */
  activeProjects: number;
};

export function computeAuftragsbestand(
  projects: ReadonlyArray<Pick<Project, "value" | "status">>
): AuftragsbestandResult {
  if (projects.length === 0) {
    return { value: null, activeProjects: 0 };
  }
  const active = projects.filter((p) => ACTIVE_STATUS.includes(p.status));
  if (active.length === 0) {
    return { value: 0, activeProjects: 0 };
  }
  const sum = active.reduce((acc, p) => acc + (p.value || 0), 0);
  return { value: Math.round(sum), activeProjects: active.length };
}

export async function getAuftragsbestand(
  workspaceId: string
): Promise<AuftragsbestandResult> {
  return withCache(kpiKey(workspaceId, "auftragsbestand"), async () => {
    const rows = await db
      .select({ value: schema.projects.value, status: schema.projects.status })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId));
    return computeAuftragsbestand(rows);
  });
}
