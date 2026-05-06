/**
 * Filter-Logik für den Ausschreibungs-Radar.
 *
 * Trennt zwei Filter-Schichten:
 *   - Auto-Filter aus dem Workspace (Disziplinen, ClientFocus) — wirkt
 *     immer, wenn die jeweiligen Workspace-Felder gesetzt sind. Lässt sich
 *     im UI mit `disableAuto: true` abschalten, ohne dass die manuellen
 *     Filter dadurch verschwinden.
 *   - Manuelle Filter aus dem User-Form — Plattform, Bundesland, Wert,
 *     Frist-Fenster, Schwellenwert, Suchtext.
 *
 * Pure Funktionen ohne IO — gleichermaßen client- und server-seitig.
 */

import type { ClientFocus, Discipline } from "@/db/schema/types";
import type { TenderFeedItem } from "./feed-mock";

export type ManualFilter = {
  /** Volltext-Match auf title + vergabestelle + description (case-insensitive). */
  query?: string;
  /** Plattform-IDs (mehrere möglich, OR). Leer = alle. */
  platformIds?: readonly string[];
  /** Bundesland-Codes (BY, NRW, …). Leer = alle. */
  bundeslaender?: readonly string[];
  /** Min/Max-Wert in EUR. null = keine Grenze. */
  wertMinEur?: number | null;
  wertMaxEur?: number | null;
  /** EU-Filter: "all" | "eu_only" | "national_only". */
  scope?: "all" | "eu_only" | "national_only";
  /** Tage-Fenster: nur Treffer mit Angebotsfrist ≥ X Tagen. null = keine Frist-Untergrenze. */
  fristMinTage?: number | null;
};

export type WorkspaceAutoFilter = {
  disciplines: readonly Discipline[];
  clientFocus: ClientFocus | null;
};

export type FilterContext = {
  auto: WorkspaceAutoFilter;
  manual: ManualFilter;
  /** Auto-Filter komplett deaktivieren (User-Override). */
  disableAuto?: boolean;
};

function daysBetween(iso: string, today: Date): number {
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function applyFilters(
  items: readonly TenderFeedItem[],
  ctx: FilterContext,
  hiddenIds: ReadonlySet<string>
): TenderFeedItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = ctx.manual.query?.trim().toLowerCase();

  return items.filter((it) => {
    if (hiddenIds.has(it.id)) return false;

    // Auto: Disziplinen müssen Schnittmenge mit Item haben
    if (!ctx.disableAuto && ctx.auto.disciplines.length > 0) {
      const overlap = it.disciplines.some((d) => ctx.auto.disciplines.includes(d));
      if (!overlap) return false;
    }
    // Auto: ClientFocus muss matchen — "gemischt" ist Joker
    if (!ctx.disableAuto && ctx.auto.clientFocus && ctx.auto.clientFocus !== "gemischt") {
      if (it.clientFocus !== ctx.auto.clientFocus && it.clientFocus !== "gemischt") {
        return false;
      }
    }

    // Manuell: Plattform
    if (ctx.manual.platformIds && ctx.manual.platformIds.length > 0) {
      if (!ctx.manual.platformIds.includes(it.platformId)) return false;
    }
    // Manuell: Bundesland
    if (ctx.manual.bundeslaender && ctx.manual.bundeslaender.length > 0) {
      if (!ctx.manual.bundeslaender.includes(it.bundesland)) return false;
    }
    // Manuell: Wert
    if (ctx.manual.wertMinEur != null && (it.wertEur ?? 0) < ctx.manual.wertMinEur) return false;
    if (ctx.manual.wertMaxEur != null && (it.wertEur ?? Infinity) > ctx.manual.wertMaxEur) return false;
    // Manuell: EU vs national
    if (ctx.manual.scope === "eu_only" && !it.isEu) return false;
    if (ctx.manual.scope === "national_only" && it.isEu) return false;
    // Manuell: Frist-Untergrenze
    if (ctx.manual.fristMinTage != null) {
      const tage = daysBetween(it.angebotsfrist, today);
      if (tage < ctx.manual.fristMinTage) return false;
    }
    // Suchtext
    if (q) {
      const hay = (it.title + " " + it.vergabestelle + " " + it.description).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Tage bis zur Angebotsfrist (negativ = abgelaufen). Hilfsfunktion für UI. */
export function daysToDeadline(iso: string, now: Date = new Date()): number {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return daysBetween(iso, today);
}

/** Sortier-Default: aufsteigend nach Angebotsfrist (knappste oben). */
export function sortByDeadlineAsc(items: TenderFeedItem[]): TenderFeedItem[] {
  return [...items].sort((a, b) => a.angebotsfrist.localeCompare(b.angebotsfrist));
}

/** Bundesland-Liste für Dropdown — nur die in den Mock-Daten vorkommenden. */
export function uniqueBundeslaender(items: readonly TenderFeedItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.bundesland))).sort();
}

/** Plattform-IDs für Dropdown — nur die in den Mock-Daten vorkommenden. */
export function uniquePlatformIds(items: readonly TenderFeedItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.platformId))).sort();
}
