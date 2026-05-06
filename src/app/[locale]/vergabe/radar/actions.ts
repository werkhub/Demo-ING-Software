"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import {
  TENDER_FEED_ITEMS,
  TENDER_FEED_ITEM_IDS,
} from "@/lib/vergabe/feed-mock";

function assertKnownItemId(id: string): void {
  if (!TENDER_FEED_ITEM_IDS.includes(id)) {
    throw new Error(`Unbekannte Treffer-ID: ${id}`);
  }
}

/** Watch ein-/aus-schalten. Idempotent. */
export async function toggleWatch(formData: FormData): Promise<void> {
  const tenderItemId = String(formData.get("tenderItemId") ?? "").trim();
  if (!tenderItemId) throw new Error("tenderItemId fehlt.");
  assertKnownItemId(tenderItemId);

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({ id: schema.tenderFeedWatch.id })
    .from(schema.tenderFeedWatch)
    .where(
      and(
        eq(schema.tenderFeedWatch.workspaceId, workspaceId),
        eq(schema.tenderFeedWatch.tenderItemId, tenderItemId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(schema.tenderFeedWatch)
      .where(eq(schema.tenderFeedWatch.id, existing.id));
  } else {
    await db.insert(schema.tenderFeedWatch).values({
      id: genId("tw"),
      workspaceId,
      tenderItemId,
    });
  }
  revalidatePath("/vergabe/radar");
}

/** Hide ein-/aus-schalten. Idempotent. */
export async function toggleHidden(formData: FormData): Promise<void> {
  const tenderItemId = String(formData.get("tenderItemId") ?? "").trim();
  if (!tenderItemId) throw new Error("tenderItemId fehlt.");
  assertKnownItemId(tenderItemId);

  const workspaceId = await getCurrentWorkspaceId();
  const [existing] = await db
    .select({ id: schema.tenderFeedHidden.id })
    .from(schema.tenderFeedHidden)
    .where(
      and(
        eq(schema.tenderFeedHidden.workspaceId, workspaceId),
        eq(schema.tenderFeedHidden.tenderItemId, tenderItemId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .delete(schema.tenderFeedHidden)
      .where(eq(schema.tenderFeedHidden.id, existing.id));
  } else {
    await db.insert(schema.tenderFeedHidden).values({
      id: genId("th"),
      workspaceId,
      tenderItemId,
    });
  }
  revalidatePath("/vergabe/radar");
}

/**
 * Übernimmt einen Radar-Treffer in die Ausschreibungs-Analyse.
 * Speichert URL + Volltext-Snippet in einer kurzlebigen Server-Cookie und
 * leitet weiter — der Analyzer liest die Cookie beim Mount und befüllt sich
 * vor. (Cookie statt URL-Parameter, weil der Excerpt mehrere KB lang ist.)
 *
 * In dieser Demo-Phase nutzen wir die einfachere Variante: URL-Parameter
 * mit dem `id` des Treffers — der Analyzer hydriert sich aus dem statischen
 * Mock-Datensatz. Sobald echte Items aus der DB kommen, wandert das auf einen
 * Server-Lookup im Analyzer-Page.
 */
export async function openInAnalyzer(formData: FormData): Promise<void> {
  const tenderItemId = String(formData.get("tenderItemId") ?? "").trim();
  if (!tenderItemId) throw new Error("tenderItemId fehlt.");
  assertKnownItemId(tenderItemId);
  // Workspace-Check (auch wenn wir nicht persistieren — verhindert Aufruf
  // ohne Session).
  await getCurrentWorkspaceId();
  redirect(`/vergabe?from=radar&itemId=${encodeURIComponent(tenderItemId)}`);
}

/** Demo-Refresh: revalidiert die Seite. Server gibt einen neuen Timestamp aus. */
export async function refreshFeed(): Promise<void> {
  await getCurrentWorkspaceId();
  revalidatePath("/vergabe/radar");
}

/** Sicherstellen, dass alle Mock-Items typgleich sind (Type-Check at module load). */
const _typeCheck: ReadonlyArray<typeof TENDER_FEED_ITEMS[number]> =
  TENDER_FEED_ITEMS;
void _typeCheck;
