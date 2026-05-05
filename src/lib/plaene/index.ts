/**
 * Helpers für Pläne + Freigabe-Workflow.
 *
 * Bewusst KEIN "server-only" — Funktionen sind reine Logik (keine DB-Imports).
 * `aggregateFreigabeStatus()` ist die zentrale Zustands-Reduktion: liefert
 * den nächsten Plan-Status auf Basis der vorhandenen Freigaben.
 */
import type { FreigabeStatus, PlanStatus } from "@/db/schema";

export const PLAN_TYP_LABEL: Record<string, string> = {
  architektur: "Architektur",
  statik: "Statik",
  tga: "TGA",
  elektro: "Elektro",
  sanitaer: "Sanitär",
  detail: "Detail",
  sonstiges: "Sonstiges",
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  entwurf: "Entwurf",
  zur_freigabe: "Zur Freigabe",
  freigegeben: "Freigegeben",
  aufgehoben: "Aufgehoben",
};

export const FREIGABE_STATUS_LABEL: Record<FreigabeStatus, string> = {
  offen: "Offen",
  zugestimmt: "Zugestimmt",
  abgelehnt: "Abgelehnt",
  zurueckgestellt: "Zurückgestellt",
};

export type FreigabeAggregate = {
  total: number;
  zugestimmt: number;
  abgelehnt: number;
  offen: number;
  zurueckgestellt: number;
  /** Wenn alle Freigaben "zugestimmt" → "freigegeben". Sonst null = Plan-Status nicht ändern. */
  nextPlanStatus: PlanStatus | null;
};

/**
 * Aggregiert Freigabe-Stati zu einem Plan-Status-Vorschlag.
 *
 *   - Mindestens eine Freigabe vorhanden UND alle "zugestimmt" → freigegeben.
 *   - Mindestens eine "abgelehnt"                               → entwurf
 *     (Plan muss überarbeitet werden; nutzt UI-seitig der Reviewer als Signal).
 *   - Sonst: kein Vorschlag (null) — Plan-Status bleibt wie er ist.
 */
export function aggregateFreigabeStatus(
  statuses: ReadonlyArray<FreigabeStatus>
): FreigabeAggregate {
  const agg: FreigabeAggregate = {
    total: statuses.length,
    zugestimmt: 0,
    abgelehnt: 0,
    offen: 0,
    zurueckgestellt: 0,
    nextPlanStatus: null,
  };
  for (const s of statuses) {
    agg[s]++;
  }
  if (agg.total > 0 && agg.zugestimmt === agg.total) {
    agg.nextPlanStatus = "freigegeben";
  } else if (agg.abgelehnt > 0) {
    agg.nextPlanStatus = "entwurf";
  }
  return agg;
}

const SAFE_BYTES = /^[A-Za-z0-9._-]+$/;

/**
 * Sanitisiert einen User-supplied Filename für Disk-Storage.
 * - Pfad-Separatoren weg, Punkt-Prefixe weg, max 200 Zeichen.
 * - Leerstrings/Garbage → "datei".
 */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 200)
    .trim();
  if (!cleaned) return "datei";
  return SAFE_BYTES.test(cleaned) ? cleaned : cleaned.replace(/[^A-Za-z0-9._-]/g, "_");
}
