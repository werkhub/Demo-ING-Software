import "server-only";
import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { ACK_DEADLINE_DAYS, uiState } from "@/lib/hinschg";
import type { HinschgMeldung, HinschgMessage } from "@/db/schema";

/* ============== OFFICE-QUERIES (Auth-pflichtig) ============== */

export async function getMeldungen(): Promise<HinschgMeldung[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.hinschgMeldungen)
    .where(eq(schema.hinschgMeldungen.workspaceId, workspaceId))
    .orderBy(desc(schema.hinschgMeldungen.submittedAt));
}

export async function getMeldung(id: string): Promise<HinschgMeldung | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.hinschgMeldungen)
    .where(
      and(
        eq(schema.hinschgMeldungen.id, id),
        eq(schema.hinschgMeldungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getMessagesByMeldung(
  meldungId: string
): Promise<HinschgMessage[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.hinschgMessages)
    .where(
      and(
        eq(schema.hinschgMessages.workspaceId, workspaceId),
        eq(schema.hinschgMessages.meldungId, meldungId)
      )
    )
    .orderBy(asc(schema.hinschgMessages.createdAt));
}

export async function getMeldungenStats(): Promise<{
  total: number;
  neu: number;
  inPruefung: number;
  abgeschlossen: number;
  ackUeberfaellig: number;
  antwortUeberfaellig: number;
}> {
  const all = await getMeldungen();
  return {
    total: all.length,
    neu: all.filter((m) => m.status === "eingegangen").length,
    inPruefung: all.filter(
      (m) => m.status === "in_pruefung" || m.status === "massnahme_ergriffen"
    ).length,
    abgeschlossen: all.filter(
      (m) => m.status === "abgeschlossen" || m.status === "unbegruendet"
    ).length,
    ackUeberfaellig: all.filter((m) => uiState(m) === "ack_ueberfaellig")
      .length,
    antwortUeberfaellig: all.filter((m) => uiState(m) === "antwort_ueberfaellig")
      .length,
  };
}

/**
 * Eingangsbestätigung überfällig — für Reminder/Cron.
 * Alle Meldungen, deren submittedAt älter als die Schwelle ist und
 * acknowledgedAt noch leer ist.
 */
export async function getAckOverdue(): Promise<HinschgMeldung[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACK_DEADLINE_DAYS);
  return db
    .select()
    .from(schema.hinschgMeldungen)
    .where(
      and(
        eq(schema.hinschgMeldungen.workspaceId, workspaceId),
        lte(schema.hinschgMeldungen.submittedAt, cutoff),
        sql`${schema.hinschgMeldungen.acknowledgedAt} IS NULL`,
        eq(schema.hinschgMeldungen.status, "eingegangen")
      )
    );
}

/* ============== PUBLIC-QUERIES (kein Workspace-Kontext) ============== */

/**
 * Bewusst KEIN getCurrentWorkspaceId — wird vom Public-Status-Abruf benutzt
 * und sucht workspace-übergreifend per Token. Liefert null statt zu werfen,
 * damit Token-Eingabe-Form sauber „nicht gefunden" anzeigen kann.
 */
export async function getMeldungByAccessToken(
  token: string
): Promise<HinschgMeldung | null> {
  if (!token || token.length < 10) return null;
  const [row] = await db
    .select()
    .from(schema.hinschgMeldungen)
    .where(eq(schema.hinschgMeldungen.accessToken, token))
    .limit(1);
  return row ?? null;
}

/**
 * Messages für einen Token — gleich workspace-übergreifend, weil über
 * Token-FK an die Meldung gehangen.
 */
export async function getMessagesByAccessToken(
  token: string
): Promise<HinschgMessage[]> {
  const meldung = await getMeldungByAccessToken(token);
  if (!meldung) return [];
  return db
    .select()
    .from(schema.hinschgMessages)
    .where(eq(schema.hinschgMessages.meldungId, meldung.id))
    .orderBy(asc(schema.hinschgMessages.createdAt));
}

/**
 * Ist HinSchG für diesen Workspace aktiv? Public-Action benutzt das, um
 * Public-Form abzulehnen wenn ausgeschaltet.
 */
export async function isHinschgEnabledForWorkspace(
  workspaceId: string
): Promise<boolean> {
  const [ws] = await db
    .select({ enabled: schema.workspaces.hinschgEnabled })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);
  return ws?.enabled === true;
}
