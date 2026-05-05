/**
 * Modul 3.4 — Aggregations-Helper für Modul 4.1 Nachkalkulation.
 *
 * Material-Aufwand pro LV-Position (cents) für ein Projekt. Aggregiert über
 * Bestellungen-Positionen (nicht Rechnungen — wir wollen die effektive
 * Bestellung als Aufwand sehen, nicht den möglicherweise noch nicht
 * fakturierten Teil). Bestellungen im Status `storniert` werden ignoriert.
 *
 * Die DB-Variante `materialAufwandPerLvPosition` ist ein dünner Wrapper um
 * die testbare pure-Function-Variante `aggregateMaterialAufwand`.
 */
// Bewusst kein "server-only" — wird auch vom Cron-CLI (tsx) ohne Next-Bundling
// aufgerufen.
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Bestellung, BestellungPosition } from "@/db/schema";

export type MaterialAggregateRow = Pick<
  BestellungPosition,
  "lvPositionId" | "gesamtpreisCents"
> & {
  /** Aus join: bestellungen.status — wird zur Filterung genutzt. */
  bestellungStatus: Bestellung["status"];
};

/**
 * Pure-Function-Variante: nimmt fertig gejointe Zeilen und summiert.
 */
export function aggregateMaterialAufwand(
  rows: MaterialAggregateRow[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.lvPositionId) continue;
    if (r.bestellungStatus === "storniert") continue;
    out.set(
      r.lvPositionId,
      (out.get(r.lvPositionId) ?? 0) + r.gesamtpreisCents
    );
  }
  return out;
}

export async function materialAufwandPerLvPosition(
  workspaceId: string,
  projektId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      lvPositionId: schema.bestellungenPositionen.lvPositionId,
      gesamtpreisCents: schema.bestellungenPositionen.gesamtpreisCents,
      bestellungStatus: schema.bestellungen.status,
    })
    .from(schema.bestellungenPositionen)
    .innerJoin(
      schema.bestellungen,
      eq(schema.bestellungenPositionen.bestellungId, schema.bestellungen.id)
    )
    .where(
      and(
        eq(schema.bestellungen.workspaceId, workspaceId),
        eq(schema.bestellungen.projektId, projektId),
        ne(schema.bestellungen.status, "storniert")
      )
    );

  return aggregateMaterialAufwand(
    rows.map((r) => ({
      lvPositionId: r.lvPositionId,
      gesamtpreisCents: r.gesamtpreisCents,
      bestellungStatus: r.bestellungStatus,
    }))
  );
}
