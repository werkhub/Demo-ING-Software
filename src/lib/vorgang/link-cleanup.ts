/**
 * Cleanup-Hooks für die generische `vorgang_links`-Tabelle.
 *
 * Die Tabelle hält polymorphe Verweise `(targetKind, targetId)` ohne FK-Constraint
 * — schöpft Flexibilität, riskiert aber Orphan-Links, wenn das Ziel verschwindet.
 * Diese Modul-Funktionen werden von den jeweiligen Delete-Server-Actions
 * aufgerufen, um die DB konsistent zu halten.
 */
import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { VorgangLinkKind } from "@/db/schema";

/**
 * Löscht alle vorgang_links, die auf einen bestimmten Datensatz zeigen.
 * Aufrufer: Delete-Actions für Bautagebuch, Frist, Vertrag, Rechnung, Vorgang.
 */
export async function cleanupLinksToTarget(opts: {
  targetKind: VorgangLinkKind;
  targetId: string;
}): Promise<number> {
  const result = await db
    .delete(schema.vorgangLinks)
    .where(
      and(
        eq(schema.vorgangLinks.targetKind, opts.targetKind),
        eq(schema.vorgangLinks.targetId, opts.targetId)
      )
    )
    .returning({ id: schema.vorgangLinks.id });
  return result.length;
}

/**
 * Löscht alle vorgang_links zu mehreren Targets gleichzeitig (Bulk-Cleanup).
 * Praktisch beim Projekt-Delete, das Cascade-mäßig viele abhängige Entitäten
 * mitnimmt.
 */
export async function cleanupLinksToTargets(opts: {
  targetKind: VorgangLinkKind;
  targetIds: string[];
}): Promise<number> {
  if (opts.targetIds.length === 0) return 0;
  const result = await db
    .delete(schema.vorgangLinks)
    .where(
      and(
        eq(schema.vorgangLinks.targetKind, opts.targetKind),
        inArray(schema.vorgangLinks.targetId, opts.targetIds)
      )
    )
    .returning({ id: schema.vorgangLinks.id });
  return result.length;
}

/**
 * Vorgang löschen — erfordert Cleanup beider Richtungen:
 *   1. alle Links AUS diesem Vorgang (FK cascade erledigt das via vorgang_links.vorgangId).
 *   2. alle Links AUF diesen Vorgang (targetKind=vorgang, targetId=vorgangId) — manuell.
 */
export async function cleanupLinksForDeletedVorgang(vorgangId: string): Promise<void> {
  await cleanupLinksToTarget({ targetKind: "vorgang", targetId: vorgangId });
}

/**
 * Garbage-Collection-Lauf: findet Links, deren Ziel nicht mehr existiert,
 * und löscht sie. Idempotent, kann periodisch (z. B. via Cron) laufen oder
 * manuell aus einem Admin-Tool gestartet werden.
 *
 * Rückgabe: Anzahl gelöschter Links pro Kind.
 */
export async function gcOrphanedVorgangLinks(): Promise<
  Record<VorgangLinkKind, number>
> {
  const allLinks = await db
    .select({
      id: schema.vorgangLinks.id,
      targetKind: schema.vorgangLinks.targetKind,
      targetId: schema.vorgangLinks.targetId,
    })
    .from(schema.vorgangLinks);

  const counts: Record<VorgangLinkKind, number> = {
    project: 0,
    contract: 0,
    bautagebuch: 0,
    frist: 0,
    vorgang: 0,
    rechnung: 0,
  };

  // Gruppiere nach Kind, dann teste je Kind in einem einzigen IN-Query
  const byKind = new Map<VorgangLinkKind, { id: string; targetId: string }[]>();
  for (const l of allLinks) {
    if (!byKind.has(l.targetKind)) byKind.set(l.targetKind, []);
    byKind.get(l.targetKind)!.push({ id: l.id, targetId: l.targetId });
  }

  async function checkAndDelete(
    kind: VorgangLinkKind,
    candidates: { id: string; targetId: string }[],
    table:
      | typeof schema.projects
      | typeof schema.contracts
      | typeof schema.bautagebuchEntries
      | typeof schema.fristen
      | typeof schema.vorgaenge
      | typeof schema.rechnungen
  ) {
    if (candidates.length === 0) return;
    const ids = candidates.map((c) => c.targetId);
    const existing = await db
      .select({ id: table.id })
      .from(table)
      .where(inArray(table.id, ids));
    const existingIds = new Set(existing.map((r) => r.id));
    const orphans = candidates.filter((c) => !existingIds.has(c.targetId));
    if (orphans.length === 0) return;
    await db
      .delete(schema.vorgangLinks)
      .where(
        inArray(
          schema.vorgangLinks.id,
          orphans.map((o) => o.id)
        )
      );
    counts[kind] = orphans.length;
  }

  await Promise.all([
    checkAndDelete("project", byKind.get("project") ?? [], schema.projects),
    checkAndDelete("contract", byKind.get("contract") ?? [], schema.contracts),
    checkAndDelete(
      "bautagebuch",
      byKind.get("bautagebuch") ?? [],
      schema.bautagebuchEntries
    ),
    checkAndDelete("frist", byKind.get("frist") ?? [], schema.fristen),
    checkAndDelete("vorgang", byKind.get("vorgang") ?? [], schema.vorgaenge),
    checkAndDelete("rechnung", byKind.get("rechnung") ?? [], schema.rechnungen),
  ]);

  return counts;
}
